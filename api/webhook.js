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
  if (!res.ok) {
    const err = await res.text();
    console.error("Supabase error:", err);
  }
  return res.ok;
}

async function supabaseDelete(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
  });
  return res.ok;
}

async function getFullReservation(resvId) {
  if (!HOSPITABLE_TOKEN) { console.log("No HOSPITABLE_TOKEN"); return null; }
  try {
    const res = await fetch(
      `https://public.api.hospitable.com/v2/reservations/${resvId}?include=properties`,
      { headers: { "Authorization": `Bearer ${HOSPITABLE_TOKEN}`, "Accept": "application/json" } }
    );
    if (!res.ok) { console.log(`Hospitable API ${res.status} for ${resvId}`); return null; }
    const json = await res.json();
    return json.data || null;
  } catch(e) {
    console.log("API fetch error:", e.message);
    return null;
  }
}

// Also try to get property name from the properties endpoint
async function getPropertyName(propertyId) {
  if (!HOSPITABLE_TOKEN || !propertyId) return null;
  try {
    const res = await fetch(
      `https://public.api.hospitable.com/v2/properties/${propertyId}`,
      { headers: { "Authorization": `Bearer ${HOSPITABLE_TOKEN}`, "Accept": "application/json" } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const p = json.data;
    return p?.name || p?.public_name || p?.internal_name || null;
  } catch(e) { return null; }
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  return String(dateStr).slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body;
    console.log("Webhook received:", JSON.stringify(body).slice(0, 300));

    const action = body.action || body.event || "";
    const resv = body.data || body;
    const resvId = resv.id || resv.uuid;
    if (!resvId) return res.status(200).json({ message: "No reservation ID" });

    const statusRaw = resv.status || resv.reservation_status?.current?.category || "confirmed";
    if (action.includes("cancel") || statusRaw === "cancelled") {
      await supabaseDelete("hospitable_bookings", resvId);
      return res.status(200).json({ message: "Cancelled and removed" });
    }

    // Try to get full reservation with property details
    const fullResv = await getFullReservation(resvId);
    const sourceResv = fullResv || resv;

    // Extract property info — try multiple approaches
    let propertyId = null;
    let propertyName = null;

    // Approach 1: from included properties array
    if (Array.isArray(sourceResv.properties) && sourceResv.properties.length > 0) {
      const p = sourceResv.properties[0];
      propertyId = p.id || p.uuid;
      propertyName = p.name || p.public_name || p.internal_name;
    }

    // Approach 2: from nested property object
    if (!propertyName && sourceResv.property) {
      propertyId = sourceResv.property.id || sourceResv.property.uuid;
      propertyName = sourceResv.property.name || sourceResv.property.public_name;
    }

    // Approach 3: from listing object
    if (!propertyName && sourceResv.listing) {
      propertyId = sourceResv.listing.id;
      propertyName = sourceResv.listing.name || sourceResv.listing.public_name;
    }

    // Approach 4: direct fields
    if (!propertyName) {
      propertyId = sourceResv.property_id || resv.property_id;
      propertyName = sourceResv.property_name || resv.property_name;
    }

    // Approach 5: fetch property separately if we have an ID
    if (!propertyName && propertyId) {
      propertyName = await getPropertyName(propertyId);
    }

    console.log(`Property: "${propertyName}" (${propertyId})`);

    const checkIn  = parseDate(sourceResv.arrival_date   || sourceResv.check_in  || resv.arrival_date  || resv.check_in);
    const checkOut = parseDate(sourceResv.departure_date || sourceResv.check_out || resv.departure_date || resv.check_out);
    const nights = sourceResv.nights || resv.nights ||
      (checkIn && checkOut ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000) : null);
    const guestsTotal = sourceResv.guests?.total || sourceResv.guests_count || resv.guests?.total || 1;
    const platform = sourceResv.platform || resv.platform || "Hospitable";
    const code = sourceResv.code || resv.code || resvId.slice(0, 8);
    const status = sourceResv.status || statusRaw;
    const revenue = sourceResv.payout?.amount || sourceResv.host_payout || 
                    sourceResv.revenue?.total || resv.payout?.amount || 0;

    const booking = {
      id: resvId,
      code: String(code),
      property_id: propertyId || null,
      property_name: propertyName || "Unknown Property",
      check_in: checkIn,
      check_out: checkOut,
      guests: Number(guestsTotal) || 1,
      platform: String(platform),
      nights: nights ? Number(nights) : null,
      status: String(status),
      revenue: revenue ? Number(revenue) : null,
      synced_at: new Date().toISOString()
    };

    console.log("Saving:", JSON.stringify(booking));
    const ok = await supabaseUpsert("hospitable_bookings", booking);
    return res.status(200).json({ message: ok ? "Saved" : "Failed", booking });

  } catch(e) {
    console.error("Webhook error:", e.message);
    return res.status(200).json({ message: "Error", error: e.message });
  }
}
