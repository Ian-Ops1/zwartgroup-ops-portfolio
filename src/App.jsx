import { useState, useEffect, useReducer, createContext, useContext, useCallback, useMemo, useRef } from "react";
import {
  Home, Calendar, ClipboardList, DollarSign, BarChart2, TrendingUp,
  AlertTriangle, Wrench, MessageSquare, Star, FileText, Users, BookOpen,
  MessageCircle, Building, BookMarked, Settings, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Plus, Edit, Trash2, Search, Filter, X, Check,
  Clock, RefreshCw, Phone, Mail, ExternalLink, Download, Upload, Eye,
  AlertCircle, CheckCircle, XCircle, Info, Bell, Menu, LogOut, Zap,
  ArrowUp, ArrowDown, Minus, Save, Copy, MoreVertical, Link,
  MapPin, User, CreditCard, Hash, Percent, Activity, Layers, Target
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from "recharts";

// ─── FONTS ───────────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap";
document.head.appendChild(fontLink);
const gStyle = document.createElement("style");
gStyle.textContent = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Plus Jakarta Sans',sans-serif;background:#0D0F14;}
  ::-webkit-scrollbar{width:6px;height:6px;}
  ::-webkit-scrollbar-track{background:#13161C;}
  ::-webkit-scrollbar-thumb{background:#2A2D35;border-radius:3px;}
  ::-webkit-scrollbar-thumb:hover{background:#3A3D45;}
  input,select,textarea{font-family:'Plus Jakarta Sans',sans-serif;}
  .mono{font-family:'DM Mono',monospace;}
  .syne{font-family:'Syne',sans-serif;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
  @keyframes slideIn{from{transform:translateX(100%);}to{transform:translateX(0);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.5;}}
`;
document.head.appendChild(gStyle);

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg0: "#0D0F14", bg1: "#13161C", bg2: "#1A1D26", bg3: "#22263A",
  border: "#2A2D35", borderHover: "#3A3D45",
  teal: "#00D4B8", tealDim: "#007A6A", tealBg: "rgba(0,212,184,0.08)",
  amber: "#F5A623", amberDim: "#8A5E0F", amberBg: "rgba(245,166,35,0.1)",
  crimson: "#FF3B5C", crimsonDim: "#8A1F30", crimsonBg: "rgba(255,59,92,0.1)",
  platinum: "#E8EAF0", silver: "#9BA3B8", slate: "#5A6180",
  green: "#22C55E", greenBg: "rgba(34,197,94,0.1)",
  blue: "#3B82F6", blueBg: "rgba(59,130,246,0.1)",
  purple: "#A855F7", purpleBg: "rgba(168,85,247,0.1)",
  text1: "#E8EAF0", text2: "#9BA3B8", text3: "#5A6180",
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10); // Always uses real current date
const addDays = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d} ${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m]} ${y}`;
};
const fmtShort = (iso) => {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  return `${d} ${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m]}`;
};
const fmtCurr = (n) => `R ${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const excelToISO = (serial) => {
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().slice(0, 10);
};

const calculateCleans = (checkIn, checkOut, nights) => {
  // Matches Excel: D+(n*7)<E (strictly less than checkout)
  const numCleans = nights <= 7 ? 0 : Math.ceil(nights / 7) - 1;
  if (numCleans === 0) return [];
  return Array.from({ length: numCleans }, (_, i) => ({
    cleanNumber: i + 1,
    dueDate: addDays(checkIn, (i + 1) * 7),
    status: "Upcoming",
    completedDate: null,
    assignedHousekeeper: "",
    notes: "",
    rescheduledFrom: null,
  }));
};

const getCleanStatus = (clean) => {
  if (clean.status === "Completed") return "Completed";
  if (clean.status === "Rescheduled") return "Rescheduled";
  const diff = daysBetween(TODAY, clean.dueDate);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Due Today";
  if (diff === 1) return "Due Tomorrow";
  return "Upcoming";
};

// ─── STATIC DATA ──────────────────────────────────────────────────────────────
// [id, name, address, area, type]
const PROP_RAW = [
  ["ZG-001","605 The Tokyo","87 Loop Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-002","109 Station House","Station House Sea Point, Cape Town, Western Cape, 8060, ZA","Sea Point","Apartment"],
  ["ZG-003","602 The Suro","The Suro, Holmfirth Road, Cape Town, Western Cape, 8060, ZA","Sea Point","Apartment"],
  ["ZG-004","Suite 103 Strand Beach","243 High Level Road, Cape Town, Western Cape, 8005, ZA","Sea Point","Apartment"],
  ["ZG-005","1322 16 on Bree","1322 Bree Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-006","2309 16 on Bree","1322 Bree Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-007","201 The Sage","Arthurs Road, Cape Town, Western Cape, 8060, ZA","Sea Point","Apartment"],
  ["ZG-008","504 The Centurion","The Centurion, 1 Frere Road, Cape Town, Western Cape, 8005, ZA","Sea Point","Apartment"],
  ["ZG-009","314 Station House","Station House Sea Point, Cape Town, Western Cape, 8060, ZA","Sea Point","Apartment"],
  ["ZG-010","10 Duet Loft","10 Duet Close, Cape Town, Western Cape, 7550, ZA","Durbanville","Cottage"],
  ["ZG-011","10 Duet Cottage","10 Duet Close, Cape Town, Western Cape, 7550, ZA","Durbanville","Cottage"],
  ["ZG-012","10 Duet Main House","10 Duet Close, Cape Town, Western Cape, 7550, ZA","Durbanville","House"],
  ["ZG-013","5 Sunglint","1 Sunglint, 24 Dudley Road cnr. Oldfield Sea Point, Cape Town, 8060","Sea Point","Apartment"],
  ["ZG-014","201 The Suro","The Suro, Holmfirth Road, Cape Town, Western Cape, 8060, ZA","Sea Point","Apartment"],
  ["ZG-015","Unit 3 Castella Mare","47 Coral Road, Cape Town, Western Cape, 7439, ZA","Table View","Apartment"],
  ["ZG-016","417 Station House","Station House Sea Point, Cape Town, Western Cape, 8060, ZA","Sea Point","Apartment"],
  ["ZG-017","605 The Tokyo","87 Loop Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-018","35 Uxolo","Uxolo Apartments, Cape Town, Western Cape, 8001, ZA","CBD","Apartment"],
  ["ZG-019","601 Station House","Station House Sea Point, Cape Town, Western Cape, 8060, ZA","Sea Point","Apartment"],
  ["ZG-020","209 220 on Loop","220 Loop Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-021","411 72 Kloof","72 Kloof, 1 Nicol Street, Cape Town, Western Cape, 8001, ZA","Gardens","Apartment"],
  ["ZG-022","21 Bungalow","Clifton Beach","Clifton","House"],
  ["ZG-023","Bungalow 25","Clifton Beach","Clifton","House"],
  ["ZG-024","504 Greenmarket","Shortmarket Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-025","601 Quayside Apartments","34 Prestwich Street, Cape Town, Western Cape, 8001, ZA","DWK","Apartment"],
  ["ZG-026","110 220 on Loop","220 Loop Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-027","108 343 on B","THREE43 on B, 343 Main Road, Cape Town, Western Cape, 8005, ZA","CBD","Apartment"],
  ["ZG-028","1008 The Tokyo","87 Loop Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-029","602 The Tokyo","87 Loop Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-030","Unit 4 Villa Palmar","Unit 4, Upper Portswood Road, Cape Town, Western Cape, 8051, ZA","Green Point","Apartment"],
  ["ZG-031","8 Bramber Court","12 Ravenscraig Road, Cape Town, Western Cape, 8005, ZA","Sea Point","Apartment"],
  ["ZG-032","506 Greenmarket","Shortmarket Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-033","24 Upper Pepper","24 Upper Pepper Street, Cape Town, Western Cape, 8001, ZA","Bo-Kaap","House"],
  ["ZG-034","109 Doric","Doric Court, York Road, Cape Town, Western Cape, 8051, ZA","Green Point","Apartment"],
  ["ZG-035","315 100 on Main","Unit 315, 100 Main Road, Cape Town, Western Cape, 8005, ZA","CBD","Apartment"],
  ["ZG-036","109 Mouille Grange","11 Beach Road, Cape Town, Western Cape, 8005, ZA","Mouille Point","Apartment"],
  ["ZG-037","2108 The Rubik","2108 Rubik, Loop Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-038","602 126 on Main","126 Main Road, Cape Town, Western Cape, 8060, ZA","CBD","Apartment"],
  ["ZG-039","92 Highstrand","Green Point, Cape Town","Green Point","Apartment"],
  ["ZG-040","526 St Martini Gardens","Queen Victoria Street, Cape Town, Western Cape, 8000, ZA","CBD","Apartment"],
  ["ZG-041","1005 Arnhem","6 Loxton Road, Cape Town, Western Cape, 7441, ZA","Milnerton","Apartment"],
  ["ZG-042","57 North Walk","57 North Walk, Cape Town, Western Cape, 7405, ZA","Pinelands","House"],
  ["ZG-043","505 Bridgewater","505 Conference Lane, Cape Town, Western Cape, 7441, ZA","Century City","Apartment"],
  ["ZG-044","17 Upper Paradise","17 Upper Paradise Road, Cape Town, Western Cape, 7700, ZA","Newlands","Cottage"],
  ["ZG-045","35A Constantia Road","35A Constantia Road, Cape Town, Western Cape, 8001, ZA","Gardens","Apartment"],
  ["ZG-046","10 Duet Main House","10 Duet Close, Cape Town, Western Cape, 7550, ZA","Durbanville","House"],
  ["ZG-047","59 Elgin","59 Elgin Road, Cape Town, Western Cape, 7700, ZA","Rondebosch","House"],
  ["ZG-048","78 Bryant Street","78 Bryant Street, Cape Town","Bo-Kaap","House"],
  ["ZG-049","614 Albert","1a Albert Road, Cape Town, Western Cape, 8001, ZA","Woodstock","Apartment"],
  ["ZG-050","Unit 1, 2 Munnik Laas","2 Munnik Laas Street, Cape Town, Western Cape, 7500, ZA","N1 City","House"],
  ["ZG-051","Unit 2, 2 Munnik Laas","2 Munnik Laas Street, Cape Town, Western Cape, 7500, ZA","N1 City","House"],
  ["ZG-052","Unit 3, 2 Munnik Laas","2 Munnik Laas Street, Cape Town, Western Cape, 7500, ZA","N1 City","House"],
];
const PROPERTIES = PROP_RAW.map(([id,name,address,area,type]) => ({
  id, name, address, area, type,
  flag: (id === "ZG-046") ? "⚠️ Duplicate of ZG-012" : (id === "ZG-017") ? "⚠️ Duplicate of ZG-001" : null,
  portfolio: parseInt(id.replace("ZG-","")) <= 30 ? 1 : 2,
  status: "Active",
}));

const mkBooking = (id, guestName, propId, checkIn, checkOut, platform, revenue, extraCleans = [], notes = "") => {
  const prop = PROPERTIES.find(p => p.id === propId);
  const nights = daysBetween(checkIn, checkOut);
  const cleans = calculateCleans(checkIn, checkOut, nights).map((c, i) => ({
    ...c,
    ...( extraCleans[i] || {}),
    status: extraCleans[i]?.status || c.status,
  }));
  // propId can be a ZG-ID or a property name directly
  return { id, guestName, propId, propertyName: prop?.name || propId, area: prop?.area || "",
    checkIn, checkOut, nights, platform, revenue: Number(revenue)||0, notes,
    status: daysBetween(checkOut, TODAY) > 0 ? "Checked Out" : daysBetween(TODAY, checkIn) > 0 ? "Upcoming" : "In-House",
    cleans };
};

// mkBookingDirect: for real bookings where property name is used directly
const mkBookingDirect = (id, guestName, propName, checkIn, checkOut, platform, revenue, cleanStatuses = [], notes = "") => {
  const nights = daysBetween(checkIn, checkOut);
  const cleans = calculateCleans(checkIn, checkOut, nights).map((c, i) => ({
    ...c,
    status: cleanStatuses[i] || c.status,
    assignedHousekeeper: "",
  }));
  return { id, guestName, propId: null, propertyName: propName, area: "",
    checkIn, checkOut, nights, platform, revenue: Number(revenue)||0, notes,
    status: daysBetween(checkOut, TODAY) > 0 ? "Checked Out" : daysBetween(TODAY, checkIn) > 0 ? "Upcoming" : "In-House",
    cleans };
};

const INITIAL_BOOKINGS = [
  // Real data from May_OpsHub_By_Ian_V7.xlsx — Res & Mid-Stay Cleans sheet
  // C=Completed, R=Rescheduled, U=Upcoming, T=DueToday, OV=Overdue
  mkBookingDirect("HMD9DDPMNY","Nomusa Buthelezi","Unit 3 Castella Mare","2026-05-02","2026-06-02","Airbnb",16705.35,["Completed","Completed","Completed","Upcoming"]),
  mkBookingDirect("HMMM4NRS3D","Lene Van Dyk","Tranquil Garden (10 Duet Cottage)","2026-05-01","2026-05-31","Airbnb",10541.63,["Completed","Completed","Completed","Upcoming"]),
  mkBookingDirect("HMDSP3XDZD","Abigail Windvogel","35 Uxolo","2026-04-30","2026-05-28","Airbnb",13446.79,["Completed","Completed","Completed"]),
  mkBookingDirect("HMPPK4ZEN5","Anthony Chijioke","2309 16 on Bree","2026-04-16","2026-05-16","Airbnb",28009.34,["Completed","Completed","Completed","Completed"]),
  mkBookingDirect("HMZZYR9NP8","Oluwamayowa Fanoiki","2108 The Rubik","2026-04-13","2026-05-14","Airbnb",20117.40,["Completed","Completed","Completed","Completed"]),
  mkBookingDirect("HMNZ59ABRW","Sylvester Selepe","601 Quayside Apartments","2026-04-24","2026-06-30","Airbnb",52196.41,["Completed","Completed","Completed","Completed","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming"]),
  mkBookingDirect("HMKMTC9JAQ","Tonye Tariah","1005 Arnhem","2026-04-06","2026-05-08","Airbnb",23030.40,["Completed","Completed","Completed","Completed"]),
  mkBookingDirect("HMQESEWZMJ","Francisca","Suite 103 Strand Beach","2026-05-01","2026-05-17","Airbnb",0,["Completed","Completed"],"⚠️ Revenue missing"),
  mkBookingDirect("HMH34D3NEA","Azeez Kehinde","504 Greenmarket","2026-04-30","2026-05-11","Airbnb",7763.89,["Completed"]),
  mkBookingDirect("HMPRNKZKH4","Abdullah Habeeb","505 Bridgewater","2026-05-03","2026-06-03","Airbnb",24890.01,["Completed","Rescheduled","Due Today","Upcoming"]),
  mkBookingDirect("HMNRD2RRP9","Maya Dorel","8 Bramber Court","2026-04-11","2026-06-11","Airbnb",67965.89,["Completed","Completed","Completed","Completed","Rescheduled","Overdue","Upcoming","Upcoming"]),
  mkBookingDirect("HMMN2RHC4P","Serena Dell'Angelo","504 The Centurion","2026-04-23","2026-05-25","Airbnb",22063.97,["Completed","Completed","Completed","Completed"]),
  mkBookingDirect("HMJHWNNKMB","Milla Sequeira","201 The Suro","2026-05-04","2026-06-04","Airbnb",41017.65,["Completed","Completed","Due Tomorrow","Upcoming"]),
  mkBookingDirect("HMBRAYFMD2","Ontario","24 Upper Pepper","2026-05-04","2026-05-29","Airbnb",21933.38,["Completed","Completed","Due Tomorrow"]),
  mkBookingDirect("HMPFX4MBN2","Teresa Forester","The Nest (10 Duet Loft)","2026-05-07","2026-05-19","Airbnb",910.67,["Completed"]),
  mkBookingDirect("HMC344RY9N","Brian Van Eyssen","Unit 2 - 2 Munnik Laas","2026-05-08","2026-05-31","Airbnb",0,["Rescheduled","Rescheduled","Upcoming"],"⚠️ Revenue missing"),
  mkBookingDirect("5986083519","Alexis","417 Station House","2026-05-10","2026-08-01","Booking.com",0,["Rescheduled","Due Today","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming"],"⚠️ Revenue missing"),
  mkBookingDirect("N/A","Guest","601 Station House","2026-05-04","2026-08-01","Direct",0,["Completed","Completed","Due Tomorrow","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming"],"⚠️ Guest name missing; ⚠️ Revenue missing"),
  mkBookingDirect("HM3TX2FDHZ","Rhianne Tisdale","602 The Suro","2026-05-09","2026-06-14","Airbnb",0,["Rescheduled","Overdue","Upcoming","Upcoming","Upcoming"],"⚠️ Revenue missing"),
  mkBookingDirect("HMPFX4MBN2-B","Guest","The Nest (10 Duet Loft)","2026-05-09","2026-05-19","Airbnb",0,["Completed"],"⚠️ Guest name missing; ⚠️ Revenue missing"),
  mkBookingDirect("HMEWYEMCWH","Guest","Unit 1 - 2 Munnik Laas","2026-05-10","2026-06-30","Airbnb",0,["Rescheduled","Due Today","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming"],"⚠️ Guest name missing; ⚠️ Revenue missing"),
  mkBookingDirect("HMXRKNYWJN","Guest","10 Duet Main House","2026-05-14","2026-05-23","Airbnb",0,["Completed"],"⚠️ Guest name missing; ⚠️ Revenue missing"),
  mkBookingDirect("4PL7YF","John","314 Station House","2026-05-11","2026-06-11","Direct",0,["Completed","Due Tomorrow","Upcoming","Upcoming"],"⚠️ Revenue missing"),
  mkBookingDirect("NA-614","Guest","614 Albert","2026-05-14","2026-05-22","Airbnb",0,["Completed"],"⚠️ Guest name missing; ⚠️ Revenue missing"),
  mkBookingDirect("NA-220","Guest","209 220 on Loop","2026-05-15","2026-06-15","Airbnb",0,["Completed","Upcoming","Upcoming","Upcoming"],"⚠️ Guest name missing; ⚠️ Revenue missing"),
  mkBookingDirect("NA-126","Guest","602 126 on Main","2026-05-15","2026-05-28","Airbnb",0,["Completed"],"⚠️ Guest name missing; ⚠️ Revenue missing"),
];

// Apply live status calculation
INITIAL_BOOKINGS.forEach(b => {
  b.cleans = b.cleans.map(c => {
    if (["Completed","Rescheduled"].includes(c.status)) return c;
    return { ...c, status: getCleanStatus(c) };
  });
  b.status = daysBetween(TODAY, b.checkIn) > 0 ? "Upcoming" : daysBetween(b.checkOut, TODAY) > 0 ? "Checked Out" : "In-House";
});


INITIAL_BOOKINGS.forEach(b => {
  b.cleans = b.cleans.map(c => ({ ...c, status: c.status === "Completed" ? "Completed" : c.status === "Overdue" ? "Overdue" : c.status === "Due Today" ? "Due Today" : c.status === "Due Tomorrow" ? "Due Tomorrow" : getCleanStatus(c) }));
  b.status = daysBetween(TODAY, b.checkIn) > 0 ? "Upcoming" : daysBetween(b.checkOut, TODAY) > 0 ? "Checked Out" : "In-House";
});

const INITIAL_INCIDENTS = [
  { id:"INC-001", propertyId:"ZG-002", propertyName:"601 Quayside", date:"2026-05-10", type:"Cleaning Issue", description:"Guest reported inadequate cleaning on arrival. Bin not emptied, bathroom not wiped down.", guest:"Sylvester Selepe", severity:"Medium", status:"Resolved", resolution:"Sharon returned for a full re-clean. Apology sent. 10% discount applied to next stay.", resolvedDate:"2026-05-10" },
  { id:"INC-002", propertyId:"ZG-003", propertyName:"8 Bramber Court", date:"2026-05-14", type:"Maintenance - HVAC", description:"Air conditioner not cooling. Unit producing warm air only. Guest stayed in hotel for one night.", guest:"Maya", severity:"High", status:"Resolved", resolution:"Andy attended and replaced faulty capacitor. AC operational by next morning.", resolvedDate:"2026-05-15" },
  { id:"INC-003", propertyId:"ZG-004", propertyName:"109 Mouille Grange", date:"2026-05-22", type:"Guest Complaint", description:"Guest reports dirty ceiling fan and snack basket was not replenished as per listing description.", guest:"Uzoamaka", severity:"Low", status:"Open", resolution:"", resolvedDate:null },
];


const INITIAL_COMPLAINTS = [
  { id:"CMP-001", propertyId:"ZG-004", propertyName:"109 Mouille Grange", date:"2026-05-22", guestName:"Uzoamaka", type:"Cleanliness", description:"Dirty fan blades. Snack basket empty.", status:"Open", resolvedDate:null },
  { id:"CMP-002", propertyId:"ZG-002", propertyName:"601 Quayside", date:"2026-05-10", guestName:"Sylvester Selepe", type:"Cleaning", description:"Bin not emptied on arrival.", status:"Resolved", resolvedDate:"2026-05-10" },
];

const INITIAL_REVIEWS = [
  { id:"REV-001", propertyId:"ZG-015", propertyName:"Unit 3 Castella Mare", date:"2026-05-01", guestName:"Nomusa Buthelezi", rating:5, platform:"Airbnb", comment:"Exceptional stay. Views are incredible, apartment impeccably clean. Rebecca is a star!", responded:true },
  { id:"REV-002", propertyId:"ZG-009", propertyName:"501 Harbour Bridge", date:"2026-04-18", guestName:"Chidi Okonkwo", rating:4, platform:"Airbnb", comment:"Great location, comfortable apartment. Minor noise from street at night.", responded:false },
  { id:"REV-003", propertyId:"ZG-032", propertyName:"403 Azure", date:"2026-04-28", guestName:"Previous Guest", rating:5, platform:"Booking.com", comment:"Perfect Camps Bay experience. Would book again immediately.", responded:true },
  { id:"REV-004", propertyId:"ZG-003", propertyName:"8 Bramber Court", date:"2026-05-15", guestName:"Maya", rating:3, platform:"Booking.com", comment:"AC issue was disappointing but management responded quickly. Good location.", responded:true },
  { id:"REV-005", propertyId:"ZG-002", propertyName:"601 Quayside", date:"2026-05-12", guestName:"Sylvester Selepe", rating:4, platform:"Airbnb", comment:"Great waterfront location. Cleaning was sorted out quickly after initial issue.", responded:false },
];

const INITIAL_TEAM = [
  { id:"T001", name:"Rebecca", role:"Senior Housekeeper", portfolio:[1,2], phone:"+27 72 111 2222", rating:4.9, completedCleans:87, active:true },
  { id:"T002", name:"Sharon", role:"Housekeeper", portfolio:[1,2], phone:"+27 73 222 3333", rating:4.7, completedCleans:64, active:true },
  { id:"T003", name:"Sandy", role:"Housekeeper", portfolio:[1], phone:"+27 74 333 4444", rating:4.8, completedCleans:71, active:true },
  { id:"T004", name:"Betty", role:"Housekeeper", portfolio:[1,2], phone:"+27 76 444 5555", rating:4.6, completedCleans:55, active:true },
  { id:"T005", name:"Netsai", role:"Housekeeper", portfolio:[2], phone:"+27 78 555 6666", rating:4.9, completedCleans:79, active:true },
  { id:"T006", name:"Tryness", role:"Housekeeper", portfolio:[1,2], phone:"+27 79 666 7777", rating:4.8, completedCleans:68, active:true },
  { id:"T007", name:"Kudzai", role:"Housekeeper", portfolio:[2], phone:"+27 81 777 8888", rating:4.7, completedCleans:61, active:true },
  { id:"T008", name:"Merjury", role:"Housekeeper", portfolio:[1,2], phone:"+27 83 888 9999", rating:4.5, completedCleans:43, active:true },
  { id:"T009", name:"Andy", role:"Internet & Tech", portfolio:[1,2], phone:"+27 84 999 0000", rating:4.8, completedCleans:0, active:true, notes:"Router installs, CCTV, TV setup" },
  { id:"T010", name:"Cleanix", role:"Maintenance Contractor", portfolio:[1,2], phone:"+27 21 555 7777", rating:4.4, completedCleans:0, active:true, notes:"Plumbing, electrical, pool, appliances" },
];

const SOPS = [
  { id:"SOP-001", title:"Pre-arrival Checklist", category:"Housekeeping", content:`1. Complete full unit clean minimum 2 hours before check-in\n2. Make all beds with fresh linen (hospital corners)\n3. Replace all towels (bath, hand, face, pool if applicable)\n4. Replenish welcome pack: coffee pods, tea, sugar, milk portions, biscuits\n5. Check snack basket per listing description\n6. Test all appliances: AC, dishwasher, washing machine, TV\n7. Check WiFi router is on and test connection\n8. Fill ice trays / ensure ice maker functioning\n9. Check pool/Jacuzzi temperature if applicable\n10. Photograph completed unit and submit to ops group` },
  { id:"SOP-002", title:"Mid-Stay Clean Protocol", category:"Housekeeping", content:`1. Knock and announce 3 times before entering\n2. Replace all used linen if guest requests; tidy if not\n3. Replace ALL towels regardless\n4. Empty all bins\n5. Restock consumables: toilet paper (min 4 rolls), soap, shampoo, conditioner\n6. Clean kitchen surfaces, wipe appliances\n7. Clean bathrooms fully\n8. Photograph and report any damage immediately\n9. Replenish welcome pack items\n10. Log completion in app with timestamp` },
  { id:"SOP-003", title:"Checkout Inspection", category:"Inspection", content:`1. Inspect within 1 hour of checkout\n2. Check all rooms for damage or missing items\n3. Photograph any damage immediately\n4. Strip all beds and bag linen for laundry\n5. Check all appliances functioning\n6. Note any consumables to restock\n7. Log condition rating 1-5 in app\n8. Report damage to manager within 15 minutes` },
  { id:"SOP-004", title:"Damage Reporting", category:"Incidents", content:`1. Photograph damage immediately from multiple angles\n2. Log in Incident Register with date, time, description\n3. WhatsApp photo to manager group immediately\n4. Obtain quote from vendor within 24 hours\n5. Charge guest via platform if within claim window\n6. Document resolution in incident record` },
  { id:"SOP-005", title:"Emergency Contacts Protocol", category:"Emergency", content:`1. Fire: 107 (Cape Town Fire & Rescue)\n2. Police: 10111\n3. Ambulance: 10177\n4. Electricty faults: City of Cape Town 0860 103 089\n5. Water faults: City of Cape Town 0860 103 089\n6. After-hours manager: See Settings > Emergency Numbers\n7. Always inform guest of emergency services contacted\n8. Document all emergency incidents` },
  { id:"SOP-006", title:"Guest Check-in Communication", category:"Guest Comms", content:`1. Send check-in details 48 hours before arrival\n2. Include: door code/key location, WiFi details, parking instructions\n3. Include: appliance guide (AC, TV, dishwasher)\n4. Include: local emergency contacts\n5. Message guest 1 hour after check-in to confirm all good\n6. Respond to all messages within 30 minutes\n7. Escalate complaints to manager within 15 minutes` },
];

const TEMPLATES = [
  { id:"TPL-001", name:"Check-in Details", category:"Pre-arrival", content:`Hi [GUEST_NAME],\n\nWelcome to [PROPERTY_NAME]! We're so excited to host you.\n\nYour check-in is on [CHECKIN_DATE]. Here are your arrival details:\n\n🔑 ACCESS: [ACCESS_INSTRUCTIONS]\n📶 WiFi: Network: [WIFI_SSID] | Password: [WIFI_PASS]\n🚗 Parking: [PARKING_INSTRUCTIONS]\n\nPlease don't hesitate to reach out if you need anything. Have a wonderful stay!\n\nWarm regards,\nZwart Group Team` },
  { id:"TPL-002", name:"Mid-Stay Check-in", category:"During Stay", content:`Hi [GUEST_NAME],\n\nHope you're enjoying your stay at [PROPERTY_NAME]! 🌊\n\nJust checking in — is everything comfortable? Any issues we can sort out for you?\n\nA reminder that your mid-stay clean is scheduled for [CLEAN_DATE]. Our housekeeper will arrive between [CLEAN_TIME]. Please leave any laundry you'd like changed on the bed.\n\nEnjoy Cape Town!\n\nZwart Group` },
  { id:"TPL-003", name:"Checkout Instructions", category:"Pre-departure", content:`Hi [GUEST_NAME],\n\nWe hope you've had a wonderful stay at [PROPERTY_NAME]!\n\nYour checkout is on [CHECKOUT_DATE] at 10:00 AM. A few things before you go:\n\n✅ Leave keys in the lockbox\n✅ Leave AC off\n✅ No need to strip beds or clean — our team handles that\n✅ Please report any damage to avoid surprises\n\nSafe travels! We hope to host you again soon. 🙏\n\nZwart Group` },
  { id:"TPL-004", name:"5-Star Review Request", category:"Post-stay", content:`Hi [GUEST_NAME],\n\nThank you for staying at [PROPERTY_NAME] — it was a pleasure hosting you!\n\nIf you enjoyed your stay, we'd be incredibly grateful if you could leave us a review. Your feedback helps other travelers discover our home and helps us keep our standards high.\n\nClick here to leave your review: [REVIEW_LINK]\n\nThanks so much,\nZwart Group` },
  { id:"TPL-005", name:"Complaint Apology", category:"Issues", content:`Hi [GUEST_NAME],\n\nI sincerely apologize for the issue you've experienced at [PROPERTY_NAME]. This falls short of the standard we hold ourselves to.\n\nI've arranged for [RESOLUTION_ACTION] and this should be resolved by [RESOLUTION_TIME].\n\nAs a gesture of goodwill, I'd like to offer [GOODWILL_OFFER].\n\nThank you for your patience and understanding.\n\nSincerely,\nZwart Group Management` },
  { id:"TPL-006", name:"Damage Notice to Guest", category:"Issues", content:`Hi [GUEST_NAME],\n\nThank you for your recent stay at [PROPERTY_NAME].\n\nDuring our checkout inspection, we noticed [DAMAGE_DESCRIPTION]. I've attached photos for your reference.\n\nThe repair/replacement cost is estimated at [DAMAGE_AMOUNT]. We will process this through the platform's resolution center.\n\nIf you have any questions, please don't hesitate to reach out.\n\nRegards,\nZwart Group` },
  { id:"TPL-007", name:"Early Check-in Approval", category:"Concierge", content:`Hi [GUEST_NAME],\n\nGreat news! We're able to accommodate your early check-in request. Your unit at [PROPERTY_NAME] will be ready by [EARLY_CHECKIN_TIME].\n\nNo extra charge — our team will make sure everything is perfect for you. 😊\n\nSee you soon!\nZwart Group` },
  { id:"TPL-008", name:"Late Checkout Decline", category:"Concierge", content:`Hi [GUEST_NAME],\n\nThank you for your request for a late checkout at [PROPERTY_NAME].\n\nUnfortunately, we have a new guest arriving shortly after your scheduled checkout and we're unable to accommodate this on this occasion.\n\nIf you need storage for luggage after checkout, we can recommend [LUGGAGE_STORAGE_OPTIONS] nearby.\n\nThank you for understanding!\nZwart Group` },
  { id:"TPL-009", name:"WiFi Troubleshooting", category:"Tech Support", content:`Hi [GUEST_NAME],\n\nSorry to hear you're having WiFi issues! Here's what to try:\n\n1. Unplug the router (black box near [ROUTER_LOCATION])\n2. Wait 30 seconds\n3. Plug back in and wait 2 minutes\n4. Connect to: [WIFI_SSID] with password: [WIFI_PASS]\n\nIf that doesn't work, please call Andy directly on [ANDY_PHONE] and he'll resolve it remotely or come to you.\n\nSorry for the inconvenience!\nZwart Group` },
];

const EMERGENCY_NUMBERS = [
  { name:"Fire & Rescue", number:"107" },
  { name:"Police", number:"10111" },
  { name:"Ambulance", number:"10177" },
  { name:"City of Cape Town Faults", number:"0860 103 089" },
  { name:"Manager (After Hours)", number:"+27 82 123 4567" },
  { name:"Andy (Tech)", number:"+27 84 999 0000" },
];

const REVENUE_CALENDAR = (() => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const season = [85,78,70,65,72,60,55,58,68,75,80,90];
  const adr = [3800,3400,3100,2800,2900,2500,2400,2600,2900,3200,3500,4200];
  return months.map((m,i) => ({ month:m, occupancy:season[i], adr:adr[i], revpar: Math.round(season[i]/100*adr[i]) }));
})();


// ─── CONTEXT & REDUCER ────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const LS_KEY = "zwart_group_v1";

const initialState = {
  properties: PROPERTIES,
  bookings: INITIAL_BOOKINGS,
  incidents: INITIAL_INCIDENTS,
  complaints: INITIAL_COMPLAINTS,
  reviews: INITIAL_REVIEWS,
  team: INITIAL_TEAM,
  sops: SOPS,
  templates: TEMPLATES,
  dailyOps: {},
  housekeeping: [
    { id:"HK-001", date:"2026-05-04", housekeeper:"Sharon", properties:[
      { propertyName:"411 72 Kloof", taskType:"Full Turnover", keysCollected:"Done", guestKeys:"Done", electricityUnits:"Not Required", photos:"Issue", keysReturned:"Done", qcRating:5, notes:"" },
      { propertyName:"526 St Martini Gardens", taskType:"Full Turnover", keysCollected:"Not Required", guestKeys:"Done", electricityUnits:"Not Required", photos:"Issue", keysReturned:"Done", qcRating:4, notes:"" },
    ]},
    { id:"HK-002", date:"2026-05-04", housekeeper:"Rebecca", properties:[
      { propertyName:"59 Elgin", taskType:"Full Turnover", keysCollected:"Done", guestKeys:"Done", electricityUnits:"Not Required", photos:"Issue", keysReturned:"Done", qcRating:5, notes:"" },
    ]},
    { id:"HK-003", date:"2026-05-04", housekeeper:"Sandy", properties:[
      { propertyName:"Unit 4 Villa Palmar", taskType:"Full Turnover", keysCollected:"Done", guestKeys:"Done", electricityUnits:"Not Required", photos:"Done", keysReturned:"Done", qcRating:5, notes:"" },
      { propertyName:"315 100 on Main", taskType:"Full Turnover", keysCollected:"Not Required", guestKeys:"Done", electricityUnits:"Not Required", photos:"", keysReturned:"Done", qcRating:4, notes:"" },
    ]},
    { id:"HK-004", date:"2026-05-05", housekeeper:"Sharon", properties:[
      { propertyName:"17 Upper Paradise", taskType:"Full Turnover & Mid-Stay", keysCollected:"Not Required", guestKeys:"Done", electricityUnits:"Not Required", photos:"Issue", keysReturned:"Not Required", qcRating:3, notes:"" },
      { propertyName:"108 343 on B", taskType:"Full Turnover & Mid-Stay", keysCollected:"Done", guestKeys:"Done", electricityUnits:"Not Required", photos:"Issue", keysReturned:"Done", qcRating:3, notes:"" },
    ]},
    { id:"HK-005", date:"2026-05-05", housekeeper:"Betty", properties:[
      { propertyName:"10 Duet Main House", taskType:"Full Turnover", keysCollected:"Not Required", guestKeys:"Done", electricityUnits:"Done", photos:"Done", keysReturned:"Not Required", qcRating:5, notes:"" },
      { propertyName:"10 Duet Loft", taskType:"Full Turnover", keysCollected:"Not Required", guestKeys:"Done", electricityUnits:"Done", photos:"Issue", keysReturned:"Done", qcRating:4, notes:"" },
    ]},
    { id:"HK-006", date:"2026-05-08", housekeeper:"Sandy", properties:[
      { propertyName:"Suite 103 Strand Beach", taskType:"Mid-Stay Refresh", keysCollected:"Done", guestKeys:"Not Required", electricityUnits:"Not Required", photos:"Not Required", keysReturned:"Done", qcRating:4, notes:"" },
      { propertyName:"601 Quayside Apartments", taskType:"Mid-Stay Refresh", keysCollected:"Done", guestKeys:"Not Required", electricityUnits:"Not Required", photos:"Not Required", keysReturned:"Done", qcRating:4, notes:"" },
    ]},
  ],
  settings: {
    companyName: "Zwart Group",
    managerName: "Operations Manager",
    managerPhone: "+27 82 123 4567",
    emergencyNumbers: EMERGENCY_NUMBERS,
    hospitable: { apiKey: "", apiUrl: "", lastSync: null, enabled: false },
  },
  toast: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_TOAST": return { ...state, toast: action.payload };
    case "UPDATE_CLEAN": {
      const { bookingId, cleanIndex, updates } = action.payload;
      return { ...state, bookings: state.bookings.map(b =>
        b.id === bookingId ? { ...b, cleans: b.cleans.map((c,i) => i === cleanIndex ? { ...c, ...updates } : c) } : b
      )};
    }
    case "ADD_BOOKING": return { ...state, bookings: [...state.bookings, action.payload] };
    case "UPDATE_BOOKING": return { ...state, bookings: state.bookings.map(b => b.id === action.payload.id ? { ...b, ...action.payload } : b) };
    case "DELETE_BOOKING": return { ...state, bookings: state.bookings.filter(b => b.id !== action.payload) };
    case "ADD_INCIDENT": return { ...state, incidents: [...state.incidents, action.payload] };
    case "UPDATE_INCIDENT": return { ...state, incidents: state.incidents.map(i => i.id === action.payload.id ? { ...i, ...action.payload } : i) };
    case "ADD_COMPLAINT": return { ...state, complaints: [...state.complaints, action.payload] };
    case "UPDATE_COMPLAINT": return { ...state, complaints: state.complaints.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };
    case "ADD_REVIEW": return { ...state, reviews: [...state.reviews, action.payload] };
    case "UPDATE_REVIEW": return { ...state, reviews: state.reviews.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r) };
    case "UPDATE_DAILY_OPS": return { ...state, dailyOps: { ...state.dailyOps, [action.date]: action.payload } };
    case "UPDATE_SETTINGS": return { ...state, settings: { ...state.settings, ...action.payload } };
    case "ADD_PROPERTY": return { ...state, properties: [...state.properties, action.payload] };
    case "UPDATE_PROPERTY": return { ...state, properties: state.properties.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case "ADD_TEAM_MEMBER": return { ...state, team: [...state.team, action.payload] };
    case "ADD_HK_SCHEDULE": return { ...state, housekeeping: [...state.housekeeping, action.payload] };
    case "UPDATE_HK_SCHEDULE": return { ...state, housekeeping: state.housekeeping.map(h => h.id === action.payload.id ? { ...h, ...action.payload } : h) };
    case "DELETE_HK_SCHEDULE": return { ...state, housekeeping: state.housekeeping.filter(h => h.id !== action.payload) };
    case "REMOVE_TEAM_MEMBER": return { ...state, team: state.team.filter(m => m.id !== action.payload) };
    default: return state;
  }
}

function AppProvider({ children }) {
  const stored = useMemo(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (!s) return null;
      const parsed = JSON.parse(s);
      // Merge with initialState so new keys added in updates are always present
      return { ...initialState, ...parsed };
    } catch { return null; }
  }, []);
  const [state, dispatch] = useReducer(reducer, stored || initialState);
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} }, [state]);
  const toast = useCallback((msg, type = "success") => {
    dispatch({ type: "SET_TOAST", payload: { msg, type } });
    setTimeout(() => dispatch({ type: "SET_TOAST", payload: null }), 3000);
  }, []);
  return <AppCtx.Provider value={{ state, dispatch, toast }}>{children}</AppCtx.Provider>;
}

const useApp = () => useContext(AppCtx);

// ─── UI PRIMITIVES ─────────────────────────────────────────────────────────────
const statusColors = {
  "Upcoming":    { bg: C.blueBg, text: C.blue, border: C.blue },
  "In-House":    { bg: C.tealBg, text: C.teal, border: C.teal },
  "Checked Out": { bg: C.bg2, text: C.text2, border: C.border },
  "Completed":   { bg: C.greenBg, text: C.green, border: C.green },
  "Due Today":   { bg: C.amberBg, text: C.amber, border: C.amber },
  "Due Tomorrow":{ bg: C.amberBg, text: C.amber, border: C.amber },
  "Overdue":     { bg: C.crimsonBg, text: C.crimson, border: C.crimson },
  "Rescheduled": { bg: C.purpleBg, text: C.purple, border: C.purple },
  "Open":        { bg: C.crimsonBg, text: C.crimson, border: C.crimson },
  "Resolved":    { bg: C.greenBg, text: C.green, border: C.green },
  "Scheduled":   { bg: C.blueBg, text: C.blue, border: C.blue },
  "Pending":     { bg: C.amberBg, text: C.amber, border: C.amber },
  "Active":      { bg: C.tealBg, text: C.teal, border: C.teal },
  "Inactive":    { bg: C.bg2, text: C.text2, border: C.border },
  "Airbnb":      { bg: "rgba(255,90,95,0.12)", text: "#FF5A5F", border: "#FF5A5F" },
  "Booking.com": { bg: "rgba(0,101,221,0.12)", text: "#0065DD", border: "#0065DD" },
  "Direct":      { bg: C.tealBg, text: C.teal, border: C.teal },
};

function Badge({ label, size = "sm" }) {
  const s = statusColors[label] || { bg: C.bg3, text: C.text2, border: C.border };
  const p = size === "xs" ? "2px 6px" : size === "sm" ? "3px 8px" : "4px 12px";
  const fs = size === "xs" ? 10 : size === "sm" ? 11 : 12;
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}30`, borderRadius: 4,
      padding: p, fontSize: fs, fontWeight: 600, letterSpacing: "0.02em", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace" }}>
      {label}
    </span>
  );
}

function Btn({ children, onClick, variant = "default", size = "md", disabled, style: sx, icon: Icon }) {
  const base = { display:"inline-flex", alignItems:"center", gap:6, cursor: disabled ? "not-allowed" : "pointer",
    borderRadius:6, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:500, transition:"all 0.15s",
    opacity: disabled ? 0.5 : 1, border: "none", outline: "none" };
  const sizes = { sm: { padding:"5px 10px", fontSize:12 }, md: { padding:"8px 14px", fontSize:13 }, lg: { padding:"10px 18px", fontSize:14 } };
  const variants = {
    default:  { background: C.bg3, color: C.text1 },
    primary:  { background: C.teal, color: "#000" },
    amber:    { background: C.amber, color: "#000" },
    danger:   { background: C.crimson, color: "#fff" },
    ghost:    { background: "transparent", color: C.text2, border: `1px solid ${C.border}` },
    subtle:   { background: C.bg2, color: C.text2 },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...sx }}>
      {Icon && <Icon size={14} />}{children}
    </button>
  );
}

function Card({ children, style: sx, onClick, hover }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.bg1, border: `1px solid ${hov && hover ? C.borderHover : C.border}`,
        borderRadius: 10, padding: 16, cursor: onClick ? "pointer" : "default",
        transition:"border-color 0.15s", animation: "fadeIn 0.2s ease", ...sx }}>
      {children}
    </div>
  );
}

function KPICard({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px",
      borderLeft: `3px solid ${color || C.teal}`, flex: 1, minWidth: 140 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:11, color: C.text2, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</span>
        {Icon && <Icon size={16} color={color || C.teal} />}
      </div>
      <div style={{ fontSize:22, fontWeight:700, color: color || C.teal, fontFamily:"'DM Mono',monospace" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color: C.text3, marginTop:4 }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ fontSize:11, color: trend >= 0 ? C.green : C.crimson, marginTop:4, display:"flex", alignItems:"center", gap:3 }}>
          {trend >= 0 ? <ArrowUp size={11}/> : <ArrowDown size={11}/>} {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color: C.platinum }}>{children}</h2>
      {sub && <p style={{ fontSize:13, color: C.text2, marginTop:4 }}>{sub}</p>}
    </div>
  );
}

function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:12, width:"100%", maxWidth:width,
        maxHeight:"90vh", overflowY:"auto", animation:"fadeIn 0.2s ease" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:C.platinum }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.text2, padding:4 }}><X size={18}/></button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

function Drawer({ open, onClose, title, children }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, display: open ? "flex" : "none", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ flex:1, background:"rgba(0,0,0,0.5)" }} />
      <div style={{ width:480, maxWidth:"90vw", background:C.bg1, borderLeft:`1px solid ${C.border}`,
        height:"100%", overflowY:"auto", animation: open ? "slideIn 0.3s ease" : "none" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.bg1, zIndex:1 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:C.platinum }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.text2, padding:4 }}><X size={18}/></button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

function Toast() {
  const { state } = useApp();
  const t = state.toast;
  if (!t) return null;
  const colors = { success: C.teal, error: C.crimson, warning: C.amber, info: C.blue };
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:2000, background:C.bg1, border:`1px solid ${colors[t.type]||C.border}`,
      borderLeft:`3px solid ${colors[t.type]||C.teal}`, borderRadius:8, padding:"12px 20px",
      color:C.text1, fontSize:13, maxWidth:360, animation:"fadeIn 0.2s ease", display:"flex", alignItems:"center", gap:10 }}>
      {t.type === "success" && <CheckCircle size={16} color={C.teal}/>}
      {t.type === "error" && <XCircle size={16} color={C.crimson}/>}
      {t.type === "warning" && <AlertCircle size={16} color={C.amber}/>}
      {t.msg}
    </div>
  );
}

function FormRow({ label, children, required }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:12, color:C.text2, marginBottom:6, fontWeight:500 }}>
        {label}{required && <span style={{ color:C.crimson }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = { width:"100%", background:C.bg2, border:`1px solid ${C.border}`, borderRadius:6,
  padding:"8px 12px", color:C.text1, fontSize:13, fontFamily:"'Plus Jakarta Sans',sans-serif", outline:"none" };

function Input({ value, onChange, placeholder, type = "text", disabled, style: sx }) {
  return <input type={type} value={value||""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    disabled={disabled} style={{ ...inputStyle, opacity: disabled ? 0.5 : 1, ...sx }} />;
}

function Select({ value, onChange, options, style: sx }) {
  return (
    <select value={value||""} onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle, cursor:"pointer", ...sx }}>
      {options.map(o => typeof o === "string"
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:C.text3 }}>
      {Icon && <Icon size={40} style={{ marginBottom:12, opacity:0.3 }} />}
      <div style={{ fontSize:15, fontWeight:600, color:C.text2, marginBottom:6 }}>{title}</div>
      {sub && <div style={{ fontSize:13 }}>{sub}</div>}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder = "Search..." }) {
  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center" }}>
      <Search size={14} style={{ position:"absolute", left:10, color:C.text3, pointerEvents:"none" }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inputStyle, paddingLeft:32, width:240 }} />
    </div>
  );
}


// ─── NAVIGATION MODULES CONFIG ────────────────────────────────────────────────
const NAV = [
  { id:"dashboard",     icon:Home,         label:"Dashboard",          badge:null },
  { id:"cleans",        icon:Calendar,     label:"Res & Cleans",       badge:"cleans" },
  { id:"dailyops",      icon:ClipboardList,label:"Daily Ops",          badge:null },
  { id:"housekeeping",   icon:Users,        label:"Housekeeping",        badge:null },
  { id:"financials",    icon:DollarSign,   label:"Financials",         badge:null },
  { id:"metrics",       icon:BarChart2,    label:"Advanced Metrics",   badge:null },
  { id:"revenue",       icon:TrendingUp,   label:"Revenue Strategy",   badge:null },
  { id:"incidents",     icon:AlertTriangle,label:"Incidents & Complaints", badge:"incidents" },
  { id:"reviews",       icon:Star,         label:"Reviews",            badge:"reviews" },
  { id:"scorecard",     icon:Target,       label:"Property Scorecard",  badge:null },
  { id:"statements",    icon:FileText,     label:"Owner Statements",   badge:null },
  { id:"team",          icon:Users,        label:"Team & Vendors",     badge:null },
  { id:"sops",          icon:BookOpen,     label:"SOPs",               badge:null },
  { id:"templates",     icon:MessageCircle,label:"Guest Comms",        badge:null },
  { id:"properties",    icon:Building,     label:"Properties",         badge:null },
  { id:"history",       icon:BookMarked,   label:"Daily History",      badge:null },
  { id:"settings",      icon:Settings,     label:"Settings",           badge:null },
];

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ active, onNav, collapsed, onToggle }) {
  const { state } = useApp();
  const badges = useMemo(() => {
    const openIncidents = state.incidents.filter(i => i.status === "Open").length;
    const pendingMaint = 0;
    const unrespondedReviews = state.reviews.filter(r => !r.responded).length;
    const urgentCleans = state.bookings.flatMap(b => b.cleans).filter(c =>
      ["Due Today","Due Tomorrow","Overdue"].includes(c.status)).length;
    const openComplaints = state.complaints.filter(c => c.status === "Open").length;
    return { incidents: openIncidents + openComplaints, maintenance: 0,
      complaints: openComplaints, reviews: unrespondedReviews, cleans: urgentCleans };
  }, [state]);

  return (
    <div style={{ width: collapsed ? 64 : 240, minHeight:"100vh", background:C.bg1,
      borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column",
      transition:"width 0.25s ease", overflow:"hidden", flexShrink:0 }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? "20px 0" : "20px 16px", borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", gap:10, justifyContent: collapsed ? "center" : "space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:`linear-gradient(135deg,${C.teal},${C.tealDim})`,
            borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Building size={16} color="#000" />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:800, color:C.platinum, lineHeight:1 }}>ZWART</div>
              <div style={{ fontSize:9, color:C.teal, letterSpacing:"0.15em", fontWeight:600 }}>GROUP OPS</div>
            </div>
          )}
        </div>
        <button onClick={onToggle} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:5,
          padding:"3px 5px", cursor:"pointer", color:C.text2, display: collapsed ? "none" : "flex", alignItems:"center" }}>
          <ChevronLeft size={12} />
        </button>
      </div>
      {collapsed && (
        <div style={{ display:"flex", justifyContent:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
          <button onClick={onToggle} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:5,
            padding:"3px 5px", cursor:"pointer", color:C.text2 }}>
            <ChevronRight size={12} />
          </button>
        </div>
      )}
      {/* Nav items */}
      <nav style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
        {NAV.map(({ id, icon: Icon, label, badge }) => {
          const badgeCount = badge ? badges[badge] : 0;
          const isActive = active === id;
          return (
            <button key={id} onClick={() => onNav(id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding: collapsed ? "10px 0" : "9px 14px",
                justifyContent: collapsed ? "center" : "flex-start", background: isActive ? C.tealBg : "none",
                border:"none", cursor:"pointer", color: isActive ? C.teal : C.text2,
                borderLeft: isActive ? `3px solid ${C.teal}` : "3px solid transparent",
                fontSize:13, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight: isActive ? 600 : 400,
                transition:"all 0.12s", position:"relative" }}>
              <Icon size={16} />
              {!collapsed && <span style={{ flex:1, textAlign:"left" }}>{label}</span>}
              {!collapsed && badgeCount > 0 && (
                <span style={{ background:C.crimson, color:"#fff", fontSize:10, fontWeight:700, borderRadius:10,
                  padding:"1px 6px", minWidth:18, textAlign:"center" }}>{badgeCount}</span>
              )}
              {collapsed && badgeCount > 0 && (
                <div style={{ position:"absolute", top:6, right:10, width:8, height:8,
                  background:C.crimson, borderRadius:"50%" }} />
              )}
            </button>
          );
        })}
      </nav>
      {/* Portfolio indicators */}
      {!collapsed && (
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}`, fontSize:11, color:C.text3 }}>
          <div style={{ display:"flex", gap:8, marginBottom:6 }}>
            <span style={{ background:C.tealBg, color:C.teal, padding:"2px 8px", borderRadius:3, fontSize:10, fontWeight:600 }}>P1 ×30</span>
            <span style={{ background:C.amberBg, color:C.amber, padding:"2px 8px", borderRadius:3, fontSize:10, fontWeight:600 }}>P2 ×22</span>
          </div>
          <div style={{ color:C.text3, fontSize:10 }}>52 Properties · Cape Town</div>
        </div>
      )}
    </div>
  );
}

// ─── TOP BAR ─────────────────────────────────────────────────────────────────
function TopBar({ module }) {
  const { state } = useApp();
  const inHouse = state.bookings.filter(b => b.status === "In-House").length;
  const todayCheckIns = state.bookings.filter(b => b.checkIn === TODAY).length;
  const todayCheckOuts = state.bookings.filter(b => b.checkOut === TODAY).length;
  const urgentCleans = state.bookings.flatMap(b => b.cleans).filter(c => ["Due Today","Overdue"].includes(c.status)).length;
  const chips = [
    { label:"In-House", value:inHouse, color:C.teal },
    { label:"Check-ins", value:todayCheckIns, color:C.green },
    { label:"Check-outs", value:todayCheckOuts, color:C.blue },
    { label:"Urgent Cleans", value:urgentCleans, color: urgentCleans > 0 ? C.crimson : C.text3 },
  ];
  return (
    <div style={{ height:56, background:C.bg1, borderBottom:`1px solid ${C.border}`, display:"flex",
      alignItems:"center", padding:"0 24px", gap:20, flexShrink:0 }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.platinum, flex:"0 0 auto" }}>
        {NAV.find(n => n.id === module)?.label || "Dashboard"}
      </div>
      <div style={{ width:1, height:24, background:C.border }} />
      <div style={{ display:"flex", gap:16, flex:1 }}>
        {chips.map(chip => (
          <div key={chip.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, color:C.text3 }}>{chip.label}:</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:600, color:chip.color }}>{chip.value}</span>
          </div>
        ))}
      </div>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.text3 }}>
        {fmtDate(TODAY)}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ onNav }) {
  const { state } = useApp();
  const { bookings, incidents, maintenance, complaints } = state;

  const inHouseBookings = bookings.filter(b => b.status === "In-House");
  const todayIn = bookings.filter(b => b.checkIn === TODAY);
  const todayOut = bookings.filter(b => b.checkOut === TODAY);
  const urgentCleans = bookings.flatMap((b,bi) => b.cleans.map((c,ci) => ({...c,bIdx:bi,cIdx:ci,booking:b})))
    .filter(c => ["Due Today","Due Tomorrow","Overdue"].includes(c.status));
  const totalRevMay = bookings.filter(b => b.checkIn.startsWith("2026-05") || b.checkOut.startsWith("2026-05"))
    .reduce((s,b) => s + b.revenue, 0);
  const openIssues = incidents.filter(i => i.status === "Open").length + complaints.filter(c => c.status === "Open").length;

  const revenueData = ["Jan","Feb","Mar","Apr","May"].map((m,i) => ({
    month: m,
    revenue: [142000,128000,168000,195000,totalRevMay][i],
  }));

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <SectionTitle>Operations Overview <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, color:C.text2, fontWeight:400 }}>— {fmtDate(TODAY)}</span></SectionTitle>

      {/* KPI Row */}
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="In-House" value={inHouseBookings.length} icon={Building} color={C.teal} sub="properties occupied" />
        <KPICard label="Today Check-ins" value={todayIn.length} icon={ArrowUp} color={C.green} />
        <KPICard label="Today Check-outs" value={todayOut.length} icon={ArrowDown} color={C.blue} />
        <KPICard label="Urgent Cleans" value={urgentCleans.length} icon={AlertTriangle} color={urgentCleans.length > 0 ? C.crimson : C.teal} sub="due today + overdue" />
        <KPICard label="May Revenue" value={"R " + (totalRevMay/1000).toFixed(0) + "k"} icon={DollarSign} color={C.amber} />
        <KPICard label="Open Issues" value={openIssues} icon={AlertCircle} color={openIssues > 0 ? C.crimson : C.teal} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* Revenue Chart */}
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:16 }}>Revenue — 2026 YTD</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.teal} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={C.teal} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fill:C.text3, fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:C.text3, fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmtCurr(v)} contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:6, fontSize:12 }} />
              <Area type="monotone" dataKey="revenue" stroke={C.teal} fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Booking Status Pie */}
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:16 }}>Booking Status</div>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={[
                  { name:"In-House", value:inHouseBookings.length, color:C.teal },
                  { name:"Upcoming", value:bookings.filter(b=>b.status==="Upcoming").length, color:C.blue },
                  { name:"Checked Out", value:bookings.filter(b=>b.status==="Checked Out").length, color:C.slate },
                ]} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={40}>
                  {[C.teal, C.blue, C.slate].map((color,i) => <Cell key={i} fill={color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[{label:"In-House",v:inHouseBookings.length,c:C.teal},{label:"Upcoming",v:bookings.filter(b=>b.status==="Upcoming").length,c:C.blue},{label:"Checked Out",v:bookings.filter(b=>b.status==="Checked Out").length,c:C.slate}].map(i => (
                <div key={i.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:i.c }} />
                  <span style={{ fontSize:12, color:C.text2 }}>{i.label}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.text1, marginLeft:"auto", paddingLeft:12 }}>{i.v}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
        {/* Today's Activity */}
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:12 }}>Today's Activity</div>
          {todayIn.length === 0 && todayOut.length === 0 ? (
            <div style={{ fontSize:12, color:C.text3, padding:"20px 0" }}>No check-ins or check-outs today</div>
          ) : null}
          {todayIn.map(b => (
            <div key={b.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.border}20` }}>
              <ArrowUp size={12} color={C.green} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:C.text1, fontWeight:500 }}>{b.guestName}</div>
                <div style={{ fontSize:11, color:C.text3 }}>{b.propertyName}</div>
              </div>
              <Badge label="Upcoming" size="xs" />
            </div>
          ))}
          {todayOut.map(b => (
            <div key={b.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.border}20` }}>
              <ArrowDown size={12} color={C.blue} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:C.text1, fontWeight:500 }}>{b.guestName}</div>
                <div style={{ fontSize:11, color:C.text3 }}>{b.propertyName}</div>
              </div>
              <Badge label="Checked Out" size="xs" />
            </div>
          ))}
        </Card>

        {/* Urgent Cleans */}
        <Card>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:600, color:C.text2 }}>Urgent Cleans</div>
            <button onClick={() => onNav("cleans")} style={{ fontSize:11, color:C.teal, background:"none", border:"none", cursor:"pointer" }}>View all →</button>
          </div>
          {urgentCleans.length === 0 ? (
            <div style={{ fontSize:12, color:C.green, padding:"20px 0" }}>✓ All cleans on schedule</div>
          ) : urgentCleans.slice(0,5).map((c,i) => (
            <div key={i} style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.border}20` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:C.text1, fontWeight:500 }}>{c.booking.propertyName}</div>
                <div style={{ fontSize:11, color:C.text3 }}>Clean #{c.cleanNumber} · {fmtShort(c.dueDate)}</div>
              </div>
              <Badge label={c.status} size="xs" />
            </div>
          ))}
        </Card>

        {/* Open Alerts */}
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:12 }}>Open Alerts</div>
          {[...incidents.filter(i=>i.status==="Open"), ...maintenance.filter(m=>m.status!=="Completed"), ...complaints.filter(c=>c.status==="Open")].slice(0,5).map((item,i) => (
            <div key={i} style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.border}20` }}>
              <AlertCircle size={12} color={C.crimson} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:C.text1, fontWeight:500 }}>{item.propertyName || item.propertyId}</div>
                <div style={{ fontSize:11, color:C.text3 }}>{item.type || item.issue || "Complaint"}</div>
              </div>
            </div>
          ))}
          {openIssues === 0 && <div style={{ fontSize:12, color:C.green, padding:"20px 0" }}>✓ No open alerts</div>}
        </Card>
      </div>
    </div>
  );
}


// ─── ROW COLOUR HELPERS ──────────────────────────────────────────────────────
const getBookingRowColor = (booking) => {
  const statuses = booking.cleans.map(c => getCleanStatus(c));
  if (statuses.includes("Overdue"))      return { bg:"rgba(255,59,92,0.12)", border:"rgba(255,59,92,0.35)" };
  if (statuses.includes("Due Today"))    return { bg:"rgba(245,166,35,0.15)", border:"rgba(245,166,35,0.4)" };
  if (statuses.includes("Due Tomorrow")) return { bg:"rgba(0,212,184,0.09)", border:"rgba(0,212,184,0.4)" };
  return { bg:"transparent", border:"transparent" };
};

// ─── EXCEL IMPORT HELPER ──────────────────────────────────────────────────────
const parseExcelBookings = (data) => {
  // data = array of rows from SheetJS
  const bookings = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const id = row[0]; const guest = row[1]; const prop = row[2];
    const checkIn = row[3]; const checkOut = row[4]; const platform = row[5];
    const revenue = row[9];
    if (!id || !prop || !checkIn || !checkOut || String(id).startsWith("REF")) continue;
    if (String(id).toLowerCase().includes("summary") || !guest) continue;
    const toISO = (v) => {
      if (!v) return null;
      if (v instanceof Date) return v.toISOString().slice(0,10);
      if (typeof v === "number") {
        const d = new Date((v - 25569) * 86400 * 1000);
        return d.toISOString().slice(0,10);
      }
      return String(v).slice(0,10);
    };
    const ci = toISO(checkIn); const co = toISO(checkOut);
    if (!ci || !co || ci === co) continue;
    // Extract clean statuses from columns N onwards (index 13, 15, 17...)
    const cleanStatuses = [];
    for (let col = 14; col < row.length; col += 2) {
      const st = row[col];
      if (!st) break;
      if (String(st).includes("Completed")) cleanStatuses.push("Completed");
      else if (String(st).includes("Rescheduled")) cleanStatuses.push("Rescheduled");
    }
    bookings.push(mkBookingDirect(String(id), String(guest), String(prop), ci, co,
      String(platform||"Airbnb"), Number(revenue)||0, cleanStatuses));
  }
  return bookings;
};

// ─── CLEAN STATUS BADGE ───────────────────────────────────────────────────────
function CleanStatusBadge({ status }) {
  const icons = { "Completed":<CheckCircle size={11}/>, "Overdue":<XCircle size={11}/>,
    "Due Today":<AlertCircle size={11}/>, "Due Tomorrow":<Clock size={11}/>, "Upcoming":<Clock size={11}/>, "Rescheduled":<RefreshCw size={11}/> };
  const s = statusColors[status] || { bg:C.bg3, text:C.text2, border:C.border };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:s.bg, color:s.text,
      border:`1px solid ${s.border}30`, borderRadius:4, padding:"3px 8px", fontSize:11, fontWeight:600,
      fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>
      {icons[status]} {status}
    </span>
  );
}

// ─── CLEAN DETAIL DRAWER ─────────────────────────────────────────────────────
function CleanDetailDrawer({ booking, cleanIndex, open, onClose }) {
  const { dispatch, toast } = useApp();
  const [form, setForm] = useState({});

  useEffect(() => {
    if (booking && cleanIndex !== null) {
      const c = booking.cleans[cleanIndex];
      setForm({ status: c.status, assignedHousekeeper: c.assignedHousekeeper || "",
        completedDate: c.completedDate || "", notes: c.notes || "", rescheduledFrom: c.rescheduledFrom || "" });
    }
  }, [booking, cleanIndex]);

  if (!booking || cleanIndex === null) return null;
  const clean = booking.cleans[cleanIndex];
  const hk = ["Rebecca","Sharon","Sandy","Betty","Netsai","Tryness","Kudzai","Merjury"];

  const save = () => {
    dispatch({ type:"UPDATE_CLEAN", payload:{ bookingId:booking.id, cleanIndex, updates:{
      ...form,
      completedDate: form.status === "Completed" ? (form.completedDate || TODAY) : form.completedDate,
    }}});
    toast("Clean record updated");
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title={`Clean #${clean.cleanNumber} · ${booking.propertyName}`}>
      <div style={{ marginBottom:20, padding:"12px 16px", background:C.bg2, borderRadius:8 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><div style={{ fontSize:11, color:C.text3 }}>Due Date</div><div style={{ fontSize:14, color:C.text1, fontWeight:600, fontFamily:"'DM Mono',monospace" }}>{fmtDate(clean.dueDate)}</div></div>
          <div><div style={{ fontSize:11, color:C.text3 }}>Current Status</div><div style={{ marginTop:4 }}><CleanStatusBadge status={getCleanStatus(clean)} /></div></div>
          <div><div style={{ fontSize:11, color:C.text3 }}>Guest</div><div style={{ fontSize:13, color:C.text1 }}>{booking.guestName}</div></div>
          <div><div style={{ fontSize:11, color:C.text3 }}>Booking Nights</div><div style={{ fontSize:13, color:C.text1 }}>{booking.nights} nights</div></div>
        </div>
      </div>

      <FormRow label="Status" required>
        <Select value={form.status} onChange={v => setForm(f => ({...f, status:v}))}
          options={["Upcoming","Due Today","Due Tomorrow","Overdue","Completed","Rescheduled"]} />
      </FormRow>
      <FormRow label="Assigned Housekeeper">
        <Select value={form.assignedHousekeeper} onChange={v => setForm(f => ({...f, assignedHousekeeper:v}))}
          options={["", ...hk]} />
      </FormRow>
      {form.status === "Completed" && (
        <FormRow label="Completed Date" required>
          <Input type="date" value={form.completedDate || TODAY} onChange={v => setForm(f => ({...f, completedDate:v}))} />
        </FormRow>
      )}
      {form.status === "Rescheduled" && (
        <FormRow label="Rescheduled From (original date)">
          <Input type="date" value={form.rescheduledFrom} onChange={v => setForm(f => ({...f, rescheduledFrom:v}))} />
        </FormRow>
      )}
      <FormRow label="Notes">
        <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))}
          placeholder="Any notes about this clean..." rows={3}
          style={{ ...inputStyle, resize:"vertical" }} />
      </FormRow>

      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <Btn variant="primary" onClick={save} icon={Save}>Save Changes</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      </div>
    </Drawer>
  );
}

// ─── EXCEL IMPORT BUTTON ─────────────────────────────────────────────────────
function ExcelImportBtn() {
  const { dispatch, toast } = useApp();
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      // Find the Res & Mid-Stay Cleans sheet
      const sheetName = wb.SheetNames.find(n => n.includes("Cleans") || n.includes("Res")) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
      // Skip header rows (find first row with a real booking ID)
      const dataRows = data.filter(row => row[0] && typeof row[0] === "string" &&
        row[0].length > 3 && !row[0].includes("REF") && !row[0].includes("TOTAL") && !row[0].includes("📅") && !row[0].includes("Log"));
      const imported = parseExcelBookings(dataRows);
      if (imported.length === 0) return toast("No bookings found in file", "error");
      // Clear existing and replace
      imported.forEach(b => dispatch({ type:"ADD_BOOKING", payload:b }));
      toast(`✓ Imported ${imported.length} bookings from Excel`);
    } catch (err) {
      toast("Import failed: " + err.message, "error");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile}
        style={{ display:"none" }} />
      <Btn variant="subtle" icon={Upload} onClick={() => fileRef.current?.click()} disabled={importing}>
        {importing ? "Importing..." : "Import Excel"}
      </Btn>
    </>
  );
}

// ─── RES & CLEANS MODULE (PRIMARY) ───────────────────────────────────────────
function ResCleans() {
  const { state, dispatch, toast } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [cleanFilter, setCleanFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [expanded, setExpanded] = useState({});
  const [selectedClean, setSelectedClean] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [sortBy, setSortBy] = useState("checkIn");
  const [tab, setTab] = useState("bookings"); // bookings | calendar | alerts

  const bookings = state.bookings;

  // Derived clean alert stats
  const alertStats = useMemo(() => {
    const all = bookings.flatMap(b => b.cleans.map(c => ({ ...c, booking:b })));
    return {
      overdue: all.filter(c => getCleanStatus(c) === "Overdue").length,
      dueToday: all.filter(c => getCleanStatus(c) === "Due Today").length,
      dueTomorrow: all.filter(c => getCleanStatus(c) === "Due Tomorrow").length,
      upcoming: all.filter(c => getCleanStatus(c) === "Upcoming").length,
      completed: all.filter(c => c.status === "Completed").length,
    };
  }, [bookings]);

  const filtered = useMemo(() => {
    let r = bookings;
    if (search) r = r.filter(b => b.guestName.toLowerCase().includes(search.toLowerCase()) || b.propertyName.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "All") r = r.filter(b => b.status === statusFilter);
    if (platformFilter !== "All") r = r.filter(b => b.platform === platformFilter);
    if (cleanFilter === "Has Urgent") r = r.filter(b => b.cleans.some(c => ["Overdue","Due Today","Due Tomorrow"].includes(getCleanStatus(c))));
    if (cleanFilter === "Has Cleans") r = r.filter(b => b.cleans.length > 0);
    if (cleanFilter === "No Cleans") r = r.filter(b => b.cleans.length === 0);

    r = [...r].sort((a,b) => {
      if (sortBy === "checkIn") return a.checkIn.localeCompare(b.checkIn);
      if (sortBy === "checkOut") return a.checkOut.localeCompare(b.checkOut);
      if (sortBy === "revenue") return b.revenue - a.revenue;
      if (sortBy === "nights") return b.nights - a.nights;
      return 0;
    });
    return r;
  }, [bookings, search, statusFilter, platformFilter, cleanFilter, sortBy]);

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  // New booking form
  const [nbForm, setNbForm] = useState({ id:"", guestName:"", propId:"", checkIn:"", checkOut:"", platform:"Airbnb", revenue:"" });
  const handleAddBooking = () => {
    if (!nbForm.propId || !nbForm.checkIn || !nbForm.checkOut) return toast("Fill required fields","error");
    const booking = mkBooking(nbForm.id || `MAN-${Date.now()}`, nbForm.guestName || "Guest",
      nbForm.propId, nbForm.checkIn, nbForm.checkOut, nbForm.platform, nbForm.revenue);
    dispatch({ type:"ADD_BOOKING", payload:booking });
    toast("Booking added");
    setShowAddBooking(false);
    setNbForm({ id:"", guestName:"", propId:"", checkIn:"", checkOut:"", platform:"Airbnb", revenue:"" });
  };

  const flags = bookings.filter(b => b.notes && b.notes.includes("⚠️"));

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      {/* Alert Strip */}
      {(alertStats.overdue > 0 || alertStats.dueToday > 0) && (
        <div style={{ background:C.crimsonBg, border:`1px solid ${C.crimson}30`, borderRadius:8, padding:"10px 16px",
          marginBottom:16, display:"flex", alignItems:"center", gap:16 }}>
          <AlertTriangle size={16} color={C.crimson} />
          <span style={{ fontSize:13, color:C.crimson, fontWeight:600 }}>
            {alertStats.overdue} overdue · {alertStats.dueToday} due today — Action required
          </span>
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <Btn size="sm" variant="danger" onClick={() => setCleanFilter("Has Urgent")}>Show Urgent Only</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setCleanFilter("All")}>Clear</Btn>
          </div>
        </div>
      )}

      {/* Data Quality Flags */}
      {flags.length > 0 && (
        <div style={{ background:C.amberBg, border:`1px solid ${C.amber}30`, borderRadius:8, padding:"10px 16px",
          marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <AlertCircle size={16} color={C.amber} />
          <span style={{ fontSize:13, color:C.amber }}>{flags.length} bookings with data quality warnings</span>
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        {[
          { label:"Overdue", v:alertStats.overdue, c:C.crimson, f:"Has Urgent" },
          { label:"Due Today", v:alertStats.dueToday, c:C.amber, f:"Has Urgent" },
          { label:"Due Tomorrow", v:alertStats.dueTomorrow, c:C.amber, f:"Has Urgent" },
          { label:"Upcoming", v:alertStats.upcoming, c:C.blue, f:"Has Cleans" },
          { label:"Completed", v:alertStats.completed, c:C.green, f:"Has Cleans" },
        ].map(s => (
          <div key={s.label} onClick={() => setCleanFilter(s.f)} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8,
            padding:"10px 16px", cursor:"pointer", borderLeft:`3px solid ${s.c}`, flex:1, transition:"border-color 0.1s" }}>
            <div style={{ fontSize:11, color:C.text3, marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:s.c, fontFamily:"'DM Mono',monospace" }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:`1px solid ${C.border}` }}>
        {[["bookings","All Bookings"],["alerts","Clean Alerts"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:"8px 20px", background:"none", border:"none",
            borderBottom:`2px solid ${tab===id ? C.teal : "transparent"}`, color: tab===id ? C.teal : C.text2,
            cursor:"pointer", fontSize:13, fontWeight: tab===id ? 600 : 400, transition:"all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "alerts" ? <CleanAlerts bookings={bookings} onEdit={(b,i) => { setSelectedBooking(b); setSelectedClean(i); }} /> : (
        <>
          {/* Tomorrow's Cleans Banner */}
          {(() => {
            const tomorrowCleans = state.bookings.flatMap(b =>
              b.cleans.map((c, ci) => ({ ...c, booking:b, ci, liveStatus: getCleanStatus(c) }))
            ).filter(c => c.liveStatus === "Due Tomorrow");

            if (tomorrowCleans.length === 0) return null;
            return (
              <div style={{ background:C.bg1, border:`1px solid rgba(0,212,184,0.3)`, borderRadius:10,
                padding:"16px 20px", marginBottom:20, borderLeft:`4px solid ${C.teal}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:C.teal,
                    animation:"pulse 1.5s infinite" }} />
                  <span style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.teal }}>
                    Tomorrow's Cleans — {tomorrowCleans.length} propert{tomorrowCleans.length===1?"y":"ies"} due
                  </span>
                  <span style={{ fontSize:11, color:C.text3, marginLeft:4 }}>{fmtDate(addDays(TODAY, 1))}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:10 }}>
                  {tomorrowCleans.map((c, i) => (
                    <div key={i} style={{ background:C.bg2, borderRadius:8, padding:"12px 14px",
                      border:`1px solid rgba(0,212,184,0.15)`, cursor:"pointer" }}
                      onClick={() => { setSelectedBooking(c.booking); setSelectedClean(c.ci); }}>
                      <div style={{ fontSize:12, fontWeight:600, color:C.text1, marginBottom:4,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {c.booking.propertyName}
                      </div>
                      <div style={{ fontSize:11, color:C.text3, marginBottom:6 }}>
                        {c.booking.guestName} · Clean #{c.cleanNumber}
                      </div>
                      <div style={{ display:"flex", gap:6, alignItems:"center", justifyContent:"space-between" }}>
                        <Badge label={c.booking.platform} size="xs" />
                        {c.assignedHousekeeper
                          ? <span style={{ fontSize:11, color:C.teal }}>👤 {c.assignedHousekeeper}</span>
                          : <span style={{ fontSize:11, color:C.amber }}>⚠️ Unassigned</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Colour Legend */}
          <div style={{ display:"flex", gap:12, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:C.text3, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>Row colour:</span>
            {[
              { color:"rgba(255,59,92,0.18)", border:C.crimson, label:"🔴 Overdue" },
              { color:"rgba(245,166,35,0.2)", border:C.amber, label:"🟡 Due Today" },
              { color:"rgba(0,212,184,0.12)", border:"rgba(0,212,184,0.5)", label:"🩵 Due Tomorrow" },
              { color:"transparent", border:C.border, label:"⬜ Upcoming" },
            ].map(s => (
              <div key={s.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:24, height:14, borderRadius:3, background:s.color, border:`1px solid ${s.border}` }} />
                <span style={{ fontSize:11, color:C.text2 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search guest, property, ID..." />
            <Select value={statusFilter} onChange={setStatusFilter}
              options={["All","In-House","Upcoming","Checked Out"]} style={{ width:140 }} />
            <Select value={platformFilter} onChange={setPlatformFilter}
              options={["All","Airbnb","Booking.com","Direct"]} style={{ width:140 }} />
            <Select value={cleanFilter} onChange={setCleanFilter}
              options={["All","Has Urgent","Has Cleans","No Cleans"]} style={{ width:140 }} />
            <Select value={sortBy} onChange={setSortBy}
              options={[{value:"checkIn",label:"Sort: Check-in"},{value:"checkOut",label:"Sort: Check-out"},{value:"revenue",label:"Sort: Revenue"},{value:"nights",label:"Sort: Nights"}]} style={{ width:160 }} />
            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              <ExcelImportBtn />
              <Btn variant="primary" icon={Plus} onClick={() => setShowAddBooking(true)}>Add Booking</Btn>
            </div>
          </div>

          {/* Count */}
          <div style={{ fontSize:12, color:C.text3, marginBottom:12 }}>Showing {filtered.length} of {bookings.length} bookings</div>

          {/* Table */}
          <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"180px 140px 100px 100px 70px 80px 100px 120px 40px",
              padding:"10px 16px", borderBottom:`1px solid ${C.border}`, background:C.bg2 }}>
              {["Property","Guest","Check-in","Check-out","Nights","Revenue","Platform","Status",""].map(h => (
                <div key={h} style={{ fontSize:11, color:C.text3, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>{h}</div>
              ))}
            </div>
            {filtered.length === 0 && <EmptyState icon={Calendar} title="No bookings found" sub="Adjust your filters" />}
            {filtered.map(b => {
              const isExp = expanded[b.id];
              const hasFlag = b.notes && b.notes.includes("⚠️");
              const urgentClean = b.cleans.some(c => ["Overdue","Due Today"].includes(getCleanStatus(c)));
              return (
                <div key={b.id}>
                  {(() => {
                    const rowColor = getBookingRowColor(b);
                    return (
                  <div onClick={() => toggleExpand(b.id)} style={{ display:"grid", gridTemplateColumns:"180px 140px 100px 100px 70px 80px 100px 120px 40px",
                    padding:"12px 16px", borderBottom:`1px solid ${C.border}`, cursor:"pointer",
                    background: rowColor.bg,
                    borderLeft: rowColor.border !== "transparent" ? `3px solid ${rowColor.border}` : "3px solid transparent",
                    transition:"background 0.1s", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:13, color:C.text1, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.propertyName}</div>
                      <div style={{ fontSize:10, color:C.text3, fontFamily:"'DM Mono',monospace" }}>{b.id}</div>
                    </div>
                    <div style={{ fontSize:12, color: b.guestName==="Guest" ? C.amber : C.text1 }}>
                      {b.guestName === "Guest" ? "⚠️ Guest" : b.guestName}
                    </div>
                    <div style={{ fontSize:12, color:C.text2, fontFamily:"'DM Mono',monospace" }}>{fmtShort(b.checkIn)}</div>
                    <div style={{ fontSize:12, color:C.text2, fontFamily:"'DM Mono',monospace" }}>{fmtShort(b.checkOut)}</div>
                    <div style={{ fontSize:12, color:C.text2, fontFamily:"'DM Mono',monospace" }}>{b.nights}</div>
                    <div style={{ fontSize:12, color: b.revenue === 0 ? C.amber : C.teal, fontFamily:"'DM Mono',monospace" }}>
                      {b.revenue === 0 ? "⚠️ —" : `R ${(b.revenue/1000).toFixed(1)}k`}
                    </div>
                    <Badge label={b.platform} size="xs" />
                    <Badge label={b.status} size="xs" />
                    <div style={{ color:C.text3 }}>{isExp ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</div>
                  </div>
                    );
                  })()}

                  {isExp && (
                    <div style={{ padding:"16px 24px 20px", background:C.bg0, borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:16 }}>
                        <div><div style={{ fontSize:11, color:C.text3 }}>Check-in</div><div style={{ fontSize:13, color:C.text1 }}>{fmtDate(b.checkIn)}</div></div>
                        <div><div style={{ fontSize:11, color:C.text3 }}>Check-out</div><div style={{ fontSize:13, color:C.text1 }}>{fmtDate(b.checkOut)}</div></div>
                        <div><div style={{ fontSize:11, color:C.text3 }}>Revenue</div><div style={{ fontSize:13, color:C.teal, fontFamily:"'DM Mono',monospace" }}>{fmtCurr(b.revenue)}</div></div>
                      </div>
                      {b.notes && <div style={{ fontSize:12, color:C.amber, marginBottom:16 }}>{b.notes}</div>}

                      {b.cleans.length === 0 ? (
                        <div style={{ fontSize:12, color:C.text3, fontStyle:"italic" }}>No mid-stay cleans required (stay under 7 nights)</div>
                      ) : (
                        <>
                          <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginBottom:10 }}>
                            Mid-Stay Cleans ({b.cleans.length} scheduled · {Math.floor(b.nights / 7)} = ⌊{b.nights} ÷ 7⌋)
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            {b.cleans.map((c, ci) => {
                              const liveStatus = getCleanStatus(c);
                              return (
                                <div key={ci} style={{ display:"grid", gridTemplateColumns:"80px 100px 140px 140px 120px 1fr auto",
                                  gap:12, alignItems:"center", padding:"10px 14px", background:C.bg1,
                                  borderRadius:7, border:`1px solid ${c.status==="Completed" ? C.green+"20" : liveStatus==="Overdue" ? C.crimson+"30" : C.border}` }}>
                                  <div style={{ fontSize:12, color:C.text3 }}>Clean #{c.cleanNumber}</div>
                                  <CleanStatusBadge status={liveStatus} />
                                  <div style={{ fontSize:12, color:C.text2 }}>Due: <span style={{ fontFamily:"'DM Mono',monospace" }}>{fmtDate(c.dueDate)}</span></div>
                                  {c.completedDate
                                    ? <div style={{ fontSize:12, color:C.green }}>✓ {fmtDate(c.completedDate)}</div>
                                    : <div style={{ fontSize:12, color:C.text3 }}>Not yet completed</div>}
                                  <div style={{ fontSize:12, color:C.text2 }}>{c.assignedHousekeeper || <span style={{ color:C.text3 }}>Unassigned</span>}</div>
                                  <div style={{ fontSize:11, color:C.text3, fontStyle:"italic" }}>{c.notes}</div>
                                  <Btn size="sm" variant="subtle" icon={Edit} onClick={() => { setSelectedBooking(b); setSelectedClean(ci); }}>Edit</Btn>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Clean Detail Drawer */}
      <CleanDetailDrawer booking={selectedBooking} cleanIndex={selectedClean} open={selectedClean !== null}
        onClose={() => { setSelectedClean(null); setSelectedBooking(null); }} />

      {/* Add Booking Modal */}
      <Modal open={showAddBooking} onClose={() => setShowAddBooking(false)} title="Add New Booking" width={520}>
        <FormRow label="Booking ID (optional)"><Input value={nbForm.id} onChange={v => setNbForm(f => ({...f, id:v}))} placeholder="e.g. AIRBNB123 or leave blank" /></FormRow>
        <FormRow label="Guest Name"><Input value={nbForm.guestName} onChange={v => setNbForm(f => ({...f, guestName:v}))} placeholder="Full name" /></FormRow>
        <FormRow label="Property" required>
          <Select value={nbForm.propId} onChange={v => setNbForm(f => ({...f, propId:v}))}
            options={["", ...state.properties.map(p => ({ value:p.id, label:`${p.id} · ${p.name}` }))]} />
        </FormRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormRow label="Check-in" required><Input type="date" value={nbForm.checkIn} onChange={v => setNbForm(f => ({...f, checkIn:v}))} /></FormRow>
          <FormRow label="Check-out" required><Input type="date" value={nbForm.checkOut} onChange={v => setNbForm(f => ({...f, checkOut:v}))} /></FormRow>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormRow label="Platform">
            <Select value={nbForm.platform} onChange={v => setNbForm(f => ({...f, platform:v}))} options={["Airbnb","Booking.com","Direct"]} />
          </FormRow>
          <FormRow label="Revenue (ZAR)"><Input type="number" value={nbForm.revenue} onChange={v => setNbForm(f => ({...f, revenue:v}))} placeholder="0.00" /></FormRow>
        </div>
        {nbForm.checkIn && nbForm.checkOut && daysBetween(nbForm.checkIn, nbForm.checkOut) >= 7 && (
          <div style={{ background:C.tealBg, border:`1px solid ${C.teal}30`, borderRadius:6, padding:"10px 14px", marginBottom:16 }}>
            <div style={{ fontSize:12, color:C.teal }}>
              ✓ {daysBetween(nbForm.checkIn, nbForm.checkOut)} nights → {Math.floor(daysBetween(nbForm.checkIn, nbForm.checkOut)/7)} mid-stay clean(s) will be scheduled
            </div>
          </div>
        )}
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="primary" onClick={handleAddBooking} icon={Plus}>Add Booking</Btn>
          <Btn variant="ghost" onClick={() => setShowAddBooking(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

function CleanAlerts({ bookings, onEdit }) {
  const allCleans = bookings.flatMap(b =>
    b.cleans.map((c, ci) => ({ ...c, booking:b, ci, liveStatus: getCleanStatus(c) }))
  ).filter(c => c.liveStatus !== "Completed" && c.liveStatus !== "Upcoming" || c.liveStatus === "Upcoming");

  const grouped = { Overdue:[], "Due Today":[], "Due Tomorrow":[], Upcoming:[] };
  allCleans.forEach(c => { if (grouped[c.liveStatus]) grouped[c.liveStatus].push(c); });

  return (
    <div>
      {Object.entries(grouped).filter(([,v]) => v.length > 0).map(([status, cleans]) => (
        <div key={status} style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <CleanStatusBadge status={status} />
            <span style={{ fontSize:12, color:C.text3 }}>{cleans.length} clean{cleans.length>1?"s":""}</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {cleans.map((c,i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 120px 100px 120px 100px auto",
                gap:12, alignItems:"center", padding:"12px 16px", background:C.bg1,
                borderRadius:8, border:`1px solid ${C.border}`, borderLeft:`3px solid ${statusColors[status]?.text || C.border}` }}>
                <div>
                  <div style={{ fontSize:13, color:C.text1, fontWeight:500 }}>{c.booking.propertyName}</div>
                  <div style={{ fontSize:11, color:C.text3 }}>{c.booking.guestName} · Clean #{c.cleanNumber}</div>
                </div>
                <div style={{ fontSize:12, color:C.text2, fontFamily:"'DM Mono',monospace" }}>{fmtDate(c.dueDate)}</div>
                <Badge label={c.booking.platform} size="xs" />
                <div style={{ fontSize:12, color:C.text2 }}>{c.assignedHousekeeper || <span style={{ color:C.amber }}>Unassigned</span>}</div>
                <div style={{ fontSize:11, color:C.text3 }}>Night {(c.cleanNumber)*7} of {c.booking.nights}</div>
                <Btn size="sm" variant="subtle" icon={Edit} onClick={() => onEdit(c.booking, c.ci)}>Update</Btn>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


// ─── DAILY OPS ────────────────────────────────────────────────────────────────
const OPS_TEMPLATE = [
  { shift:"Morning (06:00–12:00)", tasks:["Check yesterday's complaints for follow-up","Confirm all check-in properties are clean-ready","Dispatch housekeepers for morning checkouts","Submit daily report to manager","Check all property access codes are working","Verify WiFi routers are online for new check-ins"] },
  { shift:"Afternoon (12:00–18:00)", tasks:["Confirm all check-ins completed — message guests","Chase any outstanding mid-stay clean confirmations","Escalate any maintenance issues raised by guests","Update revenue tracker with new bookings","Respond to all guest messages within 30 min"] },
  { shift:"Evening (18:00–22:00)", tasks:["Final guest comms check — no unanswered messages","Confirm tomorrow's check-ins and housekeeping roster","Log daily ops report in Daily History","Confirm emergency contact list is accessible"] },
];

function DailyOps() {
  const { state, dispatch, toast } = useApp();
  const [date, setDate] = useState(TODAY);
  const opsKey = date;
  const ops = state.dailyOps[opsKey] || {};

  const toggle = (shift, task) => {
    const key = `${shift}::${task}`;
    const updated = { ...ops, [key]: !ops[key] };
    dispatch({ type:"UPDATE_DAILY_OPS", date:opsKey, payload:updated });
  };

  const allTasks = OPS_TEMPLATE.flatMap(s => s.tasks).length;
  const completed = Object.values(ops).filter(Boolean).length;

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <SectionTitle>Daily Ops Checklist</SectionTitle>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <Input type="date" value={date} onChange={setDate} style={{ width:160 }} />
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.teal }}>{completed}/{allTasks} tasks</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height:4, background:C.border, borderRadius:2, marginBottom:24, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${(completed/allTasks)*100}%`, background:C.teal, borderRadius:2, transition:"width 0.3s" }} />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {OPS_TEMPLATE.map(({ shift, tasks }) => (
          <Card key={shift}>
            <div style={{ fontSize:13, fontWeight:700, color:C.amber, marginBottom:14,
              fontFamily:"'DM Mono',monospace" }}>{shift}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {tasks.map(task => {
                const key = `${shift}::${task}`;
                const done = ops[key];
                return (
                  <div key={task} onClick={() => toggle(shift, task)}
                    style={{ display:"flex", gap:10, alignItems:"center", cursor:"pointer", padding:"6px 0" }}>
                    <div style={{ width:20, height:20, borderRadius:4, border:`2px solid ${done ? C.teal : C.border}`,
                      background: done ? C.teal : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
                      {done && <Check size={12} color="#000" />}
                    </div>
                    <span style={{ fontSize:13, color: done ? C.text3 : C.text1, textDecoration: done ? "line-through" : "none", transition:"all 0.15s" }}>{task}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── FINANCIALS ───────────────────────────────────────────────────────────────
function Financials() {
  const { state } = useApp();
  const [period, setPeriod] = useState("month");

  const byMonth = useMemo(() => {
    const months = {};
    state.bookings.forEach(b => {
      const m = b.checkIn.slice(0,7);
      if (!months[m]) months[m] = { revenue:0, bookings:0, nights:0 };
      months[m].revenue += b.revenue;
      months[m].bookings += 1;
      months[m].nights += b.nights;
    });
    return Object.entries(months).sort().map(([month, v]) => ({ month: month.slice(5) + " '" + month.slice(2,4), ...v }));
  }, [state.bookings]);

  const total = state.bookings.reduce((s,b) => s + b.revenue, 0);
  const mayRevenue = state.bookings.filter(b => b.checkIn.startsWith("2026-05")).reduce((s,b) => s + b.revenue, 0);
  const airbnbRev = state.bookings.filter(b => b.platform === "Airbnb").reduce((s,b) => s + b.revenue, 0);
  const bookingComRev = state.bookings.filter(b => b.platform === "Booking.com").reduce((s,b) => s + b.revenue, 0);
  const directRev = state.bookings.filter(b => b.platform === "Direct").reduce((s,b) => s + b.revenue, 0);

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <SectionTitle>Financials</SectionTitle>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="Total Revenue (All)" value={`R ${(total/1000).toFixed(0)}k`} color={C.teal} icon={DollarSign} />
        <KPICard label="May 2026" value={`R ${(mayRevenue/1000).toFixed(0)}k`} color={C.amber} icon={TrendingUp} />
        <KPICard label="Airbnb Revenue" value={`R ${(airbnbRev/1000).toFixed(0)}k`} color="#FF5A5F" icon={DollarSign} />
        <KPICard label="Booking.com" value={`R ${(bookingComRev/1000).toFixed(0)}k`} color="#0065DD" icon={DollarSign} />
        <KPICard label="Direct Revenue" value={`R ${(directRev/1000).toFixed(0)}k`} color={C.teal} icon={DollarSign} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:16 }}>Revenue by Month</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fill:C.text3, fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:C.text3, fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmtCurr(v)} contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:6, fontSize:12 }} />
              <Bar dataKey="revenue" fill={C.teal} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:16 }}>Platform Split</div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[{ label:"Airbnb", v:airbnbRev, c:"#FF5A5F" },{ label:"Booking.com", v:bookingComRev, c:"#0065DD" },{ label:"Direct", v:directRev, c:C.teal }].map(p => (
              <div key={p.label}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                  <span style={{ color:C.text2 }}>{p.label}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", color:p.c }}>{fmtCurr(p.v)}</span>
                </div>
                <div style={{ height:5, background:C.border, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${total ? (p.v/total)*100 : 0}%`, background:p.c, borderRadius:3 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:11, color:C.text3, marginBottom:8 }}>By Booking</div>
            {state.bookings.sort((a,b) => b.revenue - a.revenue).slice(0,5).map(b => (
              <div key={b.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}20`, fontSize:12 }}>
                <span style={{ color:C.text2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:160 }}>{b.propertyName}</span>
                <span style={{ fontFamily:"'DM Mono',monospace", color:C.teal, flexShrink:0 }}>R {(b.revenue/1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── ADVANCED METRICS ─────────────────────────────────────────────────────────
function AdvancedMetrics() {
  const { state } = useApp();
  const bookings = state.bookings;
  const totalNights = bookings.reduce((s,b) => s + b.nights, 0);
  const avgNights = (totalNights / bookings.length).toFixed(1);
  const totalRevenue = bookings.reduce((s,b) => s + b.revenue, 0);
  const adr = (totalRevenue / totalNights).toFixed(0);
  const occupiedPropDays = new Set(bookings.flatMap(b => {
    const days = []; let d = b.checkIn;
    while (d < b.checkOut) { days.push(`${b.propId}::${d}`); d = addDays(d,1); }
    return days;
  })).size;
  const totalPropDays = 50 * 150; // approx
  const occupancyRate = ((occupiedPropDays / totalPropDays) * 100).toFixed(1);

  const byArea = useMemo(() => {
    const areas = {};
    bookings.forEach(b => {
      const prop = state.properties.find(p => p.id === b.propId);
      const area = prop?.area || "Unknown";
      if (!areas[area]) areas[area] = { revenue:0, bookings:0 };
      areas[area].revenue += b.revenue;
      areas[area].bookings += 1;
    });
    return Object.entries(areas).sort((a,b) => b[1].revenue - a[1].revenue).slice(0,6)
      .map(([area, v]) => ({ area, ...v }));
  }, [bookings, state.properties]);

  const occupancyByMonth = REVENUE_CALENDAR.map(m => ({ ...m }));

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <SectionTitle>Advanced Metrics</SectionTitle>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="Portfolio Occupancy" value={`${occupancyRate}%`} color={C.teal} icon={Percent} />
        <KPICard label="Avg Booking Length" value={`${avgNights} nights`} color={C.amber} icon={Clock} />
        <KPICard label="ADR (Avg Daily Rate)" value={`R ${Number(adr).toLocaleString()}`} color={C.blue} icon={DollarSign} />
        <KPICard label="RevPAR" value={`R ${Math.round(Number(adr)*Number(occupancyRate)/100).toLocaleString()}`} color={C.purple} icon={TrendingUp} />
        <KPICard label="Total Bookings" value={bookings.length} color={C.teal} icon={Hash} />
        <KPICard label="Mid-Stay Cleans" value={bookings.flatMap(b => b.cleans).length} color={C.amber} icon={Activity} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:16 }}>Occupancy by Month (%)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={occupancyByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fill:C.text3, fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:C.text3, fontSize:11 }} axisLine={false} tickLine={false} domain={[40,100]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={v => `${v}%`} contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:6, fontSize:12 }} />
              <Line type="monotone" dataKey="occupancy" stroke={C.teal} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:16 }}>Revenue by Area</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byArea} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" tick={{ fill:C.text3, fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="area" tick={{ fill:C.text2, fontSize:11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip formatter={v => fmtCurr(v)} contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:6, fontSize:12 }} />
              <Bar dataKey="revenue" fill={C.amber} radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─── REVENUE STRATEGY ─────────────────────────────────────────────────────────
function RevenueStrategy() {
  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <SectionTitle>Revenue Strategy</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:16 }}>ADR by Month (2026 Plan)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={REVENUE_CALENDAR}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fill:C.text3, fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:C.text3, fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `R${v}`} />
              <Tooltip formatter={v => `R ${v}`} contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:6, fontSize:12 }} />
              <Bar dataKey="adr" fill={C.teal} radius={[4,4,0,0]} name="ADR" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:16 }}>Seasonality Guide</div>
          {REVENUE_CALENDAR.map(m => (
            <div key={m.month} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 0", borderBottom:`1px solid ${C.border}10` }}>
              <span style={{ fontSize:12, color:C.text2, width:32 }}>{m.month}</span>
              <div style={{ flex:1, height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${m.occupancy}%`, background: m.occupancy > 80 ? C.teal : m.occupancy > 65 ? C.amber : C.blue, borderRadius:3 }} />
              </div>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.text3, width:36 }}>{m.occupancy}%</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.teal, width:50 }}>R{m.adr}</span>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:12 }}>Pricing Recommendations</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          {[
            { season:"Peak Season", months:"Dec–Jan, School Hols", rec:"Increase ADR 25–30%. Min 3-night stay. No discounts.", color:C.crimson },
            { season:"High Season", months:"Mar–May, Sep–Nov", rec:"Maintain listed rates. 7-night discount 5%. Flexible cancellation.", color:C.amber },
            { season:"Low Season", months:"Jun–Aug", rec:"Offer 10–15% weekly discounts. Accept shorter stays. Promote locals.", color:C.blue },
          ].map(r => (
            <div key={r.season} style={{ background:C.bg2, borderRadius:8, padding:"14px 16px", borderLeft:`3px solid ${r.color}` }}>
              <div style={{ fontSize:12, fontWeight:700, color:r.color, marginBottom:4 }}>{r.season}</div>
              <div style={{ fontSize:11, color:C.text3, marginBottom:8 }}>{r.months}</div>
              <div style={{ fontSize:12, color:C.text1 }}>{r.rec}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── INCIDENTS & COMPLAINTS (COMBINED) ───────────────────────────────────────
function IncidentRegister() {
  const { state, dispatch, toast } = useApp();
  const [tab, setTab] = useState("incidents");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddComp, setShowAddComp] = useState(false);
  const [form, setForm] = useState({ propertyId:"", type:"Cleaning Issue", description:"", guest:"", severity:"Medium", date:TODAY });
  const [compForm, setCompForm] = useState({ propertyId:"", type:"Cleanliness", description:"", guestName:"", date:TODAY });

  const handleAddIncident = () => {
    if (!form.propertyId || !form.description) return toast("Fill required fields","error");
    const prop = state.properties.find(p => p.id === form.propertyId);
    const id = `INC-${String(state.incidents.length + 1).padStart(3,"0")}`;
    dispatch({ type:"ADD_INCIDENT", payload:{ id, propertyName:prop?.name || form.propertyId, status:"Open", resolution:"", resolvedDate:null, ...form }});
    toast("Incident logged"); setShowAdd(false);
    setForm({ propertyId:"", type:"Cleaning Issue", description:"", guest:"", severity:"Medium", date:TODAY });
  };

  const handleAddComplaint = () => {
    if (!compForm.propertyId || !compForm.description) return toast("Fill required fields","error");
    const prop = state.properties.find(p => p.id === compForm.propertyId);
    const id = `CMP-${String(state.complaints.length + 1).padStart(3,"0")}`;
    dispatch({ type:"ADD_COMPLAINT", payload:{ id, propertyName:prop?.name || compForm.propertyId, status:"Open", resolvedDate:null, ...compForm }});
    toast("Complaint logged"); setShowAddComp(false);
    setCompForm({ propertyId:"", type:"Cleanliness", description:"", guestName:"", date:TODAY });
  };

  const resolveIncident = (inc) => {
    const resolution = prompt("Enter resolution details:");
    if (!resolution) return;
    dispatch({ type:"UPDATE_INCIDENT", payload:{ id:inc.id, status:"Resolved", resolution, resolvedDate:TODAY }});
    toast("Incident resolved");
  };

  const resolveComplaint = (c) => {
    dispatch({ type:"UPDATE_COMPLAINT", payload:{ id:c.id, status:"Resolved", resolvedDate:TODAY }});
    toast("Complaint resolved");
  };

  const totalOpen = state.incidents.filter(i => i.status==="Open").length + state.complaints.filter(c => c.status==="Open").length;

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <SectionTitle>Incidents & Complaints</SectionTitle>
        <Btn variant="primary" icon={Plus} onClick={() => tab==="incidents" ? setShowAdd(true) : setShowAddComp(true)}>
          Log {tab === "incidents" ? "Incident" : "Complaint"}
        </Btn>
      </div>

      {/* KPI Row */}
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <KPICard label="Total Open" value={totalOpen} color={totalOpen > 0 ? C.crimson : C.green} icon={AlertCircle} />
        <KPICard label="Open Incidents" value={state.incidents.filter(i=>i.status==="Open").length} color={C.crimson} />
        <KPICard label="Open Complaints" value={state.complaints.filter(c=>c.status==="Open").length} color={C.amber} />
        <KPICard label="Resolved (All)" value={state.incidents.filter(i=>i.status==="Resolved").length + state.complaints.filter(c=>c.status==="Resolved").length} color={C.green} />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:`1px solid ${C.border}` }}>
        {[["incidents","Incidents"],["complaints","Complaints"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:"8px 24px", background:"none", border:"none",
            borderBottom:`2px solid ${tab===id ? C.teal : "transparent"}`, color: tab===id ? C.teal : C.text2,
            cursor:"pointer", fontSize:13, fontWeight: tab===id ? 600 : 400, transition:"all 0.15s" }}>
            {label} <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, marginLeft:4,
              color: id==="incidents" ? C.crimson : C.amber }}>
              ({id==="incidents" ? state.incidents.length : state.complaints.length})
            </span>
          </button>
        ))}
      </div>

      {/* Incidents Tab */}
      {tab === "incidents" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {state.incidents.length === 0 && <EmptyState icon={AlertTriangle} title="No incidents logged" />}
          {state.incidents.map(inc => (
            <Card key={inc.id} hover>
              <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.text3 }}>{inc.id}</span>
                    <Badge label={inc.status} />
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:4, fontWeight:600,
                      background: inc.severity==="High" ? C.crimsonBg : inc.severity==="Medium" ? C.amberBg : C.blueBg,
                      color: inc.severity==="High" ? C.crimson : inc.severity==="Medium" ? C.amber : C.blue }}>
                      {inc.severity}
                    </span>
                    <span style={{ fontSize:12, color:C.text3 }}>{inc.type}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text1, marginBottom:4 }}>{inc.propertyName}</div>
                  <div style={{ fontSize:13, color:C.text2, marginBottom:6 }}>{inc.description}</div>
                  <div style={{ display:"flex", gap:16, fontSize:11, color:C.text3 }}>
                    <span>Guest: {inc.guest || "—"}</span>
                    <span>Date: {fmtDate(inc.date)}</span>
                    {inc.resolvedDate && <span>Resolved: {fmtDate(inc.resolvedDate)}</span>}
                  </div>
                  {inc.resolution && <div style={{ marginTop:8, fontSize:12, color:C.green, padding:"8px 12px", background:C.greenBg, borderRadius:6 }}>✓ {inc.resolution}</div>}
                </div>
                {inc.status === "Open" && <Btn size="sm" variant="primary" onClick={() => resolveIncident(inc)}>Resolve</Btn>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Complaints Tab */}
      {tab === "complaints" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {state.complaints.length === 0 && <EmptyState icon={MessageSquare} title="No complaints logged" />}
          {state.complaints.map(c => (
            <Card key={c.id} hover>
              <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.text3 }}>{c.id}</span>
                    <Badge label={c.status} />
                    <span style={{ fontSize:12, color:C.text3 }}>{c.type}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text1, marginBottom:4 }}>{c.propertyName}</div>
                  <div style={{ fontSize:13, color:C.text2, marginBottom:6 }}>{c.description}</div>
                  <div style={{ fontSize:11, color:C.text3 }}>Guest: {c.guestName || "—"} · {fmtDate(c.date)}</div>
                </div>
                {c.status === "Open" && <Btn size="sm" variant="primary" onClick={() => resolveComplaint(c)}>Resolve</Btn>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Incident Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Incident">
        <FormRow label="Property" required>
          <Select value={form.propertyId} onChange={v => setForm(f => ({...f, propertyId:v}))}
            options={["", ...state.properties.map(p => ({ value:p.id, label:`${p.id} · ${p.name}` }))]} />
        </FormRow>
        <FormRow label="Date"><Input type="date" value={form.date} onChange={v => setForm(f => ({...f, date:v}))} /></FormRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormRow label="Type">
            <Select value={form.type} onChange={v => setForm(f => ({...f, type:v}))}
              options={["Cleaning Issue","Guest Complaint","Security","Damage","Access Issue","Noise","Other"]} />
          </FormRow>
          <FormRow label="Severity">
            <Select value={form.severity} onChange={v => setForm(f => ({...f, severity:v}))} options={["High","Medium","Low"]} />
          </FormRow>
        </div>
        <FormRow label="Guest Name"><Input value={form.guest} onChange={v => setForm(f => ({...f, guest:v}))} /></FormRow>
        <FormRow label="Description" required>
          <textarea value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} rows={3} style={{ ...inputStyle, resize:"vertical" }} />
        </FormRow>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="danger" onClick={handleAddIncident} icon={AlertTriangle}>Log Incident</Btn>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
        </div>
      </Modal>

      {/* Add Complaint Modal */}
      <Modal open={showAddComp} onClose={() => setShowAddComp(false)} title="Log Complaint">
        <FormRow label="Property" required>
          <Select value={compForm.propertyId} onChange={v => setCompForm(f => ({...f, propertyId:v}))}
            options={["", ...state.properties.map(p => ({ value:p.id, label:`${p.id} · ${p.name}` }))]} />
        </FormRow>
        <FormRow label="Date"><Input type="date" value={compForm.date} onChange={v => setCompForm(f => ({...f, date:v}))} /></FormRow>
        <FormRow label="Type">
          <Select value={compForm.type} onChange={v => setCompForm(f => ({...f, type:v}))}
            options={["Cleanliness","Noise","Amenities","Communication","Damage","Other"]} />
        </FormRow>
        <FormRow label="Guest Name"><Input value={compForm.guestName} onChange={v => setCompForm(f => ({...f, guestName:v}))} /></FormRow>
        <FormRow label="Description" required>
          <textarea value={compForm.description} onChange={e => setCompForm(f => ({...f, description:e.target.value}))} rows={3} style={{ ...inputStyle, resize:"vertical" }} />
        </FormRow>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="amber" onClick={handleAddComplaint} icon={MessageSquare}>Log Complaint</Btn>
          <Btn variant="ghost" onClick={() => setShowAddComp(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}


// ─── REVIEWS ─────────────────────────────────────────────────────────────────
function Reviews() {
  const { state, dispatch, toast } = useApp();
  const [tab, setTab] = useState("pending");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [form, setForm] = useState({ rating:5, comment:"", platform:"Airbnb", date:TODAY });

  // All checked-out bookings from Res & Cleans
  const checkedOut = state.bookings.filter(b => b.status === "Checked Out" || daysBetween(b.checkOut, TODAY) >= 0);

  // Which bookings already have a review
  const reviewedBookingIds = new Set(state.reviews.map(r => r.bookingId).filter(Boolean));

  // Pending = checked out but no review yet
  const pending = checkedOut.filter(b => !reviewedBookingIds.has(b.id));

  const avgRating = state.reviews.length
    ? (state.reviews.reduce((s,r) => s + r.rating, 0) / state.reviews.length).toFixed(1)
    : "—";

  const openAddReview = (booking) => {
    setSelectedBooking(booking);
    setForm({ rating:5, comment:"", platform: booking.platform || "Airbnb", date:TODAY });
    setShowAdd(true);
  };

  const handleAdd = () => {
    if (!selectedBooking) return;
    const id = `REV-${String(state.reviews.length + 1).padStart(3,"0")}`;
    dispatch({ type:"ADD_REVIEW", payload:{
      id, bookingId: selectedBooking.id,
      propertyId: selectedBooking.propId,
      propertyName: selectedBooking.propertyName,
      guestName: selectedBooking.guestName,
      date: form.date,
      rating: Number(form.rating),
      platform: form.platform,
      comment: form.comment,
      responded: false,
    }});
    toast("Review added");
    setShowAdd(false);
    setSelectedBooking(null);
  };

  const StarRating = ({ value, onChange }) => (
    <div style={{ display:"flex", gap:6, marginBottom:4 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={() => onChange(n)} style={{ fontSize:28, cursor:"pointer",
          color: n <= value ? C.amber : C.border, transition:"color 0.1s" }}>★</span>
      ))}
      <span style={{ fontSize:14, color:C.text2, alignSelf:"center", marginLeft:8 }}>{value} / 5</span>
    </div>
  );

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <SectionTitle>Reviews</SectionTitle>

      {/* KPIs */}
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <KPICard label="Avg Rating" value={state.reviews.length ? `${avgRating} ⭐` : "—"} color={C.amber} />
        <KPICard label="Total Reviews" value={state.reviews.length} color={C.teal} />
        <KPICard label="Pending Reviews" value={pending.length} color={pending.length > 0 ? C.crimson : C.green} />
        <KPICard label="5-Star" value={state.reviews.filter(r => r.rating === 5).length} color={C.green} />
        <KPICard label="Unresponded" value={state.reviews.filter(r => !r.responded).length} color={C.blue} />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
        {[["pending","Pending Reviews"],["all","All Reviews"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:"8px 24px", background:"none", border:"none",
            borderBottom:`2px solid ${tab===id ? C.teal : "transparent"}`, color: tab===id ? C.teal : C.text2,
            cursor:"pointer", fontSize:13, fontWeight: tab===id ? 600 : 400 }}>
            {label}
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, marginLeft:6,
              color: id==="pending" ? C.crimson : C.text3 }}>
              ({id==="pending" ? pending.length : state.reviews.length})
            </span>
          </button>
        ))}
      </div>

      {/* Pending Tab — auto-populated from Res & Cleans */}
      {tab === "pending" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {pending.length === 0 && <EmptyState icon={Star} title="All caught up!" sub="No pending reviews — every checkout has been reviewed." />}
          {pending.map(b => (
            <Card key={b.id} hover>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
                    <Badge label={b.platform} size="xs" />
                    <span style={{ fontSize:11, color:C.text3, fontFamily:"'DM Mono',monospace" }}>{b.id}</span>
                    <span style={{ fontSize:11, color:C.text3 }}>Checked out {fmtDate(b.checkOut)}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text1 }}>{b.propertyName}</div>
                  <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{b.guestName} · {b.nights} nights</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:11, color:C.amber }}>⭐ Awaiting review</span>
                  <Btn variant="primary" size="sm" icon={Plus} onClick={() => openAddReview(b)}>Add Review</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* All Reviews Tab */}
      {tab === "all" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {state.reviews.length === 0 && <EmptyState icon={Star} title="No reviews yet" sub="Reviews will appear here once added." />}
          {[...state.reviews].sort((a,b) => b.date.localeCompare(a.date)).map(r => (
            <Card key={r.id} hover>
              <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:18, letterSpacing:2 }}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:C.amber, fontWeight:600 }}>{r.rating}/5</span>
                    <Badge label={r.platform} size="xs" />
                    <span style={{ fontSize:11, color:C.text3 }}>{fmtDate(r.date)}</span>
                    {!r.responded && <Badge label="Overdue" size="xs" />}
                    {r.responded && <span style={{ fontSize:11, color:C.green }}>✓ Responded</span>}
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text1, marginBottom:2 }}>{r.propertyName}</div>
                  <div style={{ fontSize:12, color:C.text3, marginBottom:6 }}>{r.guestName}</div>
                  {r.comment && <div style={{ fontSize:13, color:C.text2, fontStyle:"italic", padding:"8px 12px", background:C.bg2, borderRadius:6 }}>"{r.comment}"</div>}
                </div>
                {!r.responded && (
                  <Btn size="sm" variant="subtle" onClick={() => {
                    dispatch({ type:"UPDATE_REVIEW", payload:{ id:r.id, responded:true }});
                    toast("Marked as responded");
                  }}>Mark Responded</Btn>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Review Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Guest Review" width={500}>
        {selectedBooking && (
          <div style={{ background:C.bg2, borderRadius:8, padding:"12px 16px", marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{selectedBooking.propertyName}</div>
            <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{selectedBooking.guestName} · {fmtDate(selectedBooking.checkIn)} → {fmtDate(selectedBooking.checkOut)}</div>
          </div>
        )}
        <FormRow label="Guest Star Rating" required>
          <div style={{ display:"flex", gap:6, marginBottom:4 }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} onClick={() => setForm(f => ({...f, rating:n}))}
                style={{ fontSize:32, cursor:"pointer", color: n <= form.rating ? C.amber : C.border, transition:"color 0.1s" }}>★</span>
            ))}
            <span style={{ fontSize:14, color:C.text2, alignSelf:"center", marginLeft:8 }}>{form.rating} / 5</span>
          </div>
        </FormRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormRow label="Platform">
            <Select value={form.platform} onChange={v => setForm(f => ({...f, platform:v}))}
              options={["Airbnb","Booking.com","Direct","Google"]} />
          </FormRow>
          <FormRow label="Review Date">
            <Input type="date" value={form.date} onChange={v => setForm(f => ({...f, date:v}))} />
          </FormRow>
        </div>
        <FormRow label="Guest Comment (optional)">
          <textarea value={form.comment} onChange={e => setForm(f => ({...f, comment:e.target.value}))}
            placeholder="Paste the guest's review comment here..." rows={4}
            style={{ ...inputStyle, resize:"vertical" }} />
        </FormRow>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="primary" icon={Star} onClick={handleAdd}>Save Review</Btn>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── PROPERTY SCORECARD ───────────────────────────────────────────────────────
function PropertyScorecard() {
  const { state } = useApp();
  const [sortBy, setSortBy] = useState("rating");
  const [areaFilter, setAreaFilter] = useState("All");

  // Build scorecard per property
  const scorecards = state.properties.map(prop => {
    const propReviews = state.reviews.filter(r => r.propertyName === prop.name || r.propertyId === prop.id);
    const propBookings = state.bookings.filter(b => b.propertyName === prop.name || b.propId === prop.id);
    const avgRating = propReviews.length
      ? (propReviews.reduce((s,r) => s + r.rating, 0) / propReviews.length)
      : null;
    const revenue = propBookings.reduce((s,b) => s + b.revenue, 0);
    const fiveStars = propReviews.filter(r => r.rating === 5).length;
    const lowRatings = propReviews.filter(r => r.rating <= 3).length;
    return { prop, reviews: propReviews, bookings: propBookings, avgRating, revenue, fiveStars, lowRatings };
  }).filter(s => s.reviews.length > 0 || s.bookings.length > 0);

  const areas = ["All", ...new Set(state.properties.map(p => p.area).filter(Boolean))];

  const filtered = scorecards
    .filter(s => areaFilter === "All" || s.prop.area === areaFilter)
    .sort((a,b) => {
      if (sortBy === "rating") return (b.avgRating||0) - (a.avgRating||0);
      if (sortBy === "reviews") return b.reviews.length - a.reviews.length;
      if (sortBy === "revenue") return b.revenue - a.revenue;
      return 0;
    });

  const totalAvg = state.reviews.length
    ? (state.reviews.reduce((s,r) => s + r.rating, 0) / state.reviews.length).toFixed(2)
    : "—";

  const getRatingColor = (r) => {
    if (!r) return C.text3;
    if (r >= 4.5) return C.green;
    if (r >= 4.0) return C.teal;
    if (r >= 3.5) return C.amber;
    return C.crimson;
  };

  const getRatingLabel = (r) => {
    if (!r) return "No reviews";
    if (r >= 4.8) return "Exceptional";
    if (r >= 4.5) return "Excellent";
    if (r >= 4.0) return "Good";
    if (r >= 3.5) return "Average";
    return "Needs Attention";
  };

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <SectionTitle>Property Scorecard</SectionTitle>

      {/* Portfolio KPIs */}
      <div style={{ display:"flex", gap:12, marginBottom:24 }}>
        <KPICard label="Portfolio Avg Rating" value={`${totalAvg} ⭐`} color={C.amber} />
        <KPICard label="Properties Reviewed" value={scorecards.filter(s => s.reviews.length > 0).length} color={C.teal} />
        <KPICard label="5-Star Reviews" value={state.reviews.filter(r => r.rating===5).length} color={C.green} />
        <KPICard label="Needs Attention" value={scorecards.filter(s => s.avgRating && s.avgRating < 4.0).length} color={C.crimson} />
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center" }}>
        <Select value={areaFilter} onChange={setAreaFilter}
          options={areas} style={{ width:160 }} />
        <Select value={sortBy} onChange={setSortBy}
          options={[{value:"rating",label:"Sort: Rating"},{value:"reviews",label:"Sort: Reviews"},{value:"revenue",label:"Sort: Revenue"}]}
          style={{ width:180 }} />
        <span style={{ fontSize:12, color:C.text3, marginLeft:8 }}>Showing {filtered.length} properties</span>
      </div>

      {/* Scorecard Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14 }}>
        {filtered.map(({ prop, reviews, bookings, avgRating, revenue, fiveStars, lowRatings }) => {
          const ratingColor = getRatingColor(avgRating);
          const ratingLabel = getRatingLabel(avgRating);
          return (
            <div key={prop.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:10,
              padding:16, borderTop:`3px solid ${ratingColor}` }}>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, color:C.text3, fontFamily:"'DM Mono',monospace", marginBottom:2 }}>{prop.id}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prop.name}</div>
                  <div style={{ fontSize:11, color:C.text3 }}>{prop.area} · {prop.type}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                  <div style={{ fontSize:22, fontWeight:700, color:ratingColor, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>
                    {avgRating ? avgRating.toFixed(1) : "—"}
                  </div>
                  <div style={{ fontSize:10, color:ratingColor, fontWeight:600 }}>{ratingLabel}</div>
                </div>
              </div>

              {/* Star bar */}
              {avgRating && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", gap:2, marginBottom:4 }}>
                    {[1,2,3,4,5].map(n => (
                      <div key={n} style={{ flex:1, height:4, borderRadius:2,
                        background: n <= Math.round(avgRating) ? ratingColor : C.border }} />
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:C.text3 }}>{avgRating.toFixed(2)} average from {reviews.length} review{reviews.length!==1?"s":""}</div>
                </div>
              )}

              {/* Stats row */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[
                  { label:"Reviews", value: reviews.length, color:C.text2 },
                  { label:"5-Star", value: fiveStars, color:C.green },
                  { label:"≤3 Star", value: lowRatings, color: lowRatings > 0 ? C.crimson : C.text3 },
                ].map(s => (
                  <div key={s.label} style={{ background:C.bg2, borderRadius:6, padding:"8px 10px", textAlign:"center" }}>
                    <div style={{ fontSize:16, fontWeight:700, color:s.color, fontFamily:"'DM Mono',monospace" }}>{s.value}</div>
                    <div style={{ fontSize:10, color:C.text3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Revenue */}
              {revenue > 0 && (
                <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}20`,
                  display:"flex", justifyContent:"space-between", fontSize:11 }}>
                  <span style={{ color:C.text3 }}>Revenue</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", color:C.teal }}>{fmtCurr(revenue)}</span>
                </div>
              )}

              {/* Recent reviews */}
              {reviews.slice(0,2).map(r => (
                <div key={r.id} style={{ marginTop:8, padding:"6px 10px", background:C.bg2, borderRadius:6,
                  borderLeft:`2px solid ${getRatingColor(r.rating)}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                    <span style={{ fontSize:11, color:C.text3 }}>{r.guestName}</span>
                    <span style={{ fontSize:11, color:getRatingColor(r.rating), fontWeight:600 }}>{"★".repeat(r.rating)}</span>
                  </div>
                  {r.comment && <div style={{ fontSize:11, color:C.text2, fontStyle:"italic", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>"{r.comment}"</div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState icon={Star} title="No scorecards yet" sub="Add reviews from the Reviews page to see property performance here." />
      )}
    </div>
  );
}

// ─── OWNER STATEMENTS ─────────────────────────────────────────────────────────
function OwnerStatements() {
  const { state } = useApp();
  const [portfolio, setPortfolio] = useState("All");
  const [period, setPeriod] = useState("2026-05");

  const props = portfolio === "All" ? state.properties : state.properties.filter(p => p.portfolio === Number(portfolio));
  const statements = props.map(prop => {
    const bs = state.bookings.filter(b => b.propId === prop.id && b.checkIn.startsWith(period));
    const revenue = bs.reduce((s,b) => s + b.revenue, 0);
    const mgmtFee = revenue * 0.2;
    const netOwner = revenue - mgmtFee;
    return { prop, bookings: bs.length, revenue, mgmtFee, netOwner, nights: bs.reduce((s,b) => s + b.nights, 0) };
  }).filter(s => s.bookings > 0 || false);

  const totalRev = statements.reduce((s,x) => s + x.revenue, 0);
  const totalNet = statements.reduce((s,x) => s + x.netOwner, 0);

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <SectionTitle>Owner Statements</SectionTitle>
        <div style={{ display:"flex", gap:8 }}>
          <Input type="month" value={period} onChange={setPeriod} style={{ width:160 }} />
          <Select value={portfolio} onChange={setPortfolio} options={["All","1","2"]} style={{ width:120 }} />
        </div>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <KPICard label="Gross Revenue" value={`R ${(totalRev/1000).toFixed(1)}k`} color={C.teal} />
        <KPICard label="Mgmt Fee (20%)" value={`R ${((totalRev*0.2)/1000).toFixed(1)}k`} color={C.amber} />
        <KPICard label="Net to Owners" value={`R ${(totalNet/1000).toFixed(1)}k`} color={C.green} />
        <KPICard label="Properties Active" value={statements.length} color={C.blue} />
      </div>
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 80px 100px 100px 100px 100px",
          padding:"8px 12px", borderBottom:`1px solid ${C.border}`, background:C.bg2, borderRadius:"6px 6px 0 0" }}>
          {["Property","Bookings","Nights","Gross Rev","Mgmt (20%)","Net Owner"].map(h => (
            <div key={h} style={{ fontSize:11, color:C.text3, fontWeight:600, letterSpacing:"0.06em" }}>{h}</div>
          ))}
        </div>
        {statements.length === 0 ? <EmptyState icon={FileText} title="No bookings in this period" /> :
          statements.map(s => (
            <div key={s.prop.id} style={{ display:"grid", gridTemplateColumns:"2fr 80px 100px 100px 100px 100px",
              padding:"10px 12px", borderBottom:`1px solid ${C.border}10`, alignItems:"center" }}>
              <div>
                <div style={{ fontSize:13, color:C.text1 }}>{s.prop.name}</div>
                <div style={{ fontSize:10, color:C.text3, fontFamily:"'DM Mono',monospace" }}>{s.prop.id} · {s.prop.area}</div>
              </div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.text2 }}>{s.bookings}</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.text2 }}>{s.nights}</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.teal }}>R {(s.revenue/1000).toFixed(1)}k</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.amber }}>R {(s.mgmtFee/1000).toFixed(1)}k</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.green, fontWeight:600 }}>R {(s.netOwner/1000).toFixed(1)}k</div>
            </div>
          ))}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 80px 100px 100px 100px 100px",
          padding:"10px 12px", background:C.bg2, borderRadius:"0 0 6px 6px", borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.text1 }}>TOTAL</div>
          <div /><div />
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.teal, fontWeight:700 }}>R {(totalRev/1000).toFixed(1)}k</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.amber, fontWeight:700 }}>R {(totalRev*0.2/1000).toFixed(1)}k</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.green, fontWeight:700 }}>R {(totalNet/1000).toFixed(1)}k</div>
        </div>
      </Card>
    </div>
  );
}

// ─── TEAM & VENDORS ───────────────────────────────────────────────────────────
function TeamVendors() {
  const { state, dispatch, toast } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name:"", role:"Housekeeper", phone:"", notes:"", portfolio:["1","2"] });

  const handleAdd = () => {
    if (!form.name || !form.role) return toast("Name and role are required", "error");
    const id = `T${String(state.team.length + 1).padStart(3,"0")}`;
    dispatch({ type:"ADD_TEAM_MEMBER", payload:{
      id, name: form.name, role: form.role, phone: form.phone,
      notes: form.notes, portfolio: form.portfolio.map(Number),
      rating: 0, completedCleans: 0, active: true,
    }});
    toast(`${form.name} added to team`);
    setShowAdd(false);
    setForm({ name:"", role:"Housekeeper", phone:"", notes:"", portfolio:["1","2"] });
  };

  const handleDelete = (member) => {
    dispatch({ type:"REMOVE_TEAM_MEMBER", payload: member.id });
    toast(`${member.name} removed`);
    setConfirmDelete(null);
  };

  const togglePortfolio = (p) => {
    setForm(f => ({
      ...f,
      portfolio: f.portfolio.includes(p)
        ? f.portfolio.filter(x => x !== p)
        : [...f.portfolio, p]
    }));
  };

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <SectionTitle>Team & Vendors</SectionTitle>
        <Btn variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Add Member</Btn>
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <KPICard label="Total Members" value={state.team.length} color={C.teal} icon={Users} />
        <KPICard label="Housekeepers" value={state.team.filter(m => m.role==="Housekeeper" || m.role==="Senior Housekeeper").length} color={C.blue} />
        <KPICard label="Vendors" value={state.team.filter(m => m.role==="Maintenance Contractor" || m.role==="Internet & Tech").length} color={C.amber} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {state.team.map(m => (
          <Card key={m.id} hover>
            <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:C.tealBg, display:"flex",
                alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:C.teal, flexShrink:0 }}>
                {m.name.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4, justifyContent:"space-between" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{m.name}</span>
                    <Badge label="Active" size="xs" />
                  </div>
                  <button onClick={() => setConfirmDelete(m)}
                    style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:5,
                      padding:"3px 7px", cursor:"pointer", color:C.crimson, display:"flex", alignItems:"center" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <div style={{ fontSize:12, color:C.text3, marginBottom:8 }}>{m.role}</div>
                <div style={{ display:"flex", gap:16, fontSize:11, color:C.text2, flexWrap:"wrap" }}>
                  {m.phone && <span style={{ display:"flex", alignItems:"center", gap:4 }}><Phone size={11}/>{m.phone}</span>}
                  {m.rating > 0 && <span>⭐ {m.rating}</span>}
                  {m.completedCleans > 0 && <span>{m.completedCleans} cleans</span>}
                </div>
                {m.notes && <div style={{ marginTop:6, fontSize:11, color:C.text3 }}>{m.notes}</div>}
                <div style={{ marginTop:6, fontSize:11, color:C.text3 }}>
                  Portfolio: {m.portfolio?.includes(1) && m.portfolio?.includes(2) ? "P1 + P2" : m.portfolio?.includes(1) ? "P1 only" : "P2 only"}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Member Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Team Member / Vendor">
        <FormRow label="Full Name" required>
          <Input value={form.name} onChange={v => setForm(f => ({...f, name:v}))} placeholder="e.g. Thandiwe Mokoena" />
        </FormRow>
        <FormRow label="Role" required>
          <Select value={form.role} onChange={v => setForm(f => ({...f, role:v}))}
            options={["Housekeeper","Senior Housekeeper","Maintenance Contractor","Internet & Tech","Plumber","Electrician","Pool Service","Garden Service","Other"]} />
        </FormRow>
        <FormRow label="Phone Number">
          <Input value={form.phone} onChange={v => setForm(f => ({...f, phone:v}))} placeholder="+27 82 000 0000" />
        </FormRow>
        <FormRow label="Notes">
          <Input value={form.notes} onChange={v => setForm(f => ({...f, notes:v}))} placeholder="Speciality, availability, etc." />
        </FormRow>
        <FormRow label="Portfolio Assignment">
          <div style={{ display:"flex", gap:10 }}>
            {["1","2"].map(p => (
              <div key={p} onClick={() => togglePortfolio(p)}
                style={{ padding:"8px 20px", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:500,
                  background: form.portfolio.includes(p) ? C.tealBg : C.bg2,
                  border: `1px solid ${form.portfolio.includes(p) ? C.teal : C.border}`,
                  color: form.portfolio.includes(p) ? C.teal : C.text2, transition:"all 0.15s" }}>
                Portfolio {p}
              </div>
            ))}
          </div>
        </FormRow>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="primary" icon={Plus} onClick={handleAdd}>Add Member</Btn>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove Team Member" width={400}>
        <div style={{ textAlign:"center", padding:"10px 0 20px" }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:C.crimsonBg, display:"flex",
            alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Trash2 size={22} color={C.crimson} />
          </div>
          <div style={{ fontSize:15, fontWeight:600, color:C.text1, marginBottom:8 }}>
            Remove {confirmDelete?.name}?
          </div>
          <div style={{ fontSize:13, color:C.text3, marginBottom:24 }}>
            This will permanently remove them from the team list.
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
            <Btn variant="danger" icon={Trash2} onClick={() => handleDelete(confirmDelete)}>Yes, Remove</Btn>
            <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── SOPS ─────────────────────────────────────────────────────────────────────
function SOPs() {
  const { state } = useApp();
  const [selected, setSelected] = useState(null);
  const cats = [...new Set(state.sops.map(s => s.category))];

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <SectionTitle>Standard Operating Procedures</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:16 }}>
        <div>
          {cats.map(cat => (
            <div key={cat} style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, color:C.text3, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>{cat}</div>
              {state.sops.filter(s => s.category === cat).map(sop => (
                <div key={sop.id} onClick={() => setSelected(sop)}
                  style={{ padding:"9px 12px", borderRadius:6, cursor:"pointer", marginBottom:4,
                    background: selected?.id === sop.id ? C.tealBg : "transparent",
                    border:`1px solid ${selected?.id === sop.id ? C.teal+"40" : "transparent"}`,
                    color: selected?.id === sop.id ? C.teal : C.text1, fontSize:13, transition:"all 0.12s" }}>
                  {sop.title}
                </div>
              ))}
            </div>
          ))}
        </div>
        <Card>
          {selected ? (
            <>
              <div style={{ fontSize:11, color:C.teal, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>{selected.category}</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:C.platinum, marginBottom:20 }}>{selected.title}</h3>
              <div style={{ whiteSpace:"pre-line", fontSize:13, color:C.text1, lineHeight:1.8 }}>{selected.content}</div>
            </>
          ) : <EmptyState icon={BookOpen} title="Select a procedure" sub="Click any SOP from the list" />}
        </Card>
      </div>
    </div>
  );
}

// ─── GUEST COMMS TEMPLATES ────────────────────────────────────────────────────
function GuestTemplates() {
  const { state } = useApp();
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);
  const cats = [...new Set(state.templates.map(t => t.category))];

  const copy = () => {
    navigator.clipboard.writeText(selected.content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <SectionTitle>Guest Comms Templates</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:16 }}>
        <div>
          {cats.map(cat => (
            <div key={cat} style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, color:C.text3, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>{cat}</div>
              {state.templates.filter(t => t.category === cat).map(tpl => (
                <div key={tpl.id} onClick={() => { setSelected(tpl); setCopied(false); }}
                  style={{ padding:"9px 12px", borderRadius:6, cursor:"pointer", marginBottom:4,
                    background: selected?.id === tpl.id ? C.amberBg : "transparent",
                    border:`1px solid ${selected?.id === tpl.id ? C.amber+"40" : "transparent"}`,
                    color: selected?.id === tpl.id ? C.amber : C.text1, fontSize:13, transition:"all 0.12s" }}>
                  {tpl.name}
                </div>
              ))}
            </div>
          ))}
        </div>
        <Card>
          {selected ? (
            <>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:11, color:C.amber, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" }}>{selected.category}</div>
                  <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:C.platinum }}>{selected.name}</h3>
                </div>
                <Btn variant={copied ? "primary" : "subtle"} icon={copied ? Check : Copy} onClick={copy}>
                  {copied ? "Copied!" : "Copy"}
                </Btn>
              </div>
              <div style={{ background:C.bg2, borderRadius:8, padding:16 }}>
                <pre style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, color:C.text1, whiteSpace:"pre-wrap", lineHeight:1.7 }}>{selected.content}</pre>
              </div>
              <div style={{ marginTop:12, fontSize:12, color:C.text3 }}>Variables in brackets should be replaced before sending.</div>
            </>
          ) : <EmptyState icon={MessageCircle} title="Select a template" sub="Click any template to view and copy" />}
        </Card>
      </div>
    </div>
  );
}


// ─── PROPERTIES ───────────────────────────────────────────────────────────────
function PropertiesModule() {
  const { state, dispatch, toast } = useApp();
  const [search, setSearch] = useState("");
  const [portFilter, setPortFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ id:"", name:"", address:"", area:"", type:"Apartment", portfolio:"1" });

  const handleAdd = () => {
    if (!form.id || !form.name) return toast("Property ID and Name are required", "error");
    if (state.properties.find(p => p.id === form.id)) return toast("Property ID already exists", "error");
    dispatch({ type:"ADD_PROPERTY", payload:{
      id: form.id.toUpperCase(),
      name: form.name,
      address: form.address,
      area: form.area,
      type: form.type,
      portfolio: Number(form.portfolio),
      flag: null,
      status: "Active",
    }});
    toast("Property added successfully");
    setShowAdd(false);
    setForm({ id:"", name:"", address:"", area:"", type:"Apartment", portfolio:"1" });
  };

  const filtered = state.properties.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.area.toLowerCase().includes(search.toLowerCase());
    const matchPort = portFilter === "All" || p.portfolio === Number(portFilter);
    return matchSearch && matchPort;
  });

  const getPropBookings = (id) => state.bookings.filter(b => b.propId === id);
  const getPropRevenue = (id) => getPropBookings(id).reduce((s,b) => s + b.revenue, 0);

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <SectionTitle>Properties</SectionTitle>
        <div style={{ display:"flex", gap:8 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search property..." />
          <Select value={portFilter} onChange={setPortFilter} options={["All","1","2"]} style={{ width:120 }} />
          <Btn variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Add Property</Btn>
        </div>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <KPICard label="Total Properties" value={state.properties.length} color={C.teal} />
        <KPICard label="Portfolio 1" value={state.properties.filter(p => p.portfolio===1).length} color={C.blue} />
        <KPICard label="Portfolio 2" value={state.properties.filter(p => p.portfolio===2).length} color={C.amber} />
        <KPICard label="Flags" value={state.properties.filter(p => p.flag).length} color={C.crimson} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
        {filtered.map(p => {
          const propBookings = getPropBookings(p.id);
          const propRevenue = getPropRevenue(p.id);
          const currentBooking = state.bookings.find(b => b.propId === p.id && b.status === "In-House");
          return (
            <Card key={p.id} hover onClick={() => setSelected(p)} style={{ cursor:"pointer" }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ width:36, height:36, borderRadius:8, background: p.portfolio === 1 ? C.tealBg : C.amberBg,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Building size={16} color={p.portfolio === 1 ? C.teal : C.amber} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:C.text3 }}>{p.id}</span>
                    <span style={{ fontSize:10, color: p.portfolio===1 ? C.teal : C.amber, background: p.portfolio===1 ? C.tealBg : C.amberBg, padding:"1px 5px", borderRadius:3, fontWeight:600 }}>P{p.portfolio}</span>
                    {p.flag && <span style={{ fontSize:10, color:C.amber }}>⚠️</span>}
                    {currentBooking && <Badge label="In-House" size="xs" />}
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                  <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{p.area} · {p.type}</div>
                  <div style={{ display:"flex", gap:12, marginTop:6, fontSize:11, color:C.text2 }}>
                    <span>{propBookings.length} bookings</span>
                    <span style={{ color:C.teal, fontFamily:"'DM Mono',monospace" }}>R {(propRevenue/1000).toFixed(1)}k</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Property Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Property" width={520}>
        <FormRow label="Property ID (e.g. ZG-053)" required>
          <Input value={form.id} onChange={v => setForm(f => ({...f, id:v}))} placeholder="ZG-053" />
        </FormRow>
        <FormRow label="Property Name" required>
          <Input value={form.name} onChange={v => setForm(f => ({...f, name:v}))} placeholder="e.g. 201 The Suro" />
        </FormRow>
        <FormRow label="Full Address">
          <Input value={form.address} onChange={v => setForm(f => ({...f, address:v}))} placeholder="e.g. Holmfirth Road, Cape Town, 8060" />
        </FormRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormRow label="Area">
            <Input value={form.area} onChange={v => setForm(f => ({...f, area:v}))} placeholder="e.g. Sea Point" />
          </FormRow>
          <FormRow label="Type">
            <Select value={form.type} onChange={v => setForm(f => ({...f, type:v}))}
              options={["Apartment","House","Cottage","Villa","Studio"]} />
          </FormRow>
        </div>
        <FormRow label="Portfolio">
          <Select value={form.portfolio} onChange={v => setForm(f => ({...f, portfolio:v}))}
            options={[{value:"1",label:"Portfolio 1"},{value:"2",label:"Portfolio 2"}]} />
        </FormRow>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="primary" icon={Plus} onClick={handleAdd}>Add Property</Btn>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
        </div>
      </Modal>

      {/* Property Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ""} width={600}>
        {selected && (() => {
          const propBs = getPropBookings(selected.id);
          const propRev = getPropRevenue(selected.id);
          const curr = propBs.find(b => b.status === "In-House");
          return (
            <div>
              {selected.flag && <div style={{ background:C.amberBg, border:`1px solid ${C.amber}30`, borderRadius:6, padding:"8px 12px", marginBottom:16, fontSize:12, color:C.amber }}>{selected.flag}</div>}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
                {[["Property ID",selected.id],["Area",selected.area],["Portfolio",`Portfolio ${selected.portfolio}`],
                  ["Bedrooms",`${selected.beds} bedroom${selected.beds>1?"s":""}`],["Bathrooms",`${selected.baths} bathroom${selected.baths>1?"s":""}`],
                  ["Total Revenue",`R ${(propRev/1000).toFixed(1)}k`]].map(([k,v]) => (
                  <div key={k} style={{ background:C.bg2, borderRadius:6, padding:"10px 12px" }}>
                    <div style={{ fontSize:10, color:C.text3, marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:13, color:C.text1, fontWeight:500, fontFamily: k.includes("ID") || k.includes("Revenue") ? "'DM Mono',monospace" : "inherit" }}>{v}</div>
                  </div>
                ))}
              </div>
              {curr && (
                <div style={{ background:C.tealBg, border:`1px solid ${C.teal}30`, borderRadius:8, padding:"12px 16px", marginBottom:16 }}>
                  <div style={{ fontSize:11, color:C.teal, fontWeight:600, marginBottom:6 }}>CURRENTLY IN-HOUSE</div>
                  <div style={{ fontSize:13, color:C.text1 }}>{curr.guestName} · {curr.nights} nights · {fmtDate(curr.checkIn)} → {fmtDate(curr.checkOut)}</div>
                </div>
              )}
              <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginBottom:10 }}>All Bookings ({propBs.length})</div>
              {propBs.slice(0,6).map(b => (
                <div key={b.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}20`, fontSize:12 }}>
                  <span style={{ flex:1, color:C.text1 }}>{b.guestName}</span>
                  <span style={{ color:C.text3, fontFamily:"'DM Mono',monospace" }}>{fmtShort(b.checkIn)} → {fmtShort(b.checkOut)}</span>
                  <Badge label={b.status} size="xs" />
                  <span style={{ color:C.teal, fontFamily:"'DM Mono',monospace" }}>R {(b.revenue/1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// ─── DAILY HISTORY ────────────────────────────────────────────────────────────
function DailyHistory() {
  const { state } = useApp();
  const [selectedDate, setSelectedDate] = useState(TODAY);

  // Build history from booking data
  const historyDates = useMemo(() => {
    const dates = new Set();
    state.bookings.forEach(b => { dates.add(b.checkIn); dates.add(b.checkOut); });
    return [...dates].sort().reverse();
  }, [state.bookings]);

  const dateBookings = state.bookings.filter(b =>
    b.checkIn === selectedDate || b.checkOut === selectedDate ||
    (b.checkIn < selectedDate && b.checkOut > selectedDate)
  );

  const opsRecord = state.dailyOps[selectedDate] || {};
  const completedTasks = Object.values(opsRecord).filter(Boolean).length;
  const totalTasks = OPS_TEMPLATE.flatMap(s => s.tasks).length;

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", gap:20, marginBottom:24 }}>
        <div>
          <SectionTitle>Daily History</SectionTitle>
        </div>
        <div style={{ marginLeft:"auto" }}>
          <Input type="date" value={selectedDate} onChange={setSelectedDate} style={{ width:180 }} />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:12 }}>Bookings Activity — {fmtDate(selectedDate)}</div>
          {dateBookings.length === 0 ? <EmptyState icon={Calendar} title="No activity on this date" /> :
            dateBookings.map(b => {
              const isIn = b.checkIn === selectedDate;
              const isOut = b.checkOut === selectedDate;
              return (
                <div key={b.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}20` }}>
                  {isIn && <ArrowUp size={12} color={C.green} />}
                  {isOut && !isIn && <ArrowDown size={12} color={C.blue} />}
                  {!isIn && !isOut && <Minus size={12} color={C.text3} />}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:C.text1 }}>{b.propertyName}</div>
                    <div style={{ fontSize:11, color:C.text3 }}>{b.guestName} · {isIn ? "Check-in" : isOut ? "Check-out" : "In residence"}</div>
                  </div>
                  <Badge label={b.platform} size="xs" />
                </div>
              );
            })}
        </Card>
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginBottom:12 }}>Daily Ops Log — {fmtDate(selectedDate)}</div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:12, color:C.text2, marginBottom:6 }}>Tasks Completed: {completedTasks}/{totalTasks}</div>
            <div style={{ height:4, background:C.border, borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${totalTasks ? (completedTasks/totalTasks)*100 : 0}%`, background:C.teal, borderRadius:2 }} />
            </div>
          </div>
          {completedTasks === 0 ? (
            <div style={{ fontSize:12, color:C.text3, fontStyle:"italic" }}>No ops tasks recorded for this date.</div>
          ) : (
            <div style={{ fontSize:12, color:C.text3 }}>{completedTasks} of {totalTasks} tasks completed.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsModule() {
  const { state, dispatch, toast } = useApp();
  const [form, setForm] = useState({ ...state.settings });
  const [hospForm, setHospForm] = useState({ ...state.settings.hospitable });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const save = () => {
    dispatch({ type:"UPDATE_SETTINGS", payload:{ ...form, hospitable: hospForm }});
    toast("Settings saved");
  };

  const demoSync = async () => {
    setSyncing(true); setSyncResult(null);
    await new Promise(r => setTimeout(r, 2000));
    // Demo: adds 3 sample bookings
    const sampleBookings = [
      mkBooking(`HOSP-${Date.now()}-1`, "Demo Guest A", "ZG-007", addDays(TODAY, 3), addDays(TODAY, 17), "Airbnb", 11200),
      mkBooking(`HOSP-${Date.now()}-2`, "Demo Guest B", "ZG-011", addDays(TODAY, 5), addDays(TODAY, 19), "Booking.com", 9800),
      mkBooking(`HOSP-${Date.now()}-3`, "Demo Guest C", "ZG-022", addDays(TODAY, 7), addDays(TODAY, 28), "Direct", 16500),
    ];
    sampleBookings.forEach(b => dispatch({ type:"ADD_BOOKING", payload:b }));
    dispatch({ type:"UPDATE_SETTINGS", payload:{ hospitable:{ ...hospForm, lastSync:TODAY }}});
    setSyncResult({ count:3, message:"3 bookings imported (demo mode)" });
    setSyncing(false);
    toast("Sync completed — 3 demo bookings added");
  };

  const clearData = () => {
    if (window.confirm("Reset all data to initial state? This cannot be undone.")) {
      localStorage.removeItem(LS_KEY);
      window.location.reload();
    }
  };

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <SectionTitle>Settings</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* General Settings */}
        <Card>
          <div style={{ fontSize:13, fontWeight:700, color:C.amber, marginBottom:16 }}>General</div>
          <FormRow label="Company Name"><Input value={form.companyName} onChange={v => setForm(f => ({...f, companyName:v}))} /></FormRow>
          <FormRow label="Manager Name"><Input value={form.managerName} onChange={v => setForm(f => ({...f, managerName:v}))} /></FormRow>
          <FormRow label="Manager Phone"><Input value={form.managerPhone} onChange={v => setForm(f => ({...f, managerPhone:v}))} /></FormRow>
          <Btn variant="primary" onClick={save} icon={Save}>Save Settings</Btn>
        </Card>

        {/* Emergency Numbers */}
        <Card>
          <div style={{ fontSize:13, fontWeight:700, color:C.crimson, marginBottom:16 }}>Emergency Numbers</div>
          {state.settings.emergencyNumbers.map((n,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", borderBottom:`1px solid ${C.border}20` }}>
              <Phone size={12} color={C.text3} />
              <span style={{ flex:1, fontSize:12, color:C.text2 }}>{n.name}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.text1 }}>{n.number}</span>
            </div>
          ))}
        </Card>

        {/* Hospitable Sync */}
        <Card style={{ gridColumn:"1 / -1" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.teal, marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
            <Zap size={16} color={C.teal} /> Hospitable Sync
            <span style={{ fontSize:11, color:C.text3, fontWeight:400, marginLeft:4 }}>— Demo mode available</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <FormRow label="Hospitable API Key">
              <Input value={hospForm.apiKey} onChange={v => setHospForm(f => ({...f, apiKey:v}))} placeholder="hosp_live_xxxx..." />
            </FormRow>
            <FormRow label="API URL">
              <Input value={hospForm.apiUrl} onChange={v => setHospForm(f => ({...f, apiUrl:v}))} placeholder="https://api.hospitable.com" />
            </FormRow>
          </div>
          <div style={{ background:C.bg2, borderRadius:8, padding:"14px 16px", marginBottom:16 }}>
            <div style={{ fontSize:12, color:C.text2, marginBottom:8 }}>
              <strong style={{ color:C.text1 }}>Sync Logic:</strong> Imports bookings with ≥7 nights. Auto-calculates mid-stay cleans (⌊nights ÷ 7⌋). Maps properties via ZG-XXX IDs.
            </div>
            <div style={{ fontSize:12, color:C.text3 }}>Last sync: {state.settings.hospitable?.lastSync ? fmtDate(state.settings.hospitable.lastSync) : "Never"}</div>
          </div>
          {syncResult && (
            <div style={{ background:C.greenBg, border:`1px solid ${C.green}30`, borderRadius:6, padding:"10px 14px", marginBottom:12, fontSize:12, color:C.green }}>
              ✓ {syncResult.message}
            </div>
          )}
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="primary" onClick={demoSync} disabled={syncing} icon={RefreshCw}>
              {syncing ? "Syncing..." : "Run Demo Sync"}
            </Btn>
            <Btn variant="ghost" onClick={save} icon={Save}>Save API Config</Btn>
          </div>
        </Card>

        {/* Data Management */}
        <Card>
          <div style={{ fontSize:13, fontWeight:700, color:C.text2, marginBottom:16 }}>Data Management</div>
          <div style={{ fontSize:12, color:C.text3, marginBottom:16 }}>
            Data is stored locally in your browser (localStorage key: <code style={{ color:C.teal }}>{LS_KEY}</code>).
            All 50 properties and {state.bookings.length} bookings are loaded.
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="danger" onClick={clearData}>Reset to Defaults</Btn>
          </div>
        </Card>

        {/* About */}
        <Card>
          <div style={{ fontSize:13, fontWeight:700, color:C.text2, marginBottom:12 }}>About</div>
          <div style={{ fontSize:12, color:C.text3, lineHeight:1.8 }}>
            <div><strong style={{ color:C.text2 }}>Zwart Group</strong> STR Intelligence & Operations Platform</div>
            <div>Version 1.0 · Cape Town, South Africa</div>
            <div style={{ marginTop:8 }}>50 Properties · 2 Portfolios · Mid-Stay Clean Automation</div>
            <div style={{ marginTop:4 }}>Today: <span style={{ fontFamily:"'DM Mono',monospace", color:C.teal }}>{TODAY}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}


// ─── HOUSEKEEPING SCHEDULER & QUALITY CONTROL ─────────────────────────────────
const TASK_TYPES = ["Full Turnover","Mid-Stay Refresh","Full Turnover & Mid-Stay","Guest Extended","Other"];
const QC_FIELDS = [
  { key:"keysCollected",    label:"Keys Collected" },
  { key:"guestKeys",        label:"Guest Keys" },
  { key:"electricityUnits", label:"Electricity Units" },
  { key:"photos",           label:"Photos Submitted" },
  { key:"keysReturned",     label:"Keys Returned" },
];
const QC_OPTIONS = ["Done","Not Required","Issue"];

const qcColor = (v) => v === "Done" ? C.green : v === "Issue" ? C.crimson : C.text3;
const qcBg   = (v) => v === "Done" ? C.greenBg : v === "Issue" ? C.crimsonBg : C.bg2;

function StarQC({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:3 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={() => onChange && onChange(n)}
          style={{ fontSize:18, cursor: onChange ? "pointer" : "default",
            color: n <= (value||0) ? C.amber : C.border, transition:"color 0.1s" }}>★</span>
      ))}
    </div>
  );
}

function QCStatusBtn({ value, onChange }) {
  const cycle = { "Done":"Issue", "Issue":"Not Required", "Not Required":"Done", "":  "Done" };
  return (
    <button onClick={() => onChange && onChange(cycle[value||""] || "Done")}
      style={{ padding:"4px 10px", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer",
        border:`1px solid ${qcColor(value)}30`, background:qcBg(value), color:qcColor(value),
        fontFamily:"'DM Mono',monospace", minWidth:100, transition:"all 0.15s" }}>
      {value || "—"}
    </button>
  );
}

function HousekeepingScheduler() {
  const { state, dispatch, toast } = useApp();
  const [tab, setTab] = useState("schedule");
  const [viewDate, setViewDate] = useState(addDays(TODAY, 1));
  const [historyDate, setHistoryDate] = useState(TODAY);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState(null);

  const blankProp = () => ({ propertyName:"", taskType:"Full Turnover", keysCollected:"", guestKeys:"",
    electricityUnits:"", photos:"", keysReturned:"", qcRating:0, notes:"" });

  const [form, setForm] = useState({
    date: addDays(TODAY, 1), housekeeper:"", properties:[blankProp(), blankProp()]
  });

  const teamNames = state.team.map(m => m.name);
  const propertyNames = state.properties.map(p => p.name);

  // Entries for the selected date
  const scheduleEntries = state.housekeeping.filter(h => h.date === viewDate);
  const historyEntries  = state.housekeeping.filter(h => h.date === historyDate);

  const handleSave = () => {
    if (!form.housekeeper) return toast("Select a housekeeper","error");
    const filledProps = form.properties.filter(p => p.propertyName);
    if (filledProps.length === 0) return toast("Add at least one property","error");
    const id = editEntry ? editEntry.id : `HK-${String(state.housekeeping.length + 1).padStart(3,"0")}`;
    const entry = { id, date:form.date, housekeeper:form.housekeeper, properties:filledProps };
    dispatch({ type: editEntry ? "UPDATE_HK_SCHEDULE" : "ADD_HK_SCHEDULE", payload:entry });
    toast(editEntry ? "Schedule updated" : "Schedule saved");
    setShowAdd(false); setEditEntry(null);
    setForm({ date:addDays(TODAY,1), housekeeper:"", properties:[blankProp(), blankProp()] });
  };

  const openEdit = (entry) => {
    const props = [...entry.properties];
    while (props.length < 2) props.push(blankProp());
    setForm({ date:entry.date, housekeeper:entry.housekeeper, properties:props });
    setEditEntry(entry);
    setShowAdd(true);
  };

  const updateQC = (entryId, propIdx, field, value) => {
    const entry = state.housekeeping.find(h => h.id === entryId);
    if (!entry) return;
    const props = entry.properties.map((p, i) => i === propIdx ? { ...p, [field]:value } : p);
    dispatch({ type:"UPDATE_HK_SCHEDULE", payload:{ id:entryId, properties:props }});
  };

  const deleteEntry = (id) => {
    dispatch({ type:"DELETE_HK_SCHEDULE", payload:id });
    toast("Entry deleted");
  };

  // Stats
  const allEntries = state.housekeeping;
  const issueCount = allEntries.flatMap(h => h.properties).flatMap(p =>
    QC_FIELDS.map(f => p[f.key])).filter(v => v === "Issue").length;
  const avgQC = (() => {
    const rated = allEntries.flatMap(h => h.properties).filter(p => p.qcRating > 0);
    return rated.length ? (rated.reduce((s,p) => s + p.qcRating, 0) / rated.length).toFixed(1) : "—";
  })();

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <SectionTitle>Housekeeping Scheduler & QC</SectionTitle>
        <Btn variant="primary" icon={Plus} onClick={() => { setEditEntry(null); setShowAdd(true); }}>
          Add Schedule
        </Btn>
      </div>

      {/* KPIs */}
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <KPICard label="Total Records" value={allEntries.length} color={C.teal} />
        <KPICard label="Scheduled Tomorrow" value={state.housekeeping.filter(h => h.date === addDays(TODAY,1)).length} color={C.blue} />
        <KPICard label="Avg QC Rating" value={avgQC === "—" ? "—" : `${avgQC} ⭐`} color={C.amber} />
        <KPICard label="QC Issues" value={issueCount} color={issueCount > 0 ? C.crimson : C.green} />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
        {[["schedule","Schedule"],["qc","Quality Control"],["history","History"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:"8px 24px", background:"none", border:"none",
            borderBottom:`2px solid ${tab===id ? C.teal : "transparent"}`, color: tab===id ? C.teal : C.text2,
            cursor:"pointer", fontSize:13, fontWeight: tab===id ? 600 : 400, transition:"all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* SCHEDULE TAB */}
      {tab === "schedule" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <span style={{ fontSize:13, color:C.text2, fontWeight:500 }}>Viewing date:</span>
            <Input type="date" value={viewDate} onChange={setViewDate} style={{ width:180 }} />
            <Btn size="sm" variant="subtle" onClick={() => setViewDate(addDays(TODAY,1))}>Tomorrow</Btn>
            <Btn size="sm" variant="subtle" onClick={() => setViewDate(TODAY)}>Today</Btn>
          </div>

          {scheduleEntries.length === 0 ? (
            <EmptyState icon={Users} title={`No schedule for ${fmtDate(viewDate)}`}
              sub="Click 'Add Schedule' to assign housekeepers for this date." />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {scheduleEntries.map(entry => (
                <Card key={entry.id}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:40, height:40, borderRadius:"50%", background:C.tealBg,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:14, fontWeight:700, color:C.teal }}>
                        {entry.housekeeper.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{entry.housekeeper}</div>
                        <div style={{ fontSize:11, color:C.text3 }}>{fmtDate(entry.date)} · {entry.properties.length} propert{entry.properties.length===1?"y":"ies"}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn size="sm" variant="subtle" icon={Edit} onClick={() => openEdit(entry)}>Edit</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => deleteEntry(entry.id)}><Trash2 size={12} color={C.crimson}/></Btn>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:10 }}>
                    {entry.properties.map((p, pi) => (
                      <div key={pi} style={{ background:C.bg2, borderRadius:8, padding:"12px 14px",
                        borderLeft:`3px solid ${C.teal}` }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text1, marginBottom:4 }}>{p.propertyName}</div>
                        <div style={{ marginBottom:8 }}>
                          <span style={{ fontSize:11, background:C.amberBg, color:C.amber, padding:"2px 8px",
                            borderRadius:4, fontWeight:600 }}>{p.taskType}</span>
                        </div>
                        {/* QC Checklist */}
                        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                          {QC_FIELDS.map(f => (
                            <div key={f.key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                              <span style={{ fontSize:11, color:C.text3 }}>{f.label}</span>
                              <QCStatusBtn value={p[f.key]} onChange={v => updateQC(entry.id, pi, f.key, v)} />
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ fontSize:11, color:C.text3 }}>QC Rating</span>
                          <StarQC value={p.qcRating} onChange={v => updateQC(entry.id, pi, "qcRating", v)} />
                        </div>
                        {p.notes && <div style={{ marginTop:8, fontSize:11, color:C.text3, fontStyle:"italic" }}>{p.notes}</div>}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QC TAB — all entries with issues highlighted */}
      {tab === "qc" && (
        <div>
          <div style={{ marginBottom:16, padding:"12px 16px", background:C.amberBg,
            border:`1px solid ${C.amber}30`, borderRadius:8, fontSize:12, color:C.amber }}>
            💡 Click any QC status button to cycle: <strong>Done → Issue → Not Required</strong>. Click stars to rate.
          </div>

          {/* Group by housekeeper */}
          {Object.entries(
            state.housekeeping.reduce((acc, h) => {
              if (!acc[h.housekeeper]) acc[h.housekeeper] = [];
              acc[h.housekeeper].push(h);
              return acc;
            }, {})
          ).map(([hk, entries]) => {
            const hkIssues = entries.flatMap(h => h.properties)
              .flatMap(p => QC_FIELDS.map(f => p[f.key])).filter(v => v === "Issue").length;
            const hkAvg = (() => {
              const rated = entries.flatMap(h => h.properties).filter(p => p.qcRating > 0);
              return rated.length ? (rated.reduce((s,p) => s + p.qcRating, 0) / rated.length).toFixed(1) : "—";
            })();
            return (
              <div key={hk} style={{ marginBottom:24 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12,
                  padding:"10px 16px", background:C.bg1, borderRadius:8, border:`1px solid ${C.border}` }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:C.tealBg,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:13, fontWeight:700, color:C.teal }}>
                    {hk.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{hk}</div>
                    <div style={{ fontSize:11, color:C.text3 }}>{entries.length} session{entries.length!==1?"s":""} · {entries.flatMap(h=>h.properties).length} properties</div>
                  </div>
                  <div style={{ display:"flex", gap:16, fontSize:12 }}>
                    <span style={{ color: hkIssues > 0 ? C.crimson : C.green }}>
                      {hkIssues > 0 ? `⚠️ ${hkIssues} issues` : "✓ No issues"}
                    </span>
                    <span style={{ color:C.amber }}>⭐ {hkAvg}</span>
                  </div>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:8, paddingLeft:12 }}>
                  {entries.sort((a,b) => b.date.localeCompare(a.date)).map(entry =>
                    entry.properties.map((p, pi) => {
                      const propIssues = QC_FIELDS.filter(f => p[f.key] === "Issue").length;
                      return (
                        <div key={`${entry.id}-${pi}`} style={{ background:C.bg1, borderRadius:8, padding:"12px 16px",
                          border:`1px solid ${propIssues > 0 ? C.crimson+"40" : C.border}`,
                          borderLeft:`3px solid ${propIssues > 0 ? C.crimson : C.green}` }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                            <div>
                              <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{p.propertyName}</div>
                              <div style={{ fontSize:11, color:C.text3 }}>{fmtDate(entry.date)} · {p.taskType}</div>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              {propIssues > 0 && <span style={{ fontSize:11, color:C.crimson, fontWeight:600 }}>⚠️ {propIssues} issue{propIssues!==1?"s":""}</span>}
                              <StarQC value={p.qcRating} onChange={v => updateQC(entry.id, pi, "qcRating", v)} />
                            </div>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px,1fr))", gap:8 }}>
                            {QC_FIELDS.map(f => (
                              <div key={f.key} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                                <span style={{ fontSize:10, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em" }}>{f.label}</span>
                                <QCStatusBtn value={p[f.key]} onChange={v => updateQC(entry.id, pi, f.key, v)} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
          {state.housekeeping.length === 0 && <EmptyState icon={CheckCircle} title="No QC records yet" sub="Add schedules to start tracking quality." />}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <span style={{ fontSize:13, color:C.text2 }}>Select date:</span>
            <Input type="date" value={historyDate} onChange={setHistoryDate} style={{ width:180 }} />
          </div>
          {historyEntries.length === 0
            ? <EmptyState icon={BookMarked} title={`No records for ${fmtDate(historyDate)}`} />
            : historyEntries.map(entry => (
              <Card key={entry.id} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:C.tealBg,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:C.teal }}>
                      {entry.housekeeper.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{entry.housekeeper}</div>
                      <div style={{ fontSize:11, color:C.text3 }}>{fmtDate(entry.date)}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px,1fr))", gap:10 }}>
                  {entry.properties.map((p, pi) => (
                    <div key={pi} style={{ background:C.bg2, borderRadius:8, padding:"10px 14px" }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text1, marginBottom:4 }}>{p.propertyName}</div>
                      <div style={{ fontSize:11, color:C.amber, marginBottom:8 }}>{p.taskType}</div>
                      {QC_FIELDS.map(f => (
                        <div key={f.key} style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
                          <span style={{ color:C.text3 }}>{f.label}</span>
                          <span style={{ color:qcColor(p[f.key]), fontWeight:600 }}>{p[f.key] || "—"}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}20` }}>
                        <span style={{ fontSize:11, color:C.text3 }}>QC Rating</span>
                        <StarQC value={p.qcRating} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditEntry(null); }} title={editEntry ? "Edit Schedule" : "Add Housekeeping Schedule"} width={580}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:4 }}>
          <FormRow label="Date" required>
            <Input type="date" value={form.date} onChange={v => setForm(f => ({...f, date:v}))} />
          </FormRow>
          <FormRow label="Housekeeper" required>
            <Select value={form.housekeeper} onChange={v => setForm(f => ({...f, housekeeper:v}))}
              options={["", ...teamNames]} />
          </FormRow>
        </div>

        {[0,1].map(pi => (
          <div key={pi} style={{ background:C.bg2, borderRadius:8, padding:"14px 16px", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.text2, marginBottom:10 }}>
              Property {pi+1} {pi === 1 && <span style={{ color:C.text3, fontWeight:400 }}>(optional)</span>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <FormRow label="Property Name">
                <Select value={form.properties[pi]?.propertyName || ""}
                  onChange={v => setForm(f => ({ ...f, properties: f.properties.map((p,i) => i===pi ? {...p, propertyName:v} : p)}))}
                  options={["--", ...propertyNames]} />
              </FormRow>
              <FormRow label="Task Type">
                <Select value={form.properties[pi]?.taskType || "Full Turnover"}
                  onChange={v => setForm(f => ({ ...f, properties: f.properties.map((p,i) => i===pi ? {...p, taskType:v} : p)}))}
                  options={TASK_TYPES} />
              </FormRow>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {QC_FIELDS.map(field => (
                <div key={field.key}>
                  <div style={{ fontSize:11, color:C.text3, marginBottom:4 }}>{field.label}</div>
                  <Select value={form.properties[pi]?.[field.key] || ""}
                    onChange={v => setForm(f => ({ ...f, properties: f.properties.map((p,i) => i===pi ? {...p, [field.key]:v} : p)}))}
                    options={["", ...QC_OPTIONS]} />
                </div>
              ))}
              <div>
                <div style={{ fontSize:11, color:C.text3, marginBottom:4 }}>QC Rating</div>
                <StarQC value={form.properties[pi]?.qcRating || 0}
                  onChange={v => setForm(f => ({ ...f, properties: f.properties.map((p,i) => i===pi ? {...p, qcRating:v} : p)}))} />
              </div>
            </div>
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:11, color:C.text3, marginBottom:4 }}>Notes</div>
              <Input value={form.properties[pi]?.notes || ""}
                onChange={v => setForm(f => ({ ...f, properties: f.properties.map((p,i) => i===pi ? {...p, notes:v} : p)}))}
                placeholder="Any notes..." />
            </div>
          </div>
        ))}

        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="primary" icon={Save} onClick={handleSave}>
            {editEntry ? "Update Schedule" : "Save Schedule"}
          </Btn>
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setEditEntry(null); }}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── MODULE ROUTER ────────────────────────────────────────────────────────────
function ModuleContent({ active, onNav }) {
  const map = {
    dashboard:   <Dashboard onNav={onNav} />,
    cleans:      <ResCleans />,
    dailyops:    <DailyOps />,
    housekeeping: <HousekeepingScheduler />,
    financials:  <Financials />,
    metrics:     <AdvancedMetrics />,
    revenue:     <RevenueStrategy />,
    incidents:   <IncidentRegister />,
    reviews:     <Reviews />,
    scorecard:   <PropertyScorecard />,
    statements:  <OwnerStatements />,
    team:        <TeamVendors />,
    sops:        <SOPs />,
    templates:   <GuestTemplates />,
    properties:  <PropertiesModule />,
    history:     <DailyHistory />,
    settings:    <SettingsModule />,
  };
  return map[active] || <EmptyState icon={Layers} title="Module not found" />;
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
function AppInner() {
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:C.bg0, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <Sidebar active={active} onNav={setActive} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <TopBar module={active} />
        <main style={{ flex:1, overflowY:"auto", padding:24 }}>
          <ModuleContent active={active} onNav={setActive} />
        </main>
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
