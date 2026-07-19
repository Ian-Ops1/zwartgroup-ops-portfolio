const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;
const HOSPITABLE_TOKEN = process.env.HOSPITABLE_TOKEN;

async function supabaseUpsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(data)
  });
  return res.ok;
}

async function supabaseDelete(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`
    }
  });
  return res.ok;
}

async function getFullReservation(resvId) {
  if (!HOSPITABLE_TOKEN) return null;
  try {
    const res = await fetch(
      `https://public.api.hospitable.com/v2/reservations/${resvId}?include=properties`,
      {
        headers: {
          "Authorization": `Bearer ${HOSPITABLE_TOKEN}`,
          "Accept": "application/json"
        }
      }
    );
    if (!res.ok) { console.log(`API fetch failed: ${res.status}`); return null; }
    const json = await res.json();
    return json.data || null;
  } catch(e) {
    console.log("API fetch error:", e.message);
    return null;
  }
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  return String(dateStr).slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body;
    console.log("Hospitable webhook:", JSON.stringify(body).slice(0, 600));

    const action = body.action || body.event || "";
    const resv = body.data || body;
    const resvId = resv.id || resv.uuid;
    if (!resvId) return res.status(200).json({ message: "No reservation ID" });

    const statusRaw = resv.status || resv.reservation_status?.current?.category || "confirmed";
    if (action.includes("cancel") || statusRaw === "cancelled") {
      await supabaseDelete("hospitable_bookings", resvId);
      return res.status(200).json({ message: "Cancelled and removed" });
    }

    console.log(`Fetching full reservation: ${resvId}`);
    const fullResv = await getFullReservation(resvId);
    const sourceResv = fullResv || resv;

    const property = Array.isArray(sourceResv.properties) ? sourceResv.properties[0] : null;
    const propertyId = property?.id || null;
    const propertyName = property?.name || property?.public_name || null;

    const checkIn  = parseDate(sourceResv.arrival_date   || sourceResv.check_in);
    const checkOut = parseDate(sourceResv.departure_date || sourceResv.check_out);
    const nights = sourceResv.nights ||
      (checkIn && checkOut ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000) : null);
    const guestsTotal = sourceResv.guests?.total || sourceResv.guests_count || 1;
    const platform = sourceResv.platform || resv.platform || "Hospitable";
    const code = sourceResv.code || resv.code || resvId.slice(0, 8);
    const status = sourceResv.status || statusRaw;

    const booking = {
      id: resvId,
      code: String(code),
      property_id: propertyId,
      property_name: propertyName || "Unknown Property",
      check_in: checkIn,
      check_out: checkOut,
      guests: Number(guestsTotal) || 1,
      platform: String(platform),
      nights: nights ? Number(nights) : null,
      status: String(status),
      synced_at: new Date().toISOString()
    };

    console.log("Saving booking:", JSON.stringify(booking));
    const ok = await supabaseUpsert("hospitable_bookings", booking);
    return res.status(200).json({ message: ok ? "Saved" : "Failed", booking });

  } catch(e) {
    console.error("Webhook error:", e.message);
    return res.status(200).json({ message: "Error", error: e.message });
  }
}
