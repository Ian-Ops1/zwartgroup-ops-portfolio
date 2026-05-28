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
// Ensure mobile viewport
const viewportMeta = document.querySelector('meta[name="viewport"]');
if (!viewportMeta) {
  const m = document.createElement("meta");
  m.name = "viewport";
  m.content = "width=device-width, initial-scale=1, maximum-scale=1";
  document.head.appendChild(m);
}
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
  @keyframes slideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.5;}}
  @media(max-width:768px){
    input,select,textarea{font-size:16px!important;}
  }
  @media print{
    body{background:#fff!important;}
    #print-hide{display:none!important;}
    #print-area{
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:#fff;z-index:9999;padding:32px;
      font-family:'Plus Jakarta Sans',sans-serif;
    }
    .print-text{color:#000!important;}
  }
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
const TODAY = new Date().toISOString().slice(0, 10);
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
  flag: id==="ZG-046"?"Duplicate of ZG-012":id==="ZG-017"?"Duplicate of ZG-001":null,
  portfolio: parseInt(id.replace("ZG-",""))<=30?1:2,
  status:"Active",
  ownerName:"", ownerEmail:"", ownerPhone:"",
  managementFee: 20,
}));


const mkBooking = (id, guestName, propId, checkIn, checkOut, platform, revenue, extraCleans=[], notes="") => {
  const prop = PROPERTIES.find(p => p.id === propId);
  const nights = daysBetween(checkIn, checkOut);
  const cleans = calculateCleans(checkIn, checkOut, nights).map((c,i) => ({
    ...c, ...(extraCleans[i]||{}), status: extraCleans[i]?.status||c.status,
  }));
  return { id, guestName, propId, propertyName: prop?.name||propId, area: prop?.area||"",
    checkIn, checkOut, nights, platform, revenue: Number(revenue)||0, notes,
    status: daysBetween(TODAY,checkIn)>0?"Upcoming":daysBetween(checkOut,TODAY)>0?"Checked Out":"In-House", cleans };
};
const mkBookingDirect = (id, guestName, propName, checkIn, checkOut, platform, revenue, cleanStatuses=[], notes="") => {
  const nights = daysBetween(checkIn, checkOut);
  const cleans = calculateCleans(checkIn, checkOut, nights).map((c,i) => ({
    ...c, status: cleanStatuses[i]||c.status, assignedHousekeeper:"",
  }));
  return { id, guestName, propId:null, propertyName:propName, area:"",
    checkIn, checkOut, nights, platform, revenue: Number(revenue)||0, notes,
    status: daysBetween(TODAY,checkIn)>0?"Upcoming":daysBetween(checkOut,TODAY)>0?"Checked Out":"In-House", cleans };
};

const INITIAL_BOOKINGS = [
  mkBookingDirect("HMD9DDPMNY","Nomusa Buthelezi","Unit 3 Castella Mare","2026-05-02","2026-06-02","Airbnb",16705.35,["Completed","Completed","Completed","Upcoming"]),
  mkBookingDirect("HMMM4NRS3D","Lene Van Dyk","10 Duet Cottage","2026-05-01","2026-05-31","Airbnb",10541.63,["Completed","Completed","Completed","Upcoming"]),
  mkBookingDirect("HMDSP3XDZD","Abigail Windvogel","35 Uxolo","2026-04-30","2026-05-28","Airbnb",13446.79,["Completed","Completed","Completed"]),
  mkBookingDirect("HMPPK4ZEN5","Anthony Chijioke","2309 16 on Bree","2026-04-16","2026-05-16","Airbnb",28009.34,["Completed","Completed","Completed","Completed"]),
  mkBookingDirect("HMZZYR9NP8","Oluwamayowa Fanoiki","2108 The Rubik","2026-04-13","2026-05-14","Airbnb",20117.40,["Completed","Completed","Completed","Completed"]),
  mkBookingDirect("HMNZ59ABRW","Sylvester Selepe","601 Quayside Apartments","2026-04-24","2026-06-30","Airbnb",52196.41,["Completed","Completed","Completed","Completed","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming"]),
  mkBookingDirect("HMKMTC9JAQ","Tonye Tariah","1005 Arnhem","2026-04-06","2026-05-08","Airbnb",23030.40,["Completed","Completed","Completed","Completed"]),
  mkBookingDirect("HMQESEWZMJ","Francisca","Suite 103 Strand Beach","2026-05-01","2026-05-17","Airbnb",0,["Completed","Completed"],"Revenue missing"),
  mkBookingDirect("HMH34D3NEA","Azeez Kehinde","504 Greenmarket","2026-04-30","2026-05-11","Airbnb",7763.89,["Completed"]),
  mkBookingDirect("HMPRNKZKH4","Abdullah Habeeb","505 Bridgewater","2026-05-03","2026-06-03","Airbnb",24890.01,["Completed","Rescheduled","Upcoming","Upcoming"]),
  mkBookingDirect("HMNRD2RRP9","Maya Dorel","8 Bramber Court","2026-04-11","2026-06-11","Airbnb",67965.89,["Completed","Completed","Completed","Completed","Rescheduled","Upcoming","Upcoming","Upcoming"]),
  mkBookingDirect("HMMN2RHC4P","Serena Dell Angelo","504 The Centurion","2026-04-23","2026-05-25","Airbnb",22063.97,["Completed","Completed","Completed","Completed"]),
  mkBookingDirect("HMJHWNNKMB","Milla Sequeira","201 The Suro","2026-05-04","2026-06-04","Airbnb",41017.65,["Completed","Completed","Upcoming","Upcoming"]),
  mkBookingDirect("HMBRAYFMD2","Ontario","24 Upper Pepper","2026-05-04","2026-05-29","Airbnb",21933.38,["Completed","Completed","Upcoming"]),
  mkBookingDirect("HMPFX4MBN2","Teresa Forester","10 Duet Loft","2026-05-07","2026-05-19","Airbnb",910.67,["Completed"]),
  mkBookingDirect("HMC344RY9N","Brian Van Eyssen","Unit 2, 2 Munnik Laas","2026-05-08","2026-05-31","Airbnb",0,["Rescheduled","Rescheduled","Upcoming"],"Revenue missing"),
  mkBookingDirect("5986083519","Alexis","417 Station House","2026-05-10","2026-08-01","Booking.com",0,["Rescheduled","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming"],"Revenue missing"),
  mkBookingDirect("NA-601","Guest","601 Station House","2026-05-04","2026-08-01","Direct",0,["Completed","Completed","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming"],"Guest name missing"),
  mkBookingDirect("HM3TX2FDHZ","Rhianne Tisdale","602 The Suro","2026-05-09","2026-06-14","Airbnb",0,["Rescheduled","Upcoming","Upcoming","Upcoming","Upcoming"],"Revenue missing"),
  mkBookingDirect("HMEWYEMCWH","Guest","Unit 1, 2 Munnik Laas","2026-05-10","2026-06-30","Airbnb",0,["Rescheduled","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming","Upcoming"],"Guest name missing"),
  mkBookingDirect("HMXRKNYWJN","Guest","10 Duet Main House","2026-05-14","2026-05-23","Airbnb",0,["Completed"],"Guest name missing"),
  mkBookingDirect("4PL7YF","John","314 Station House","2026-05-11","2026-06-11","Direct",0,["Completed","Upcoming","Upcoming","Upcoming"],"Revenue missing"),
  mkBookingDirect("NA-614","Guest","614 Albert","2026-05-14","2026-05-22","Airbnb",0,["Completed"],"Guest name missing"),
  mkBookingDirect("NA-220","Guest","209 220 on Loop","2026-05-15","2026-06-15","Airbnb",0,["Completed","Upcoming","Upcoming","Upcoming"],"Guest name missing"),
  mkBookingDirect("NA-126","Guest","602 126 on Main","2026-05-15","2026-05-28","Airbnb",0,["Completed"],"Guest name missing"),
];
INITIAL_BOOKINGS.forEach(b => {
  b.cleans = b.cleans.map(c => ["Completed","Rescheduled"].includes(c.status) ? c : {...c, status:getCleanStatus(c)});
  b.status = daysBetween(TODAY,b.checkIn)>0?"Upcoming":daysBetween(b.checkOut,TODAY)>0?"Checked Out":"In-House";
});


const INITIAL_INCIDENTS = [
  { id:"INC-001", propertyId:"ZG-002", propertyName:"601 Quayside", date:"2026-05-10", type:"Cleaning Issue", description:"Guest reported inadequate cleaning on arrival. Bin not emptied, bathroom not wiped down.", guest:"Sylvester Selepe", severity:"Medium", status:"Resolved", resolution:"Sharon returned for a full re-clean. Apology sent. 10% discount applied to next stay.", resolvedDate:"2026-05-10" },
  { id:"INC-002", propertyId:"ZG-003", propertyName:"8 Bramber Court", date:"2026-05-14", type:"Maintenance - HVAC", description:"Air conditioner not cooling. Unit producing warm air only. Guest stayed in hotel for one night.", guest:"Maya", severity:"High", status:"Resolved", resolution:"Andy attended and replaced faulty capacitor. AC operational by next morning.", resolvedDate:"2026-05-15" },
  { id:"INC-003", propertyId:"ZG-004", propertyName:"109 Mouille Grange", date:"2026-05-22", type:"Guest Complaint", description:"Guest reports dirty ceiling fan and snack basket was not replenished as per listing description.", guest:"Uzoamaka", severity:"Low", status:"Open", resolution:"", resolvedDate:null },
];

const INITIAL_MAINTENANCE = [
  { id:"MNT-001", propertyId:"ZG-003", propertyName:"8 Bramber Court", issue:"AC capacitor replacement", vendor:"Andy", raisedDate:"2026-05-14", scheduledDate:"2026-05-15", status:"Completed", cost:850, notes:"Resolved same day." },
  { id:"MNT-002", propertyId:"ZG-012", propertyName:"10 Duet Main House", issue:"Geyser pressure relief valve leaking", vendor:"Cleanix", raisedDate:"2026-05-20", scheduledDate:"2026-05-27", status:"Scheduled", cost:1200, notes:"Parts on order." },
  { id:"MNT-003", propertyId:"ZG-044", propertyName:"Beach House 2 Big Bay", issue:"Pool pump not priming", vendor:"Cleanix", raisedDate:"2026-05-22", scheduledDate:"2026-05-28", status:"Scheduled", cost:0, notes:"Awaiting quote." },
  { id:"MNT-004", propertyId:"ZG-019", propertyName:"201 Atlantic Views", issue:"Dishwasher not draining", vendor:"Andy", raisedDate:"2026-05-23", scheduledDate:"2026-05-25", status:"Pending", cost:0, notes:"Guest reported. Booking active." },
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
const LS_KEY = "zwart_group_v4";

const initialState = {
  properties: PROPERTIES,
  bookings: INITIAL_BOOKINGS,
  incidents: INITIAL_INCIDENTS,
  maintenance: INITIAL_MAINTENANCE,
  complaints: INITIAL_COMPLAINTS,
  reviews: INITIAL_REVIEWS,
  team: INITIAL_TEAM,
  sops: SOPS,
  templates: TEMPLATES,
  dailyOps: {},
  housekeeping: [],
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
    case "ADD_MAINTENANCE": return { ...state, maintenance: [...state.maintenance, action.payload] };
    case "UPDATE_MAINTENANCE": return { ...state, maintenance: state.maintenance.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) };
    case "ADD_COMPLAINT": return { ...state, complaints: [...state.complaints, action.payload] };
    case "UPDATE_COMPLAINT": return { ...state, complaints: state.complaints.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };
    case "ADD_REVIEW": return { ...state, reviews: [...state.reviews, action.payload] };
    case "UPDATE_REVIEW": return { ...state, reviews: state.reviews.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r) };
    case "UPDATE_DAILY_OPS": return { ...state, dailyOps: { ...state.dailyOps, [action.date]: action.payload } };
    case "UPDATE_SETTINGS": return { ...state, settings: { ...state.settings, ...action.payload } };
    case "ADD_PROPERTY": return { ...state, properties: [...state.properties, action.payload] };
    case "UPDATE_PROPERTY": return { ...state, properties: state.properties.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'ADD_HK_SCHEDULE': return { ...state, housekeeping: [...(state.housekeeping||[]), action.payload] };
    case 'UPDATE_HK_SCHEDULE': return { ...state, housekeeping: (state.housekeeping||[]).map(h => h.id===action.payload.id?{...h,...action.payload}:h) };
    case 'DELETE_HK_SCHEDULE': return { ...state, housekeeping: (state.housekeeping||[]).filter(h => h.id!==action.payload) };
    case "ADD_TEAM_MEMBER": return { ...state, team: [...state.team, action.payload] };
    case "REMOVE_TEAM_MEMBER": return { ...state, team: state.team.filter(m => m.id !== action.payload) };
    default: return state;
  }
}

function AppProvider({ children }) {
  const stored = useMemo(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (!s) return null;
      return { ...initialState, ...JSON.parse(s) };
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
    <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px",
      borderLeft: `3px solid ${color || C.teal}`, flex: 1, minWidth: 120 }}>
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
  const isMob = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex",
      alignItems: isMob ? "flex-end" : "center", justifyContent:"center", padding: isMob ? 0 : 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.bg1, border:`1px solid ${C.border}`,
        borderRadius: isMob ? "16px 16px 0 0" : 12,
        width:"100%", maxWidth: isMob ? "100%" : width,
        maxHeight: isMob ? "92vh" : "90vh",
        overflowY:"auto", animation: isMob ? "slideUp 0.25s ease" : "fadeIn 0.2s ease" }}>
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
  const isMob = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, display: open ? "flex" : "none",
      justifyContent: isMob ? "flex-start" : "flex-end",
      flexDirection: isMob ? "column" : "row", alignItems: isMob ? "flex-end" : "stretch" }}>
      <div onClick={onClose} style={{ flex:1, background:"rgba(0,0,0,0.5)" }} />
      <div style={{ width: isMob ? "100%" : 480, maxWidth: isMob ? "100%" : "90vw",
        background:C.bg1, borderLeft: isMob ? "none" : `1px solid ${C.border}`,
        borderTop: isMob ? `1px solid ${C.border}` : "none",
        height: isMob ? "85vh" : "100%", overflowY:"auto",
        borderRadius: isMob ? "16px 16px 0 0" : 0,
        animation: open ? (isMob ? "slideUp 0.3s ease" : "slideIn 0.3s ease") : "none" }}>
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
  { id:"reservations",   icon:BookMarked,   label:"Reservations",        badge:null },
  { id:"cleans",        icon:Calendar,     label:"Res & Cleans (10+ nights)", badge:"cleans" },
  { id:"dailyops",      icon:ClipboardList,label:"Daily Ops",          badge:null },
  { id:"housekeeping",  icon:Users,        label:"Housekeeping",        badge:null },
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
    const openComplaints = (state.complaints||[]).filter(c => c.status === "Open").length;
    const unrespondedReviews = state.reviews.filter(r => !r.responded).length;
    const urgentCleans = state.bookings.flatMap(b => b.cleans).filter(c =>
      ["Due Today","Due Tomorrow","Overdue"].includes(c.status)).length;
    return { incidents: openIncidents + openComplaints, maintenance: 0,
      complaints: openComplaints, reviews: unrespondedReviews, cleans: urgentCleans };
  }, [state]);

  return (
    <div style={{ width: collapsed ? 64 : 240, minHeight:"100vh", background:C.bg1,
      borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column",
      transition:"width 0.25s ease", overflow:"hidden", flexShrink:0 }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? "12px 0" : "16px 14px", borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", gap:10, justifyContent: collapsed ? "center" : "space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
          {collapsed ? (
            <div style={{ width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <img src="data:image/png;base64,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y31GA/x+m36Kg+3j/eOT7vNIv/v04n+u8+/H59ND3KCH4/RBmeGRuTQ8GKuPyBf/BZgnfh6XZ2QSHX9ORn9/RJv0KXPfp372yQv84eefyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMpnMV+H/A02+AY5rc9dhAAAAAElFTkSuQmCC"
                alt="Zwart Group" style={{ width:32, height:32, objectFit:"contain",
                filter:"invert(1) brightness(2)", opacity:0.9 }} />
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%", padding:"4px 0" }}>
              <img src="data:image/png;base64,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y31GA/x+m36Kg+3j/eOT7vNIv/v04n+u8+/H59ND3KCH4/RBmeGRuTQ8GKuPyBf/BZgnfh6XZ2QSHX9ORn9/RJv0KXPfp372yQv84eefyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMpnMV+H/A02+AY5rc9dhAAAAAElFTkSuQmCC"
                alt="Zwart Group" style={{ width:110, height:"auto", objectFit:"contain",
                filter:"invert(1) brightness(2)", opacity:0.9, marginBottom:6 }} />
              <div style={{ fontSize:9, color:C.teal, letterSpacing:"0.18em", fontWeight:700,
                fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>Ops & Portfolio Command</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={onToggle} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:5,
            padding:"3px 5px", cursor:"pointer", color:C.text2, display:"flex", alignItems:"center", flexShrink:0 }}>
            <ChevronLeft size={12} />
          </button>
        )}
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
    <div style={{ height:52, background:C.bg1, borderBottom:`1px solid ${C.border}`, display:"flex",
      alignItems:"center", padding:"0 16px", gap:12, flexShrink:0, overflowX:"auto" }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:C.platinum, flex:"0 0 auto" }}>
        {NAV.find(n => n.id === module)?.label || "Dashboard"}
      </div>
      <div style={{ width:1, height:20, background:C.border, flexShrink:0 }} />
      <div style={{ display:"flex", gap:12, flex:1, overflowX:"auto" }}>
        {chips.map(chip => (
          <div key={chip.label} style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            <span style={{ fontSize:10, color:C.text3 }}>{chip.label}:</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:600, color:chip.color }}>{chip.value}</span>
          </div>
        ))}
      </div>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.text3, flexShrink:0 }}>
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
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10, marginBottom:20 }}>
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
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
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

  const bookings = state.bookings.filter(b => b.nights >= 10);

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
        {[["cleans","Today & Tomorrow"],["bookings","All Bookings"],["alerts","Clean Alerts"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:"8px 20px", background:"none", border:"none",
            borderBottom:`2px solid ${tab===id ? C.teal : "transparent"}`, color: tab===id ? C.teal : C.text2,
            cursor:"pointer", fontSize:13, fontWeight: tab===id ? 600 : 400, transition:"all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "cleans" ? (() => {
        const allCleans = bookings.flatMap(b =>
          b.cleans.map((c, ci) => ({ ...c, booking:b, ci, liveStatus: getCleanStatus(c) }))
        );
        const overdueC   = allCleans.filter(c => c.liveStatus === "Overdue");
        const todayC     = allCleans.filter(c => c.liveStatus === "Due Today");
        const tomorrowC  = allCleans.filter(c => c.liveStatus === "Due Tomorrow");
        const completedTodayC = allCleans.filter(c => c.status === "Completed" && c.completedDate === TODAY);

        const CleanCard = ({ c, bg, border, badgeIcon }) => (
          <div onClick={() => { setSelectedBooking(c.booking); setSelectedClean(c.ci); }}
            style={{ background:bg, border:`1px solid ${border}40`, borderRadius:9,
              padding:"14px 16px", cursor:"pointer", borderLeft:`4px solid ${border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
                {c.booking.propertyName}
              </div>
              <span style={{ fontSize:18, marginLeft:8, flexShrink:0 }}>{badgeIcon}</span>
            </div>
            <div style={{ fontSize:11, color:C.text3, marginBottom:8 }}>
              {c.booking.guestName} · Clean #{c.cleanNumber} of {c.booking.cleans.length} · {c.booking.nights}n
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center", justifyContent:"space-between" }}>
              <Badge label={c.booking.platform} size="xs" />
              {c.assignedHousekeeper
                ? <span style={{ fontSize:11, color:border, fontWeight:600 }}>👤 {c.assignedHousekeeper}</span>
                : <span style={{ fontSize:11, color:C.amber }}>⚠️ Unassigned</span>}
            </div>
          </div>
        );

        return (
          <div>
            {overdueC.length === 0 && todayC.length === 0 && tomorrowC.length === 0 ? (
              <div style={{ background:C.greenBg, border:`1px solid ${C.green}30`, borderRadius:8,
                padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:10 }}>
                <CheckCircle size={18} color={C.green} />
                <span style={{ fontSize:14, color:C.green, fontWeight:600 }}>All cleans on schedule — nothing urgent</span>
              </div>
            ) : null}

            {overdueC.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ width:12, height:12, borderRadius:"50%", background:C.crimson }} />
                  <span style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.crimson }}>
                    Overdue — {overdueC.length} clean{overdueC.length!==1?"s":""}
                  </span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:10 }}>
                  {overdueC.map((c,i) => <CleanCard key={i} c={c} bg="rgba(255,59,92,0.08)" border={C.crimson} badgeIcon="🔴" />)}
                </div>
              </div>
            )}

            {todayC.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ width:12, height:12, borderRadius:"50%", background:C.amber }} />
                  <span style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.amber }}>
                    Cleaning Today — {todayC.length} propert{todayC.length!==1?"ies":"y"} · {fmtDate(TODAY)}
                  </span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:10 }}>
                  {todayC.map((c,i) => <CleanCard key={i} c={c} bg="rgba(245,166,35,0.12)" border={C.amber} badgeIcon="🟡" />)}
                </div>
              </div>
            )}

            {tomorrowC.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ width:12, height:12, borderRadius:"50%", background:C.teal,
                    boxShadow:`0 0 8px ${C.teal}80` }} />
                  <span style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.teal }}>
                    Cleaning Tomorrow — {tomorrowC.length} propert{tomorrowC.length!==1?"ies":"y"} · {fmtDate(addDays(TODAY,1))}
                  </span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:10 }}>
                  {tomorrowC.map((c,i) => <CleanCard key={i} c={c} bg="rgba(0,212,184,0.09)" border={C.teal} badgeIcon="🩵" />)}
                </div>
              </div>
            )}

            {completedTodayC.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <CheckCircle size={14} color={C.green} />
                  <span style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.green }}>
                    Completed Today — {completedTodayC.length} clean{completedTodayC.length!==1?"s":""} ✅
                  </span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:10 }}>
                  {completedTodayC.map((c,i) => (
                    <div key={i} style={{ background:"rgba(34,197,94,0.08)", border:`1px solid ${C.green}30`,
                      borderRadius:9, padding:"14px 16px", borderLeft:`4px solid ${C.green}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
                          {c.booking.propertyName}
                        </div>
                        <span style={{ fontSize:20, marginLeft:8 }}>✅</span>
                      </div>
                      <div style={{ fontSize:11, color:C.text3, marginBottom:6 }}>
                        {c.booking.guestName} · Clean #{c.cleanNumber}
                      </div>
                      {c.assignedHousekeeper && (
                        <span style={{ fontSize:11, color:C.green, fontWeight:600 }}>👤 {c.assignedHousekeeper}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })() : tab === "alerts" ? <CleanAlerts bookings={bookings} onEdit={(b,i) => { setSelectedBooking(b); setSelectedClean(i); }} /> : (
        <>
          {/* Colour Legend */}
          <div style={{ display:"flex", gap:16, marginBottom:12, alignItems:"center", flexWrap:"wrap",
            padding:"10px 14px", background:C.bg1, borderRadius:8, border:`1px solid ${C.border}` }}>
            <span style={{ fontSize:11, color:C.text3, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>Row colour:</span>
            {[
              { bg:"rgba(255,59,92,0.15)",  border:C.crimson, label:"🔴 Missed / Overdue" },
              { bg:"rgba(245,166,35,0.18)", border:C.amber,   label:"🟡 Cleaning Today" },
              { bg:"rgba(0,212,184,0.13)",  border:C.teal,    label:"🩵 Cleaning Tomorrow" },
              { bg:"transparent",           border:C.border,  label:"⬜ Upcoming" },
            ].map(s => (
              <div key={s.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:28, height:16, borderRadius:4, background:s.bg, border:`2px solid ${s.border}` }} />
                <span style={{ fontSize:11, color:C.text2, fontWeight:500 }}>{s.label}</span>
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
            <div style={{ marginLeft:"auto" }}>
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
                    const cleanStatuses = b.cleans.map(c => getCleanStatus(c));
                    const isOverdue   = cleanStatuses.includes("Overdue");
                    const isToday     = cleanStatuses.includes("Due Today");
                    const isTomorrow  = cleanStatuses.includes("Due Tomorrow");
                    const rowBg     = isOverdue  ? "rgba(255,59,92,0.15)"  : isToday   ? "rgba(245,166,35,0.18)" : isTomorrow ? "rgba(0,212,184,0.13)" : "transparent";
                    const rowBorder = isOverdue  ? `4px solid ${C.crimson}` : isToday  ? `4px solid ${C.amber}`  : isTomorrow ? `4px solid ${C.teal}`   : `4px solid transparent`;
                    const rowLine   = isOverdue  ? `1px solid rgba(255,59,92,0.3)` : isToday ? `1px solid rgba(245,166,35,0.3)` : isTomorrow ? `1px solid rgba(0,212,184,0.25)` : `1px solid ${C.border}`;
                    return (
                  <div onClick={() => toggleExpand(b.id)} style={{ display:"grid", gridTemplateColumns:"180px 140px 100px 100px 70px 80px 100px 120px 40px",
                    padding:"12px 16px", borderBottom:rowLine, cursor:"pointer",
                    background:rowBg, borderLeft:rowBorder,
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
            options={["", ...state.properties.map(p => ({ value:p.id, label:p.name }))]} />
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

// ─── INCIDENT REGISTER ────────────────────────────────────────────────────────
function IncidentRegister() {
  const { state, dispatch, toast } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ propertyId:"", type:"Cleaning Issue", description:"", guest:"", severity:"Medium", date:TODAY });

  const handleAdd = () => {
    if (!form.propertyId || !form.description) return toast("Fill required fields","error");
    const prop = state.properties.find(p => p.id === form.propertyId);
    const id = `INC-${String(state.incidents.length + 1).padStart(3,"0")}`;
    dispatch({ type:"ADD_INCIDENT", payload:{ id, propertyName:prop?.name || form.propertyId, status:"Open", resolution:"", resolvedDate:null, ...form }});
    toast("Incident logged"); setShowAdd(false);
    setForm({ propertyId:"", type:"Cleaning Issue", description:"", guest:"", severity:"Medium", date:TODAY });
  };

  const resolve = (inc) => {
    const resolution = prompt("Enter resolution details:");
    if (!resolution) return;
    dispatch({ type:"UPDATE_INCIDENT", payload:{ id:inc.id, status:"Resolved", resolution, resolvedDate:TODAY }});
    toast("Incident resolved");
  };

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <SectionTitle>Incident Register</SectionTitle>
        <Btn variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Log Incident</Btn>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        {["Open","Resolved"].map(s => (
          <KPICard key={s} label={s} value={state.incidents.filter(i => i.status === s).length} color={s==="Open" ? C.crimson : C.green} />
        ))}
        {["High","Medium","Low"].map(s => (
          <KPICard key={s} label={`${s} Severity`} value={state.incidents.filter(i => i.severity === s).length} color={s==="High" ? C.crimson : s==="Medium" ? C.amber : C.blue} />
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {state.incidents.map(inc => (
          <Card key={inc.id} hover>
            <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.text3 }}>{inc.id}</span>
                  <Badge label={inc.status} />
                  <Badge label={inc.severity === "High" ? "Overdue" : inc.severity === "Medium" ? "Due Today" : "Upcoming"} />
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
              <div style={{ display:"flex", gap:8 }}>
                {inc.status === "Open" && <Btn size="sm" variant="primary" onClick={() => resolve(inc)}>Resolve</Btn>}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Incident">
        <FormRow label="Property" required>
          <Select value={form.propertyId} onChange={v => setForm(f => ({...f, propertyId:v}))}
            options={["", ...state.properties.map(p => ({ value:p.id, label:p.name }))]} />
        </FormRow>
        <FormRow label="Date"><Input type="date" value={form.date} onChange={v => setForm(f => ({...f, date:v}))} /></FormRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormRow label="Type">
            <Select value={form.type} onChange={v => setForm(f => ({...f, type:v}))}
              options={["Cleaning Issue","Maintenance - HVAC","Maintenance - Plumbing","Guest Complaint","Security","Damage","Access Issue","Other"]} />
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
          <Btn variant="danger" onClick={handleAdd} icon={AlertTriangle}>Log Incident</Btn>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}


// ─── MAINTENANCE ──────────────────────────────────────────────────────────────
function Maintenance() {
  const { state, dispatch, toast } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ propertyId:"", issue:"", vendor:"", raisedDate:TODAY, scheduledDate:"", status:"Pending", cost:"", notes:"" });

  const handleAdd = () => {
    if (!form.propertyId || !form.issue) return toast("Fill required fields","error");
    const prop = state.properties.find(p => p.id === form.propertyId);
    const id = `MNT-${String(state.maintenance.length + 1).padStart(3,"0")}`;
    dispatch({ type:"ADD_MAINTENANCE", payload:{ id, propertyName:prop?.name || form.propertyId, cost:Number(form.cost)||0, ...form }});
    toast("Maintenance logged"); setShowAdd(false);
  };

  const updateStatus = (mnt, status) => {
    dispatch({ type:"UPDATE_MAINTENANCE", payload:{ id:mnt.id, status }});
    toast(`Maintenance marked ${status}`);
  };

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <SectionTitle>Maintenance</SectionTitle>
        <Btn variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Log Issue</Btn>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        {["Pending","Scheduled","Completed"].map(s => (
          <KPICard key={s} label={s} value={state.maintenance.filter(m => m.status === s).length} color={s==="Pending" ? C.amber : s==="Scheduled" ? C.blue : C.green} />
        ))}
        <KPICard label="Total Cost" value={`R ${state.maintenance.reduce((s,m) => s + (m.cost||0), 0).toLocaleString()}`} color={C.teal} icon={DollarSign} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {state.maintenance.map(m => (
          <Card key={m.id} hover>
            <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.text3 }}>{m.id}</span>
                  <Badge label={m.status} />
                  {m.cost > 0 && <span style={{ fontSize:11, color:C.amber, fontFamily:"'DM Mono',monospace" }}>R {m.cost.toLocaleString()}</span>}
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:C.text1, marginBottom:4 }}>{m.propertyName}</div>
                <div style={{ fontSize:13, color:C.text2, marginBottom:4 }}>{m.issue}</div>
                <div style={{ fontSize:11, color:C.text3, display:"flex", gap:16 }}>
                  <span>Vendor: {m.vendor || "—"}</span>
                  <span>Raised: {fmtDate(m.raisedDate)}</span>
                  {m.scheduledDate && <span>Scheduled: {fmtDate(m.scheduledDate)}</span>}
                </div>
                {m.notes && <div style={{ marginTop:6, fontSize:12, color:C.text3, fontStyle:"italic" }}>{m.notes}</div>}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {m.status !== "Completed" && <Btn size="sm" variant="primary" onClick={() => updateStatus(m, "Completed")}>Mark Done</Btn>}
                {m.status === "Pending" && <Btn size="sm" variant="subtle" onClick={() => updateStatus(m, "Scheduled")}>Schedule</Btn>}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Maintenance Issue">
        <FormRow label="Property" required>
          <Select value={form.propertyId} onChange={v => setForm(f => ({...f, propertyId:v}))}
            options={["", ...state.properties.map(p => ({ value:p.id, label:p.name }))]} />
        </FormRow>
        <FormRow label="Issue Description" required>
          <textarea value={form.issue} onChange={e => setForm(f => ({...f, issue:e.target.value}))} rows={2} style={{ ...inputStyle, resize:"vertical" }} />
        </FormRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormRow label="Vendor">
            <Select value={form.vendor} onChange={v => setForm(f => ({...f, vendor:v}))} options={["","Andy","Cleanix","Other"]} />
          </FormRow>
          <FormRow label="Status">
            <Select value={form.status} onChange={v => setForm(f => ({...f, status:v}))} options={["Pending","Scheduled","Completed"]} />
          </FormRow>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormRow label="Scheduled Date"><Input type="date" value={form.scheduledDate} onChange={v => setForm(f => ({...f, scheduledDate:v}))} /></FormRow>
          <FormRow label="Cost (ZAR)"><Input type="number" value={form.cost} onChange={v => setForm(f => ({...f, cost:v}))} placeholder="0" /></FormRow>
        </div>
        <FormRow label="Notes"><Input value={form.notes} onChange={v => setForm(f => ({...f, notes:v}))} /></FormRow>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="primary" onClick={handleAdd} icon={Wrench}>Log Issue</Btn>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── COMPLAINTS ───────────────────────────────────────────────────────────────
function Complaints() {
  const { state, dispatch, toast } = useApp();
  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <SectionTitle>Complaints</SectionTitle>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <KPICard label="Open" value={state.complaints.filter(c => c.status === "Open").length} color={C.crimson} />
        <KPICard label="Resolved" value={state.complaints.filter(c => c.status === "Resolved").length} color={C.green} />
        <KPICard label="Total" value={state.complaints.length} color={C.teal} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {state.complaints.map(c => (
          <Card key={c.id} hover>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.text3 }}>{c.id}</span>
              <Badge label={c.status} />
              <Badge label={c.type} size="xs" />
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:C.text1, marginBottom:4 }}>{c.propertyName}</div>
            <div style={{ fontSize:13, color:C.text2, marginBottom:4 }}>{c.description}</div>
            <div style={{ fontSize:11, color:C.text3 }}>Guest: {c.guestName} · {fmtDate(c.date)}</div>
            {c.status === "Open" && (
              <div style={{ marginTop:10 }}>
                <Btn size="sm" variant="primary" onClick={() => {
                  dispatch({ type:"UPDATE_COMPLAINT", payload:{ id:c.id, status:"Resolved", resolvedDate:TODAY }});
                  toast("Complaint resolved");
                }}>Mark Resolved</Btn>
              </div>
            )}
          </Card>
        ))}
        {state.complaints.length === 0 && <EmptyState icon={MessageSquare} title="No complaints" sub="All guests are happy!" />}
      </div>
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

  // All checked-out bookings (not cancelled)
  const checkedOut = state.bookings.filter(b =>
    b.status === "Checked Out" && b.bookingStatus !== "Cancelled"
  );

  // Bookings that already have a review
  const reviewedBookingIds = new Set(state.reviews.map(r => r.bookingId).filter(Boolean));

  // Pending = checked out but no review yet
  const pending = checkedOut.filter(b => !reviewedBookingIds.has(b.id));

  const avgRating = state.reviews.length
    ? (state.reviews.reduce((s,r) => s + r.rating, 0) / state.reviews.length).toFixed(1)
    : "—";

  const openAddReview = (booking) => {
    setSelectedBooking(booking);
    setForm({ rating:5, comment:"", platform:booking.platform||"Airbnb", date:TODAY });
    setShowAdd(true);
  };

  const handleAdd = () => {
    if (!selectedBooking) return;
    const id = "REV-" + String(state.reviews.length + 1).padStart(3,"0");
    dispatch({ type:"ADD_REVIEW", payload:{
      id,
      bookingId: selectedBooking.id,
      propertyId: selectedBooking.propId,
      propertyName: selectedBooking.propertyName,
      guestName: selectedBooking.guestName,
      date: form.date,
      rating: Number(form.rating),
      platform: form.platform,
      comment: form.comment,
      responded: false,
    }});
    toast("Review saved");
    setShowAdd(false);
    setSelectedBooking(null);
  };

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <SectionTitle>Reviews</SectionTitle>

      {/* KPIs */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <KPICard label="Avg Rating" value={state.reviews.length ? `${avgRating} ⭐` : "—"} color={C.amber} />
        <KPICard label="Total Reviews" value={state.reviews.length} color={C.teal} />
        <KPICard label="Pending Reviews" value={pending.length} color={pending.length > 0 ? C.crimson : C.green} />
        <KPICard label="5-Star" value={state.reviews.filter(r => r.rating === 5).length} color={C.green} />
        <KPICard label="Unresponded" value={state.reviews.filter(r => !r.responded).length} color={C.blue} />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
        {[["pending",`Pending (${pending.length})`],["all",`All Reviews (${state.reviews.length})`]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding:"8px 24px", background:"none", border:"none",
              borderBottom:`2px solid ${tab===id ? C.teal : "transparent"}`,
              color: tab===id ? C.teal : C.text2, cursor:"pointer",
              fontSize:13, fontWeight: tab===id ? 600 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {/* PENDING TAB — pulled from Reservations checkouts */}
      {tab === "pending" && (
        <div>
          {pending.length === 0 ? (
            <div style={{ background:C.greenBg, border:`1px solid ${C.green}30`, borderRadius:8,
              padding:"16px 20px", display:"flex", alignItems:"center", gap:10 }}>
              <CheckCircle size={18} color={C.green} />
              <span style={{ fontSize:14, color:C.green, fontWeight:600 }}>
                All caught up — every checkout has been reviewed!
              </span>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {/* Info strip */}
              <div style={{ background:C.tealBg, border:`1px solid ${C.teal}30`, borderRadius:8,
                padding:"10px 16px", fontSize:12, color:C.teal, marginBottom:4,
                display:"flex", alignItems:"center", gap:8 }}>
                <Info size={14} />
                These are pulled from your Reservations page — all checked-out bookings awaiting a review.
              </div>

              {pending.map(b => (
                <Card key={b.id} hover>
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
                        <Badge label={b.platform} size="xs" />
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:C.text3 }}>{b.id}</span>
                        <span style={{ fontSize:11, color:C.text3 }}>Checked out {fmtDate(b.checkOut)}</span>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {b.propertyName}
                      </div>
                      <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>
                        {b.guestName} · {b.nights} night{b.nights!==1?"s":""}
                      </div>
                    </div>
                    <Btn variant="primary" size="sm" icon={Star} onClick={() => openAddReview(b)}>
                      Add Review
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALL REVIEWS TAB */}
      {tab === "all" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {state.reviews.length === 0 && (
            <EmptyState icon={Star} title="No reviews yet"
              sub="Reviews will appear here once added from the Pending tab." />
          )}
          {[...state.reviews].sort((a,b) => b.date.localeCompare(a.date)).map(r => (
            <Card key={r.id} hover>
              <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                    {/* Star display */}
                    <div style={{ display:"flex", gap:2 }}>
                      {[1,2,3,4,5].map(n => (
                        <span key={n} style={{ fontSize:16, color: n <= r.rating ? C.amber : C.border }}>★</span>
                      ))}
                    </div>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:C.amber, fontWeight:700 }}>
                      {r.rating}/5
                    </span>
                    <Badge label={r.platform} size="xs" />
                    <span style={{ fontSize:11, color:C.text3 }}>{fmtDate(r.date)}</span>
                    {!r.responded
                      ? <span style={{ fontSize:11, background:C.amberBg, color:C.amber, padding:"2px 8px", borderRadius:4, fontWeight:600 }}>Awaiting response</span>
                      : <span style={{ fontSize:11, color:C.green, fontWeight:600 }}>✓ Responded</span>
                    }
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text1, marginBottom:2 }}>{r.propertyName}</div>
                  <div style={{ fontSize:12, color:C.text3, marginBottom:8 }}>{r.guestName}</div>
                  {r.comment && (
                    <div style={{ fontSize:13, color:C.text2, fontStyle:"italic",
                      background:C.bg2, borderRadius:6, padding:"10px 14px",
                      borderLeft:`3px solid ${r.rating >= 4 ? C.green : r.rating >= 3 ? C.amber : C.crimson}` }}>
                      "{r.comment}"
                    </div>
                  )}
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
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setSelectedBooking(null); }} title="Add Guest Review" width={500}>
        {selectedBooking && (
          <div style={{ background:C.bg2, borderRadius:8, padding:"12px 16px", marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{selectedBooking.propertyName}</div>
            <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>
              {selectedBooking.guestName} · Checked out {fmtDate(selectedBooking.checkOut)}
            </div>
          </div>
        )}

        <FormRow label="Guest Star Rating" required>
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} onClick={() => setForm(f => ({...f, rating:n}))}
                style={{ fontSize:36, cursor:"pointer", transition:"transform 0.1s",
                  color: n <= form.rating ? C.amber : C.border,
                  transform: n <= form.rating ? "scale(1.1)" : "scale(1)" }}>★</span>
            ))}
            <span style={{ fontSize:16, color:C.text2, marginLeft:8, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>
              {form.rating} / 5
            </span>
          </div>
          <div style={{ fontSize:11, color:C.text3 }}>
            {["","⭐ Very Poor","⭐⭐ Poor","⭐⭐⭐ Average","⭐⭐⭐⭐ Good","⭐⭐⭐⭐⭐ Excellent"][form.rating]}
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
          <textarea value={form.comment}
            onChange={e => setForm(f => ({...f, comment:e.target.value}))}
            placeholder="Paste or type the guest's review comment here..."
            rows={4} style={{ ...inputStyle, resize:"vertical" }} />
        </FormRow>

        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="primary" icon={Star} onClick={handleAdd}>Save Review</Btn>
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setSelectedBooking(null); }}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}


// ─── PROPERTY SCORECARD ──────────────────────────────────────────────────────
function PropertyScorecard() {
  const { state } = useApp();
  const [sortBy, setSortBy] = useState("rating");
  const [areaFilter, setAreaFilter] = useState("All");

  const scorecards = state.properties.map(prop => {
    const propReviews = state.reviews.filter(r =>
      r.propertyName === prop.name || r.propertyId === prop.id
    );
    const propBookings = state.bookings.filter(b =>
      b.propertyName === prop.name || b.propId === prop.id
    );
    const avgRating = propReviews.length
      ? (propReviews.reduce((s,r) => s + r.rating, 0) / propReviews.length) : null;
    const revenue = propBookings.reduce((s,b) => s + b.revenue, 0);
    const fiveStars = propReviews.filter(r => r.rating === 5).length;
    const lowRatings = propReviews.filter(r => r.rating <= 3).length;
    return { prop, reviews: propReviews, bookings: propBookings, avgRating, revenue, fiveStars, lowRatings };
  }).filter(s => s.bookings.length > 0);

  const areas = ["All", ...new Set(state.properties.map(p => p.area).filter(Boolean))];
  const filtered = scorecards
    .filter(s => areaFilter === "All" || s.prop.area === areaFilter)
    .sort((a,b) => sortBy==="rating" ? (b.avgRating||0)-(a.avgRating||0)
      : sortBy==="reviews" ? b.reviews.length-a.reviews.length : b.revenue-a.revenue);

  const totalAvg = state.reviews.length
    ? (state.reviews.reduce((s,r) => s+r.rating, 0)/state.reviews.length).toFixed(2) : "—";

  const rColor = (r) => !r?C.text3:r>=4.5?C.green:r>=4.0?C.teal:r>=3.5?C.amber:C.crimson;
  const rLabel = (r) => !r?"No reviews":r>=4.8?"Exceptional":r>=4.5?"Excellent":r>=4.0?"Good":r>=3.5?"Average":"Needs Attention";

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <SectionTitle>Property Scorecard</SectionTitle>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <KPICard label="Portfolio Avg" value={totalAvg==="—"?"—":totalAvg+" ⭐"} color={C.amber} />
        <KPICard label="Properties Reviewed" value={scorecards.filter(s=>s.reviews.length>0).length} color={C.teal} />
        <KPICard label="5-Star Reviews" value={state.reviews.filter(r=>r.rating===5).length} color={C.green} />
        <KPICard label="Needs Attention" value={scorecards.filter(s=>s.avgRating&&s.avgRating<4.0).length} color={C.crimson} />
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        <Select value={areaFilter} onChange={setAreaFilter} options={areas} style={{ width:160 }} />
        <Select value={sortBy} onChange={setSortBy}
          options={[{value:"rating",label:"Sort: Rating"},{value:"reviews",label:"Sort: Reviews"},{value:"revenue",label:"Sort: Revenue"}]}
          style={{ width:180 }} />
      </div>
      {filtered.length === 0
        ? <EmptyState icon={Star} title="No scorecards yet" sub="Add reviews from the Reviews page to see property performance here." />
        : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
          {filtered.map(({ prop, reviews, avgRating, revenue, fiveStars, lowRatings }) => (
            <div key={prop.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:10, padding:16, borderTop:`3px solid ${rColor(avgRating)}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, color:C.text3, fontFamily:"'DM Mono',monospace" }}>{prop.id}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prop.name}</div>
                  <div style={{ fontSize:11, color:C.text3 }}>{prop.area} · {prop.type}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                  <div style={{ fontSize:22, fontWeight:700, color:rColor(avgRating), fontFamily:"'DM Mono',monospace" }}>{avgRating?avgRating.toFixed(1):"—"}</div>
                  <div style={{ fontSize:10, color:rColor(avgRating), fontWeight:600 }}>{rLabel(avgRating)}</div>
                </div>
              </div>
              {avgRating && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", gap:2, marginBottom:4 }}>
                    {[1,2,3,4,5].map(n => <div key={n} style={{ flex:1, height:4, borderRadius:2, background:n<=Math.round(avgRating)?rColor(avgRating):C.border }} />)}
                  </div>
                  <div style={{ fontSize:11, color:C.text3 }}>{avgRating.toFixed(2)} avg · {reviews.length} review{reviews.length!==1?"s":""}</div>
                </div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
                {[{label:"Reviews",value:reviews.length,color:C.text2},{label:"5-Star",value:fiveStars,color:C.green},{label:"Low",value:lowRatings,color:lowRatings>0?C.crimson:C.text3}].map(s => (
                  <div key={s.label} style={{ background:C.bg2, borderRadius:6, padding:"8px 10px", textAlign:"center" }}>
                    <div style={{ fontSize:16, fontWeight:700, color:s.color, fontFamily:"'DM Mono',monospace" }}>{s.value}</div>
                    <div style={{ fontSize:10, color:C.text3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {revenue>0 && (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, paddingTop:8, borderTop:`1px solid ${C.border}20` }}>
                  <span style={{ color:C.text3 }}>Revenue</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", color:C.teal }}>{fmtCurr(revenue)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  );
}

// ─── HOUSEKEEPING SCHEDULER ──────────────────────────────────────────────────
const HK_TASK_TYPES = ["Full Turnover","Mid-Stay Refresh","Full Turnover & Mid-Stay","Guest Extended","Other"];
const HK_QC_FIELDS = [
  { key:"keysCollected", label:"Keys Collected" },
  { key:"guestKeys", label:"Guest Keys" },
  { key:"electricityUnits", label:"Electricity Units" },
  { key:"photos", label:"Photos Submitted" },
  { key:"keysReturned", label:"Keys Returned" },
];
function hkColor(v){return v==="Done"?C.green:v==="Issue"?C.crimson:C.text3;}
function hkBg(v){return v==="Done"?C.greenBg:v==="Issue"?C.crimsonBg:C.bg2;}
function blankProp(){return{propertyName:"",taskType:"Full Turnover",keysCollected:"",guestKeys:"",electricityUnits:"",photos:"",keysReturned:"",qcRating:0,notes:""};}
function HKStars({value,onChange}){
  return(<div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(n=>(<span key={n} onClick={()=>onChange&&onChange(n)} style={{fontSize:18,cursor:onChange?"pointer":"default",color:n<=(value||0)?C.amber:C.border}}>★</span>))}</div>);
}
function HKBtn({value,onChange}){
  const cycle={"":"Done","Done":"Not Required","Not Required":"Issue","Issue":""};
  return(<button onClick={()=>onChange&&onChange(cycle[value||""]||"Done")} style={{padding:"3px 8px",borderRadius:4,fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:hkBg(value),color:hkColor(value),fontFamily:"'DM Mono',monospace",minWidth:90}}>{value||"—"}</button>);
}
function HousekeepingScheduler(){
  const{state,dispatch,toast}=useApp();
  const[tab,setTab]=useState("schedule");
  const[viewDate,setViewDate]=useState(addDays(TODAY,1));
  const[histDate,setHistDate]=useState(TODAY);
  const[showAdd,setShowAdd]=useState(false);
  const[editId,setEditId]=useState(null);
  const[form,setForm]=useState({date:addDays(TODAY,1),housekeeper:"",properties:[blankProp(),blankProp(),blankProp(),blankProp()]});
  const records=Array.isArray(state.housekeeping)?state.housekeeping:[];
  const teamNames=(state.team||[]).map(m=>m.name);
  const propNames=(state.properties||[]).filter(p=>p.status==="Active").map(p=>p.name);
  const save=()=>{
    if(!form.housekeeper)return toast("Select housekeeper","error");
    const filled=form.properties.filter(p=>p.propertyName&&p.propertyName!=="--");
    if(!filled.length)return toast("Add at least one property","error");
    const id=editId||("HK-"+String(records.length+1).padStart(3,"0"));
    dispatch({type:editId?"UPDATE_HK_SCHEDULE":"ADD_HK_SCHEDULE",payload:{id,date:form.date,housekeeper:form.housekeeper,properties:filled}});
    toast("Saved");setShowAdd(false);setEditId(null);
    setForm({date:addDays(TODAY,1),housekeeper:"",properties:[blankProp(),blankProp(),blankProp(),blankProp()]});
  };
  const startEdit=(e)=>{const props=[...e.properties];while(props.length<4)props.push(blankProp());setForm({date:e.date,housekeeper:e.housekeeper,properties:props});setEditId(e.id);setShowAdd(true);};
  const updateQC=(entryId,pi,field,val)=>{const e=records.find(r=>r.id===entryId);if(!e)return;dispatch({type:"UPDATE_HK_SCHEDULE",payload:{id:entryId,properties:e.properties.map((p,i)=>i===pi?{...p,[field]:val}:p)}});};
  const del=(id)=>{if(window.confirm("Delete?"))dispatch({type:"DELETE_HK_SCHEDULE",payload:id});};
  const todayE=records.filter(r=>r.date===viewDate);
  const histE=records.filter(r=>r.date===histDate);
  const issues=records.flatMap(r=>r.properties).flatMap(p=>HK_QC_FIELDS.map(f=>p[f.key])).filter(v=>v==="Issue").length;
  const rated=records.flatMap(r=>r.properties).filter(p=>p.qcRating>0);
  const avgQC=rated.length?(rated.reduce((s,p)=>s+p.qcRating,0)/rated.length).toFixed(1):"—";
  const PropCard=({entry,p,pi,editable})=>(<div style={{background:C.bg2,borderRadius:8,padding:"12px 14px",borderLeft:`3px solid ${C.teal}`}}><div style={{fontSize:13,fontWeight:600,color:C.text1,marginBottom:4}}>{p.propertyName}</div><span style={{fontSize:11,background:C.amberBg,color:C.amber,padding:"2px 8px",borderRadius:4,fontWeight:600,display:"inline-block",marginBottom:8}}>{p.taskType}</span>{HK_QC_FIELDS.map(f=>(<div key={f.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><span style={{fontSize:11,color:C.text3}}>{f.label}</span>{editable?<HKBtn value={p[f.key]} onChange={v=>updateQC(entry.id,pi,f.key,v)}/>:<span style={{fontSize:11,color:hkColor(p[f.key]),fontWeight:600}}>{p[f.key]||"—"}</span>}</div>))}<div style={{marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,color:C.text3}}>QC</span><HKStars value={p.qcRating} onChange={editable?v=>updateQC(entry.id,pi,"qcRating",v):null}/></div></div>);
  return(<div style={{animation:"fadeIn 0.25s ease"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
      <SectionTitle>Housekeeping Scheduler & QC</SectionTitle>
      <Btn variant="primary" icon={Plus} onClick={()=>{setEditId(null);setForm({date:addDays(TODAY,1),housekeeper:"",properties:[blankProp(),blankProp(),blankProp(),blankProp()]});setShowAdd(true);}}>Add Schedule</Btn>
    </div>
    <div style={{display:"flex",gap:12,marginBottom:20}}>
      <KPICard label="Total Records" value={records.length} color={C.teal}/>
      <KPICard label="Tomorrow" value={records.filter(r=>r.date===addDays(TODAY,1)).length} color={C.blue}/>
      <KPICard label="Avg QC" value={avgQC==="—"?"—":avgQC+" ⭐"} color={C.amber}/>
      <KPICard label="QC Issues" value={issues} color={issues>0?C.crimson:C.green}/>
    </div>
    <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:20}}>
      {[["schedule","Schedule"],["qc","Quality Control"],["history","History"]].map(([id,label])=>(<button key={id} onClick={()=>setTab(id)} style={{padding:"8px 24px",background:"none",border:"none",fontSize:13,borderBottom:`2px solid ${tab===id?C.teal:"transparent"}`,color:tab===id?C.teal:C.text2,cursor:"pointer",fontWeight:tab===id?600:400}}>{label}</button>))}
    </div>
    {tab==="schedule"&&(<div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16}}>
        <Input type="date" value={viewDate} onChange={setViewDate} style={{width:180}}/>
        <Btn size="sm" variant="subtle" onClick={()=>setViewDate(addDays(TODAY,1))}>Tomorrow</Btn>
        <Btn size="sm" variant="subtle" onClick={()=>setViewDate(TODAY)}>Today</Btn>
      </div>
      {todayE.length===0?<EmptyState icon={Users} title={"No schedule for "+fmtDate(viewDate)} sub="Click Add Schedule to assign housekeepers."/>:todayE.map(e=>(<Card key={e.id} style={{marginBottom:12}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}><div style={{display:"flex",gap:12,alignItems:"center"}}><div style={{width:40,height:40,borderRadius:"50%",background:C.tealBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:C.teal}}>{e.housekeeper.slice(0,2).toUpperCase()}</div><div><div style={{fontSize:14,fontWeight:700,color:C.text1}}>{e.housekeeper}</div><div style={{fontSize:11,color:C.text3}}>{fmtDate(e.date)} · {e.properties.length} propert{e.properties.length===1?"y":"ies"}</div></div></div><div style={{display:"flex",gap:8}}><Btn size="sm" variant="subtle" icon={Edit} onClick={()=>startEdit(e)}>Edit</Btn><Btn size="sm" variant="ghost" onClick={()=>del(e.id)}><Trash2 size={12} color={C.crimson}/></Btn></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>{e.properties.map((p,pi)=><PropCard key={pi} entry={e} p={p} pi={pi} editable={true}/>)}</div></Card>))}
    </div>)}
    {tab==="qc"&&(<div>{records.length===0?<EmptyState icon={CheckCircle} title="No records yet"/>:Object.entries(records.reduce((acc,r)=>{if(!acc[r.housekeeper])acc[r.housekeeper]=[];acc[r.housekeeper].push(r);return acc;},{})).map(([hk,entries])=>{const hkI=entries.flatMap(e=>e.properties).flatMap(p=>HK_QC_FIELDS.map(f=>p[f.key])).filter(v=>v==="Issue").length;const hkR=entries.flatMap(e=>e.properties).filter(p=>p.qcRating>0);const hkA=hkR.length?(hkR.reduce((s,p)=>s+p.qcRating,0)/hkR.length).toFixed(1):"—";return(<div key={hk} style={{marginBottom:24}}><div style={{display:"flex",gap:12,alignItems:"center",padding:"10px 16px",background:C.bg1,borderRadius:8,border:`1px solid ${C.border}`,marginBottom:10}}><div style={{width:36,height:36,borderRadius:"50%",background:C.tealBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.teal}}>{hk.slice(0,2).toUpperCase()}</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:C.text1}}>{hk}</div></div><span style={{color:hkI>0?C.crimson:C.green,fontSize:12}}>{hkI>0?"⚠️ "+hkI+" issues":"✓ No issues"}</span><span style={{color:C.amber,fontSize:12}}>⭐ {hkA}</span></div>{entries.sort((a,b)=>b.date.localeCompare(a.date)).flatMap((e,ei)=>e.properties.map((p,pi)=>(<div key={e.id+pi} style={{marginLeft:12,marginBottom:8,background:C.bg1,borderRadius:8,padding:"12px 16px",border:`1px solid ${HK_QC_FIELDS.some(f=>p[f.key]==="Issue")?C.crimson+"40":C.border}`,borderLeft:`3px solid ${HK_QC_FIELDS.some(f=>p[f.key]==="Issue")?C.crimson:C.green}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div><div style={{fontSize:13,fontWeight:600,color:C.text1}}>{p.propertyName}</div><div style={{fontSize:11,color:C.text3}}>{fmtDate(e.date)} · {p.taskType}</div></div><HKStars value={p.qcRating} onChange={v=>updateQC(e.id,pi,"qcRating",v)}/></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>{HK_QC_FIELDS.map(f=>(<div key={f.key}><div style={{fontSize:10,color:C.text3,marginBottom:3}}>{f.label}</div><HKBtn value={p[f.key]} onChange={v=>updateQC(e.id,pi,f.key,v)}/></div>))}</div></div>)))}</div>);})}
    </div>)}
    {tab==="history"&&(<div><div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16}}><Input type="date" value={histDate} onChange={setHistDate} style={{width:180}}/></div>{histE.length===0?<EmptyState icon={BookMarked} title={"No records for "+fmtDate(histDate)}/>:histE.map(e=>(<Card key={e.id} style={{marginBottom:12}}><div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}><div style={{width:36,height:36,borderRadius:"50%",background:C.tealBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.teal}}>{e.housekeeper.slice(0,2).toUpperCase()}</div><div><div style={{fontSize:13,fontWeight:600,color:C.text1}}>{e.housekeeper}</div><div style={{fontSize:11,color:C.text3}}>{fmtDate(e.date)}</div></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>{e.properties.map((p,pi)=><PropCard key={pi} entry={e} p={p} pi={pi} editable={false}/>)}</div></Card>))}</div>)}
    <Modal open={showAdd} onClose={()=>{setShowAdd(false);setEditId(null);}} title={editId?"Edit Schedule":"Add Schedule"} width={560}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:4}}>
        <FormRow label="Date" required><Input type="date" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))}/></FormRow>
        <FormRow label="Housekeeper" required><Select value={form.housekeeper} onChange={v=>setForm(f=>({...f,housekeeper:v}))} options={["",...teamNames]}/></FormRow>
      </div>
      {[0,1,2,3].map(pi=>(<div key={pi} style={{background:C.bg2,borderRadius:8,padding:"14px 16px",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:10}}>Property {pi+1} {pi>0&&<span style={{color:C.text3,fontWeight:400}}>(optional)</span>}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <FormRow label="Property"><Select value={form.properties[pi]?.propertyName||""} onChange={v=>setForm(f=>({...f,properties:f.properties.map((p,i)=>i===pi?{...p,propertyName:v}:p)}))} options={["--",...propNames]}/></FormRow>
          <FormRow label="Task Type"><Select value={form.properties[pi]?.taskType||"Full Turnover"} onChange={v=>setForm(f=>({...f,properties:f.properties.map((p,i)=>i===pi?{...p,taskType:v}:p)}))} options={HK_TASK_TYPES}/></FormRow>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          {HK_QC_FIELDS.map(field=>(<div key={field.key}><div style={{fontSize:11,color:C.text3,marginBottom:3}}>{field.label}</div><Select value={form.properties[pi]?.[field.key]||""} onChange={v=>setForm(f=>({...f,properties:f.properties.map((p,i)=>i===pi?{...p,[field.key]:v}:p)}))} options={["","Done","Not Required","Issue"]}/></div>))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:11,color:C.text3}}>QC Rating:</span><HKStars value={form.properties[pi]?.qcRating||0} onChange={v=>setForm(f=>({...f,properties:f.properties.map((p,i)=>i===pi?{...p,qcRating:v}:p)}))}/></div>
      </div>))}
      <div style={{display:"flex",gap:8}}><Btn variant="primary" icon={Save} onClick={save}>{editId?"Update":"Save"} Schedule</Btn><Btn variant="ghost" onClick={()=>{setShowAdd(false);setEditId(null);}}>Cancel</Btn></div>
    </Modal>
  </div>);
}


// ─── OWNER STATEMENTS ────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

function OwnerStatements() {
  const { state, dispatch, toast } = useApp();
  const now = new Date();
  const [selectedPropId, setSelectedPropId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [editingOwner, setEditingOwner] = useState(false);
  const [ownerForm, setOwnerForm] = useState({ ownerName:"", ownerEmail:"", ownerPhone:"", managementFee:20 });

  // Expenses state — per property per month
  const expKey = `${selectedPropId}-${selectedYear}-${selectedMonth}`;
  const [expensesMap, setExpensesMap] = useState({});
  const expenses = expensesMap[expKey] || {
    cleaningCosts: "", maintenanceCosts: "", linenCosts: "", extras: []
  };
  const setExpenses = (val) => setExpensesMap(m => ({ ...m, [expKey]: typeof val === "function" ? val(expenses) : val }));

  // Add extra expense line
  const addExtra = () => setExpenses(e => ({ ...e, extras: [...(e.extras||[]), { label:"", amount:"" }] }));
  const updateExtra = (i, field, val) => setExpenses(e => ({
    ...e, extras: e.extras.map((x,idx) => idx===i ? {...x,[field]:val} : x)
  }));
  const removeExtra = (i) => setExpenses(e => ({ ...e, extras: e.extras.filter((_,idx) => idx!==i) }));

  const prop = state.properties.find(p => p.id === selectedPropId);

  const bookings = state.bookings.filter(b => {
    const match = b.propId === selectedPropId || b.propertyName === prop?.name;
    const bMonth = new Date(b.checkIn).getMonth() + 1;
    const bYear  = new Date(b.checkIn).getFullYear();
    return match && bMonth === Number(selectedMonth) && bYear === Number(selectedYear)
      && b.bookingStatus !== "Cancelled";
  });

  const grossRevenue   = bookings.reduce((s,b) => s + b.revenue, 0);
  const platformComm   = grossRevenue * 0.03;
  const netRevenue     = grossRevenue - platformComm;
  const mgmtFeeRate    = Number(prop?.managementFee || 20) / 100;
  const managementFee  = netRevenue * mgmtFeeRate;

  // Expenses
  const cleaningCosts     = Number(expenses.cleaningCosts)     || 0;
  const maintenanceCosts  = Number(expenses.maintenanceCosts)  || 0;
  const linenCosts        = Number(expenses.linenCosts)        || 0;
  const extraTotal        = (expenses.extras||[]).reduce((s,x) => s + (Number(x.amount)||0), 0);
  const totalExpenses     = cleaningCosts + maintenanceCosts + linenCosts + extraTotal;
  const netOwnerPayout    = netRevenue - managementFee - totalExpenses;
  const statementMonth    = `${MONTHS[Number(selectedMonth)-1]} ${selectedYear}`;
  const years = [2024,2025,2026,2027].map(y => ({ value:y, label:String(y) }));

  const startEditOwner = () => {
    setOwnerForm({
      ownerName:    prop?.ownerName    || "",
      ownerEmail:   prop?.ownerEmail   || "",
      ownerPhone:   prop?.ownerPhone   || "",
      managementFee: prop?.managementFee || 20,
    });
    setEditingOwner(true);
  };

  const saveOwner = () => {
    dispatch({ type:"UPDATE_PROPERTY", payload:{ id:prop.id, ...ownerForm }});
    toast("Owner details saved");
    setEditingOwner(false);
  };

  const handleExportPDF = () => {
    const el = document.getElementById("statement-print-area");
    if (!el) return;
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Owner Statement - ${prop?.name} - ${statementMonth}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:Arial,sans-serif;padding:40px;color:#000;background:#fff;font-size:13px;}
        h1{font-size:24px;font-weight:700;margin-bottom:4px;}
        .sub{font-size:13px;color:#666;margin-bottom:28px;}
        .section{margin-bottom:22px;}
        .section-title{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
          color:#666;border-bottom:1px solid #ddd;padding-bottom:5px;margin-bottom:10px;}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px;}
        .info-key{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;}
        .info-val{font-size:13px;font-weight:500;}
        .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f0f0f0;}
        .row.bold{font-weight:700;}
        .row.dimmed{color:#888;}
        .payout{background:#f0faf5;border:1px solid #b2dfdb;border-radius:8px;padding:16px 20px;
          display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;}
        .payout-label{font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#1a5c3a;font-weight:700;}
        .payout-val{font-size:26px;font-weight:800;color:#1a5c3a;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th{background:#f5f5f5;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;}
        td{padding:7px 10px;border-bottom:1px solid #f0f0f0;}
        .tfoot td{font-weight:700;border-top:2px solid #333;background:#f9f9f9;}
        .footer{margin-top:32px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:12px;}
      </style></head><body>
      <h1>OWNER STATEMENT</h1>
      <div class="sub">${statementMonth} &nbsp;·&nbsp; Zwart Group &nbsp;·&nbsp; Generated ${fmtDate(TODAY)}</div>
      <div class="grid2">
        <div>
          <div class="section-title">Property</div>
          <div class="info-val">${prop?.name}</div>
          <div style="color:#666;font-size:12px;margin-top:3px">${prop?.area || ""} · ${prop?.type || ""}</div>
          ${prop?.address ? `<div style="color:#888;font-size:11px;margin-top:2px">${prop.address}</div>`:""}
        </div>
        <div>
          <div class="section-title">Owner</div>
          <div class="info-val">${prop?.ownerName || "Not specified"}</div>
          ${prop?.ownerEmail ? `<div style="color:#666;font-size:12px;margin-top:2px">${prop.ownerEmail}</div>`:""}
          ${prop?.ownerPhone ? `<div style="color:#666;font-size:12px;margin-top:2px">${prop.ownerPhone}</div>`:""}
        </div>
      </div>
      <div class="section">
        <div class="section-title">Revenue Summary</div>
        <div class="row"><span>Total Reservations</span><span>${bookings.length}</span></div>
        <div class="row"><span>Gross Revenue</span><span>${fmtCurr(grossRevenue)}</span></div>
        <div class="row dimmed"><span>Platform Commission (~3%)</span><span>- ${fmtCurr(platformComm)}</span></div>
        <div class="row bold"><span>Net Revenue</span><span>${fmtCurr(netRevenue)}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Deductions</div>
        <div class="row dimmed"><span>Management Fee (${prop?.managementFee||20}%)</span><span>- ${fmtCurr(managementFee)}</span></div>
        ${cleaningCosts>0?`<div class="row dimmed"><span>Cleaning Costs</span><span>- ${fmtCurr(cleaningCosts)}</span></div>`:""}
        ${maintenanceCosts>0?`<div class="row dimmed"><span>Maintenance</span><span>- ${fmtCurr(maintenanceCosts)}</span></div>`:""}
        ${linenCosts>0?`<div class="row dimmed"><span>Linen Costs</span><span>- ${fmtCurr(linenCosts)}</span></div>`:""}
        ${(expenses.extras||[]).filter(x=>x.label&&Number(x.amount)>0).map(x=>`<div class="row dimmed"><span>${x.label}</span><span>- ${fmtCurr(Number(x.amount))}</span></div>`).join("")}
        <div class="row bold"><span>Total Deductions</span><span>- ${fmtCurr(managementFee+totalExpenses)}</span></div>
      </div>
      <div class="payout">
        <div><div class="payout-label">Net Owner Payout</div><div style="font-size:12px;color:#555;margin-top:3px">${statementMonth}</div></div>
        <div class="payout-val">${fmtCurr(netOwnerPayout)}</div>
      </div>
      ${bookings.length>0?`
      <div class="section">
        <div class="section-title">Booking Breakdown</div>
        <table>
          <thead><tr><th>Guest</th><th>Platform</th><th>Check-in</th><th>Check-out</th><th>Nights</th><th>Revenue</th></tr></thead>
          <tbody>
            ${bookings.map(b=>`<tr><td>${b.guestName}</td><td>${b.platform}</td><td>${fmtShort(b.checkIn)}</td><td>${fmtShort(b.checkOut)}</td><td>${b.nights}</td><td>${b.revenue>0?fmtCurr(b.revenue):"—"}</td></tr>`).join("")}
          </tbody>
          <tfoot><tr><td colspan="4"><strong>TOTAL</strong></td><td><strong>${bookings.reduce((s,b)=>s+b.nights,0)}n</strong></td><td><strong>${fmtCurr(grossRevenue)}</strong></td></tr></tfoot>
        </table>
      </div>`:""}
      <div class="footer">Zwart Group · Ops &amp; Portfolio Command · Confidential Owner Statement</div>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  };

  const StatRow = ({ label, value, bold, highlight, dimmed, negative }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"9px 14px", borderBottom:`1px solid ${C.border}20`,
      background: highlight ? C.tealBg : "transparent" }}>
      <span style={{ fontSize:13, color:dimmed?C.text3:C.text2, fontWeight:bold?700:400 }}>{label}</span>
      <span style={{ fontSize:13, color:highlight?C.teal:negative?C.crimson:bold?C.text1:C.text2,
        fontWeight:bold?700:500, fontFamily:"'DM Mono',monospace" }}>{value}</span>
    </div>
  );

  const InputRow = ({ label, value, onChange, placeholder }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"8px 14px", borderBottom:`1px solid ${C.border}20` }}>
      <span style={{ fontSize:13, color:C.text2, flex:1 }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:12, color:C.text3 }}>R</span>
        <input type="number" value={value} onChange={e=>onChange(e.target.value)}
          placeholder={placeholder||"0.00"}
          style={{ ...inputStyle, width:130, textAlign:"right", padding:"4px 8px", fontSize:13 }} />
      </div>
    </div>
  );

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <SectionTitle>Owner Statements</SectionTitle>
        {prop && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Btn variant="subtle" icon={Edit} onClick={startEditOwner}>Owner Details</Btn>
            <Btn variant="subtle" icon={Download} onClick={handleExportPDF}>Export PDF</Btn>
            <Btn variant="primary" icon={FileText} onClick={() => window.print()}>Print</Btn>
          </div>
        )}
      </div>

      {/* Selectors */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:12, marginBottom:24 }}>
        <div>
          <div style={{ fontSize:11, color:C.text3, marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>Property</div>
          <Select value={selectedPropId} onChange={setSelectedPropId}
            options={["", ...state.properties.filter(p=>p.status==="Active").map(p=>({ value:p.id, label:p.name }))]} />
        </div>
        <div>
          <div style={{ fontSize:11, color:C.text3, marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>Month</div>
          <Select value={selectedMonth} onChange={setSelectedMonth}
            options={MONTHS.map((m,i) => ({ value:i+1, label:m }))} />
        </div>
        <div>
          <div style={{ fontSize:11, color:C.text3, marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>Year</div>
          <Select value={selectedYear} onChange={setSelectedYear} options={years} />
        </div>
      </div>

      {!selectedPropId ? (
        <EmptyState icon={FileText} title="Select a property" sub="Choose a property above to generate the owner statement." />
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:16, alignItems:"flex-start" }}>

          {/* Main Statement */}
          <div id="statement-print-area" style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>

            {/* Header */}
            <div style={{ background:"linear-gradient(135deg, #1a2744, #0f1a30)", padding:"26px 28px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:"#fff", marginBottom:2 }}>OWNER STATEMENT</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", letterSpacing:"0.06em" }}>{statementMonth} · Zwart Group</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Generated</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"rgba(255,255,255,0.8)" }}>{fmtDate(TODAY)}</div>
                </div>
              </div>
            </div>

            <div style={{ padding:"22px 24px" }}>

              {/* Property & Owner Info */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20,
                padding:"16px 0", borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize:10, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8, fontWeight:700 }}>Property</div>
                  <div style={{ fontSize:15, fontWeight:700, color:C.text1, marginBottom:3 }}>{prop?.name}</div>
                  <div style={{ fontSize:12, color:C.text3 }}>{prop?.area} · {prop?.type}</div>
                  {prop?.address && <div style={{ fontSize:11, color:C.text3, marginTop:3 }}>{prop.address}</div>}
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8, fontWeight:700 }}>Owner</div>
                  {prop?.ownerName ? (
                    <>
                      <div style={{ fontSize:15, fontWeight:600, color:C.text1, marginBottom:3 }}>{prop.ownerName}</div>
                      {prop.ownerEmail && <div style={{ fontSize:12, color:C.text3, marginBottom:2 }}>{prop.ownerEmail}</div>}
                      {prop.ownerPhone && <div style={{ fontSize:12, color:C.text3 }}>{prop.ownerPhone}</div>}
                    </>
                  ) : (
                    <button onClick={startEditOwner} style={{ background:"none", border:`1px solid ${C.amber}40`,
                      borderRadius:6, padding:"6px 12px", cursor:"pointer", color:C.amber, fontSize:12 }}>
                      ⚠️ Add owner details
                    </button>
                  )}
                </div>
              </div>

              {/* Revenue Summary */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Revenue Summary</div>
                <div style={{ background:C.bg2, borderRadius:8, overflow:"hidden" }}>
                  <StatRow label="Total Reservations" value={String(bookings.length)} />
                  <StatRow label="Gross Revenue" value={fmtCurr(grossRevenue)} />
                  <StatRow label="Platform Commission (~3%)" value={`- ${fmtCurr(platformComm)}`} dimmed negative />
                  <StatRow label="Net Revenue" value={fmtCurr(netRevenue)} bold />
                </div>
              </div>

              {/* Management Fee */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Management Fee</div>
                <div style={{ background:C.bg2, borderRadius:8, overflow:"hidden" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 14px", borderBottom:`1px solid ${C.border}20` }}>
                    <span style={{ fontSize:13, color:C.text2 }}>Management Fee</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <input type="number" value={prop?.managementFee||20}
                          onChange={e => dispatch({ type:"UPDATE_PROPERTY", payload:{ id:prop.id, managementFee:Number(e.target.value) }})}
                          style={{ ...inputStyle, width:60, textAlign:"center", padding:"3px 6px", fontSize:13 }} />
                        <span style={{ fontSize:12, color:C.text3 }}>%</span>
                      </div>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:C.crimson, fontWeight:600 }}>
                        - {fmtCurr(managementFee)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Expenses This Month</div>
                <div style={{ background:C.bg2, borderRadius:8, overflow:"hidden" }}>
                  <InputRow label="Cleaning Costs" value={expenses.cleaningCosts}
                    onChange={v => setExpenses(e => ({...e, cleaningCosts:v}))} />
                  <InputRow label="Maintenance" value={expenses.maintenanceCosts}
                    onChange={v => setExpenses(e => ({...e, maintenanceCosts:v}))} />
                  <InputRow label="Linen Costs" value={expenses.linenCosts}
                    onChange={v => setExpenses(e => ({...e, linenCosts:v}))} />

                  {/* Extra expenses */}
                  {(expenses.extras||[]).map((x,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", padding:"8px 14px",
                      borderBottom:`1px solid ${C.border}20`, gap:8 }}>
                      <input value={x.label} onChange={e => updateExtra(i,"label",e.target.value)}
                        placeholder="Expense name..." style={{ ...inputStyle, flex:1, padding:"4px 8px", fontSize:13 }} />
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ fontSize:12, color:C.text3 }}>R</span>
                        <input type="number" value={x.amount} onChange={e => updateExtra(i,"amount",e.target.value)}
                          placeholder="0.00" style={{ ...inputStyle, width:110, textAlign:"right", padding:"4px 8px", fontSize:13 }} />
                      </div>
                      <button onClick={() => removeExtra(i)}
                        style={{ background:"none", border:"none", cursor:"pointer", color:C.crimson, padding:4 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Add expense button */}
                  <div style={{ padding:"10px 14px" }}>
                    <button onClick={addExtra}
                      style={{ background:"none", border:`1px dashed ${C.border}`, borderRadius:6,
                        padding:"6px 14px", cursor:"pointer", color:C.text3, fontSize:12,
                        display:"flex", alignItems:"center", gap:6, width:"100%" }}>
                      <Plus size={12} /> Add expense line
                    </button>
                  </div>

                  {/* Expenses total */}
                  {totalExpenses > 0 && (
                    <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 14px",
                      background:C.bg3, borderTop:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:13, fontWeight:600, color:C.text2 }}>Total Expenses</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:C.crimson, fontWeight:600 }}>
                        - {fmtCurr(totalExpenses)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Net Payout */}
              <div style={{ background:"linear-gradient(135deg, rgba(0,212,184,0.12), rgba(0,212,184,0.06))",
                border:`1px solid ${C.teal}40`, borderRadius:10, padding:"18px 20px", marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:11, color:C.teal, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>NET OWNER PAYOUT</div>
                    <div style={{ fontSize:11, color:C.text3 }}>{statementMonth} · After all deductions</div>
                  </div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:26, fontWeight:800,
                    color: netOwnerPayout >= 0 ? C.teal : C.crimson }}>
                    {fmtCurr(netOwnerPayout)}
                  </div>
                </div>
              </div>

              {/* Booking Breakdown */}
              {bookings.length > 0 && (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Booking Breakdown</div>
                  <div style={{ background:C.bg2, borderRadius:8, overflow:"hidden", overflowX:"auto" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px 50px 100px", minWidth:440,
                      padding:"8px 14px", background:C.bg3 }}>
                      {["Guest","Check-in","Check-out","Nts","Revenue"].map(h => (
                        <div key={h} style={{ fontSize:10, color:C.text3, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</div>
                      ))}
                    </div>
                    {bookings.map(b => (
                      <div key={b.id} style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px 50px 100px", minWidth:440,
                        padding:"9px 14px", borderTop:`1px solid ${C.border}20`, alignItems:"center" }}>
                        <div style={{ fontSize:12, color:C.text1, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {b.guestName}
                          <span style={{ fontSize:10, color:C.text3, marginLeft:6 }}>{b.platform}</span>
                        </div>
                        <div style={{ fontSize:11, color:C.text2, fontFamily:"'DM Mono',monospace" }}>{fmtShort(b.checkIn)}</div>
                        <div style={{ fontSize:11, color:C.text2, fontFamily:"'DM Mono',monospace" }}>{fmtShort(b.checkOut)}</div>
                        <div style={{ fontSize:11, color:C.text2, fontFamily:"'DM Mono',monospace" }}>{b.nights}</div>
                        <div style={{ fontSize:12, color:C.teal, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>
                          {b.revenue > 0 ? fmtCurr(b.revenue) : "—"}
                        </div>
                      </div>
                    ))}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px 50px 100px", minWidth:440,
                      padding:"9px 14px", borderTop:`2px solid ${C.border}`, background:C.bg3 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.text1 }}>TOTAL</div>
                      <div /><div />
                      <div style={{ fontSize:12, fontWeight:700, color:C.text1, fontFamily:"'DM Mono',monospace" }}>
                        {bookings.reduce((s,b)=>s+b.nights,0)}n
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.teal, fontFamily:"'DM Mono',monospace" }}>
                        {fmtCurr(grossRevenue)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {bookings.length === 0 && (
                <div style={{ textAlign:"center", padding:"20px", color:C.text3, fontSize:13 }}>
                  No bookings found for {statementMonth}
                </div>
              )}

              {/* Footer */}
              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, marginTop:16,
                display:"flex", justifyContent:"space-between", fontSize:11, color:C.text3 }}>
                <span>Zwart Group · Ops & Portfolio Command</span>
                <span>Generated {fmtDate(TODAY)}</span>
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Card>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>Statement Summary</div>
              {[
                { label:"Gross Revenue", value:fmtCurr(grossRevenue), color:C.teal },
                { label:"Platform Commission", value:`- ${fmtCurr(platformComm)}`, color:C.text3 },
                { label:"Net Revenue", value:fmtCurr(netRevenue), color:C.text1 },
                { label:`Mgmt Fee (${prop?.managementFee||20}%)`, value:`- ${fmtCurr(managementFee)}`, color:C.crimson },
                { label:"Total Expenses", value:`- ${fmtCurr(totalExpenses)}`, color:C.amber },
              ].map(item => (
                <div key={item.label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0",
                  borderBottom:`1px solid ${C.border}20` }}>
                  <span style={{ fontSize:12, color:C.text3 }}>{item.label}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:item.color, fontWeight:500 }}>{item.value}</span>
                </div>
              ))}
              <div style={{ marginTop:12, paddingTop:12, borderTop:`2px solid ${C.teal}40` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>Owner Payout</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:18, fontWeight:800,
                    color:netOwnerPayout>=0?C.teal:C.crimson }}>{fmtCurr(netOwnerPayout)}</span>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Quick Stats</div>
              {[
                { label:"Bookings", value:bookings.length },
                { label:"Total Nights", value:bookings.reduce((s,b)=>s+b.nights,0) },
                { label:"Avg/booking", value:bookings.length ? fmtCurr(grossRevenue/bookings.length) : "—" },
                { label:"Occupancy est.", value:bookings.length ? `${Math.round(bookings.reduce((s,b)=>s+b.nights,0)/30*100)}%` : "—" },
              ].map(s => (
                <div key={s.label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}20` }}>
                  <span style={{ fontSize:12, color:C.text3 }}>{s.label}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.text1, fontWeight:600 }}>{s.value}</span>
                </div>
              ))}
            </Card>
          </div>

        </div>
      )}

      {/* Owner Details Modal */}
      <Modal open={editingOwner} onClose={() => setEditingOwner(false)} title="Owner Details" width={460}>
        {prop && (
          <div>
            <div style={{ background:C.bg2, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:C.text2 }}>
              Editing owner info for <strong style={{ color:C.text1 }}>{prop.name}</strong>
            </div>
            <FormRow label="Owner Full Name">
              <Input value={ownerForm.ownerName} onChange={v=>setOwnerForm(f=>({...f,ownerName:v}))} placeholder="e.g. John Smith" />
            </FormRow>
            <FormRow label="Owner Email">
              <Input value={ownerForm.ownerEmail} onChange={v=>setOwnerForm(f=>({...f,ownerEmail:v}))} placeholder="owner@email.com" />
            </FormRow>
            <FormRow label="Owner Phone">
              <Input value={ownerForm.ownerPhone} onChange={v=>setOwnerForm(f=>({...f,ownerPhone:v}))} placeholder="+27 82 000 0000" />
            </FormRow>
            <FormRow label="Management Fee (%)">
              <Input type="number" value={ownerForm.managementFee} onChange={v=>setOwnerForm(f=>({...f,managementFee:Number(v)}))} placeholder="20" />
            </FormRow>
            <div style={{ display:"flex", gap:8 }}>
              <Btn variant="primary" icon={Save} onClick={saveOwner}>Save Details</Btn>
              <Btn variant="ghost" onClick={() => setEditingOwner(false)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


// ─── TEAM & VENDORS ──────────────────────────────────────────────────────────
function TeamVendors() {
  const { state, dispatch, toast } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name:"", role:"Housekeeper", phone:"", notes:"", portfolio:["1","2"] });

  const handleAdd = () => {
    if (!form.name) return toast("Name is required","error");
    const id = "T"+String(state.team.length+1).padStart(3,"0");
    dispatch({ type:"ADD_TEAM_MEMBER", payload:{
      id, name:form.name, role:form.role, phone:form.phone,
      notes:form.notes, portfolio:form.portfolio.map(Number),
      rating:0, completedCleans:0, active:true,
    }});
    toast(form.name+" added");
    setShowAdd(false);
    setForm({ name:"", role:"Housekeeper", phone:"", notes:"", portfolio:["1","2"] });
  };

  const togglePort = (p) => setForm(f => ({
    ...f, portfolio: f.portfolio.includes(p) ? f.portfolio.filter(x=>x!==p) : [...f.portfolio,p]
  }));

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <SectionTitle>Team & Vendors</SectionTitle>
        <Btn variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Add Member</Btn>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <KPICard label="Total Members" value={state.team.length} color={C.teal} icon={Users} />
        <KPICard label="Housekeepers" value={state.team.filter(m=>m.role==="Housekeeper"||m.role==="Senior Housekeeper").length} color={C.blue} />
        <KPICard label="Vendors" value={state.team.filter(m=>m.role!=="Housekeeper"&&m.role!=="Senior Housekeeper").length} color={C.amber} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
        {state.team.map(m => (
          <Card key={m.id} hover>
            <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:C.tealBg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:16, fontWeight:700, color:C.teal, flexShrink:0 }}>
                {m.name.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
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
                <div style={{ fontSize:12, color:C.text3, marginBottom:6 }}>{m.role}</div>
                <div style={{ display:"flex", gap:12, fontSize:11, color:C.text2, flexWrap:"wrap" }}>
                  {m.phone && <span style={{ display:"flex", alignItems:"center", gap:4 }}><Phone size={11}/>{m.phone}</span>}
                  {m.rating > 0 && <span>⭐ {m.rating}</span>}
                </div>
                {m.notes && <div style={{ marginTop:4, fontSize:11, color:C.text3 }}>{m.notes}</div>}
                <div style={{ marginTop:4, fontSize:11, color:C.text3 }}>
                  Portfolio: {m.portfolio?.includes(1)&&m.portfolio?.includes(2)?"P1 + P2":m.portfolio?.includes(1)?"P1 only":"P2 only"}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Team Member / Vendor">
        <FormRow label="Full Name" required><Input value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="e.g. Thandiwe Mokoena" /></FormRow>
        <FormRow label="Role"><Select value={form.role} onChange={v=>setForm(f=>({...f,role:v}))}
          options={["Housekeeper","Senior Housekeeper","Maintenance Contractor","Internet & Tech","Plumber","Electrician","Pool Service","Garden Service","Other"]} /></FormRow>
        <FormRow label="Phone"><Input value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="+27 82 000 0000" /></FormRow>
        <FormRow label="Notes"><Input value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))} placeholder="Speciality, availability..." /></FormRow>
        <FormRow label="Portfolio">
          <div style={{ display:"flex", gap:10 }}>
            {["1","2"].map(p => (
              <div key={p} onClick={() => togglePort(p)}
                style={{ padding:"8px 20px", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:500,
                  background:form.portfolio.includes(p)?C.tealBg:C.bg2,
                  border:`1px solid ${form.portfolio.includes(p)?C.teal:C.border}`,
                  color:form.portfolio.includes(p)?C.teal:C.text2 }}>
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
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove Member" width={380}>
        {confirmDelete && (
          <div style={{ textAlign:"center", padding:"10px 0 20px" }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:C.crimsonBg,
              display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
              <Trash2 size={20} color={C.crimson} />
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:C.text1, marginBottom:6 }}>Remove {confirmDelete.name}?</div>
            <div style={{ fontSize:12, color:C.text3, marginBottom:20 }}>This will permanently remove them from the team list.</div>
            <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
              <Btn variant="danger" onClick={() => { dispatch({type:"REMOVE_TEAM_MEMBER",payload:confirmDelete.id}); toast(confirmDelete.name+" removed"); setConfirmDelete(null); }}>Yes, Remove</Btn>
              <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
            </div>
          </div>
        )}
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



// ─── PROPERTIES ──────────────────────────────────────────────────────────────
function PropertiesModule() {
  const { state, dispatch, toast } = useApp();
  const [search, setSearch] = useState("");
  const [portFilter, setPortFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showOffboard, setShowOffboard] = useState(null);
  const [form, setForm] = useState({ id:"", name:"", address:"", area:"", type:"Apartment", portfolio:"1" });

  const handleAdd = () => {
    if (!form.id || !form.name) return toast("Property ID and Name are required","error");
    if (state.properties.find(p => p.id === form.id.toUpperCase())) return toast("Property ID already exists","error");
    dispatch({ type:"ADD_PROPERTY", payload:{
      id:form.id.toUpperCase(), name:form.name, address:form.address,
      area:form.area, type:form.type, portfolio:Number(form.portfolio),
      flag:null, status:"Active",
    }});
    toast("Property added");
    setShowAdd(false);
    setForm({ id:"", name:"", address:"", area:"", type:"Apartment", portfolio:"1" });
  };

  const handleOffboard = (prop) => {
    dispatch({ type:"UPDATE_PROPERTY", payload:{ id:prop.id, status:"Offboarded" }});
    toast(prop.name + " offboarded");
    setShowOffboard(null); setSelected(null);
  };

  const handleReactivate = (prop) => {
    dispatch({ type:"UPDATE_PROPERTY", payload:{ id:prop.id, status:"Active" }});
    toast(prop.name + " reactivated");
  };

  const filtered = state.properties.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      (p.area||"").toLowerCase().includes(search.toLowerCase());
    const mp = portFilter==="All" || p.portfolio===Number(portFilter);
    const mst = statusFilter==="All" || p.status===statusFilter;
    return ms && mp && mst;
  });

  const getPropBookings = (id, name) => state.bookings.filter(b => b.propId===id || b.propertyName===name);
  const getPropRevenue  = (id, name) => getPropBookings(id,name).reduce((s,b)=>s+b.revenue,0);

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <SectionTitle>Properties</SectionTitle>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search property..." />
          <Select value={portFilter} onChange={setPortFilter} options={["All","1","2"]} style={{ width:110 }} />
          <Select value={statusFilter} onChange={setStatusFilter} options={["Active","Offboarded","All"]} style={{ width:130 }} />
          <Btn variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Add Property</Btn>
        </div>
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <KPICard label="Total" value={state.properties.length} color={C.teal} />
        <KPICard label="Active" value={state.properties.filter(p=>p.status==="Active").length} color={C.green} />
        <KPICard label="Offboarded" value={state.properties.filter(p=>p.status==="Offboarded").length} color={C.crimson} />
        <KPICard label="Portfolio 1" value={state.properties.filter(p=>p.portfolio===1&&p.status==="Active").length} color={C.blue} />
        <KPICard label="Portfolio 2" value={state.properties.filter(p=>p.portfolio===2&&p.status==="Active").length} color={C.amber} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:12 }}>
        {filtered.map(p => {
          const bks = getPropBookings(p.id, p.name);
          const rev = getPropRevenue(p.id, p.name);
          const curr = bks.find(b => b.status==="In-House");
          const isOff = p.status==="Offboarded";
          return (
            <div key={p.id} onClick={() => setSelected(p)}
              style={{ background:C.bg1, border:`1px solid ${isOff?C.crimson+"30":C.border}`,
                borderRadius:10, padding:16, cursor:"pointer", opacity:isOff?0.65:1 }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, display:"flex",
                  alignItems:"center", justifyContent:"center",
                  background:isOff?C.crimsonBg:p.portfolio===1?C.tealBg:C.amberBg }}>
                  <Building size={16} color={isOff?C.crimson:p.portfolio===1?C.teal:C.amber} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:3, flexWrap:"wrap" }}>
                    <span style={{ fontSize:10, padding:"1px 5px", borderRadius:3, fontWeight:600,
                      background:p.portfolio===1?C.tealBg:C.amberBg,
                      color:p.portfolio===1?C.teal:C.amber }}>P{p.portfolio}</span>
                    {curr && <Badge label="In-House" size="xs" />}
                    {isOff && <span style={{ fontSize:10, color:C.crimson, fontWeight:600 }}>Offboarded</span>}
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                  <div style={{ fontSize:11, color:C.text3 }}>{p.area} · {p.type}</div>
                  <div style={{ display:"flex", gap:12, marginTop:6, fontSize:11 }}>
                    <span style={{ color:C.text2 }}>{bks.length} bookings</span>
                    <span style={{ color:C.teal, fontFamily:"'DM Mono',monospace" }}>R {(rev/1000).toFixed(1)}k</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState icon={Building} title="No properties found" sub="Adjust your filters." />}
      </div>

      {/* Property Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name||""} width={560}>
        {selected && (() => {
          const bks = getPropBookings(selected.id, selected.name);
          const rev = getPropRevenue(selected.id, selected.name);
          const curr = bks.find(b => b.status==="In-House");
          const isOff = selected.status==="Offboarded";
          return (
            <div>
              {isOff && <div style={{ background:C.crimsonBg, border:`1px solid ${C.crimson}30`, borderRadius:6, padding:"8px 12px", marginBottom:12, fontSize:12, color:C.crimson }}>⚠️ This property is offboarded</div>}
              {selected.flag && <div style={{ background:C.amberBg, border:`1px solid ${C.amber}30`, borderRadius:6, padding:"8px 12px", marginBottom:12, fontSize:12, color:C.amber }}>{selected.flag}</div>}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
                {[["ID",selected.id],["Area",selected.area],["Portfolio","Portfolio "+selected.portfolio],
                  ["Type",selected.type],["Status",selected.status],["Revenue","R "+(rev/1000).toFixed(1)+"k"]].map(([k,v])=>(
                  <div key={k} style={{ background:C.bg2, borderRadius:6, padding:"10px 12px" }}>
                    <div style={{ fontSize:10, color:C.text3, marginBottom:2 }}>{k}</div>
                    <div style={{ fontSize:13, color:C.text1, fontWeight:500 }}>{v}</div>
                  </div>
                ))}
              </div>
              {selected.address && <div style={{ fontSize:12, color:C.text3, marginBottom:12 }}>{selected.address}</div>}
              {curr && (
                <div style={{ background:C.tealBg, border:`1px solid ${C.teal}30`, borderRadius:8, padding:"10px 14px", marginBottom:12 }}>
                  <div style={{ fontSize:11, color:C.teal, fontWeight:600, marginBottom:4 }}>CURRENTLY IN-HOUSE</div>
                  <div style={{ fontSize:13, color:C.text1 }}>{curr.guestName} · {curr.nights} nights · {fmtDate(curr.checkIn)} → {fmtDate(curr.checkOut)}</div>
                </div>
              )}
              <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginBottom:8 }}>Recent Bookings ({bks.length})</div>
              {bks.slice(0,5).map(b => (
                <div key={b.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.border}20`, fontSize:12 }}>
                  <span style={{ flex:1, color:C.text1 }}>{b.guestName}</span>
                  <span style={{ color:C.text3, fontFamily:"'DM Mono',monospace" }}>{fmtShort(b.checkIn)} → {fmtShort(b.checkOut)}</span>
                  <Badge label={b.status} size="xs" />
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:16 }}>
                {isOff
                  ? <Btn variant="primary" icon={CheckCircle} onClick={() => handleReactivate(selected)}>Reactivate</Btn>
                  : <Btn variant="danger" icon={XCircle} onClick={() => setShowOffboard(selected)}>Offboard Property</Btn>
                }
                <Btn variant="ghost" onClick={() => setSelected(null)}>Close</Btn>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Add Property Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Property" width={500}>
        <FormRow label="Property ID (e.g. ZG-053)" required>
          <Input value={form.id} onChange={v => setForm(f=>({...f,id:v}))} placeholder="ZG-053" />
        </FormRow>
        <FormRow label="Property Name" required>
          <Input value={form.name} onChange={v => setForm(f=>({...f,name:v}))} placeholder="e.g. 201 The Suro" />
        </FormRow>
        <FormRow label="Full Address">
          <Input value={form.address} onChange={v => setForm(f=>({...f,address:v}))} placeholder="Street, Cape Town, 8000" />
        </FormRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormRow label="Area"><Input value={form.area} onChange={v => setForm(f=>({...f,area:v}))} placeholder="e.g. Sea Point" /></FormRow>
          <FormRow label="Type"><Select value={form.type} onChange={v => setForm(f=>({...f,type:v}))} options={["Apartment","House","Cottage","Villa","Studio"]} /></FormRow>
        </div>
        <FormRow label="Portfolio">
          <Select value={form.portfolio} onChange={v => setForm(f=>({...f,portfolio:v}))}
            options={[{value:"1",label:"Portfolio 1"},{value:"2",label:"Portfolio 2"}]} />
        </FormRow>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="primary" icon={Plus} onClick={handleAdd}>Add Property</Btn>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
        </div>
      </Modal>

      {/* Offboard Confirmation */}
      <Modal open={!!showOffboard} onClose={() => setShowOffboard(null)} title="Offboard Property" width={420}>
        {showOffboard && (
          <div style={{ textAlign:"center", padding:"10px 0 20px" }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:C.crimsonBg,
              display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <XCircle size={24} color={C.crimson} />
            </div>
            <div style={{ fontSize:15, fontWeight:600, color:C.text1, marginBottom:8 }}>Offboard {showOffboard.name}?</div>
            <div style={{ fontSize:13, color:C.text3, marginBottom:24, lineHeight:1.6 }}>
              This marks the property as offboarded. All historical data is kept. You can reactivate at any time.
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
              <Btn variant="danger" icon={XCircle} onClick={() => handleOffboard(showOffboard)}>Yes, Offboard</Btn>
              <Btn variant="ghost" onClick={() => setShowOffboard(null)}>Cancel</Btn>
            </div>
          </div>
        )}
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
          <div style={{ fontSize:13, fontWeight:700, color:C.teal, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
            <Zap size={16} color={C.teal} /> Hospitable Auto-Sync
            {state.settings.hospitable?.enabled && (
              <span style={{ fontSize:11, background:C.greenBg, color:C.green, padding:"2px 8px", borderRadius:4, fontWeight:600 }}>● LIVE</span>
            )}
          </div>
          <div style={{ fontSize:12, color:C.text3, marginBottom:16 }}>
            Paste your Hospitable MCP URL below. The app will automatically pull new bookings every time it loads and every 5 minutes while open.
          </div>

          <FormRow label="Hospitable API Token" required>
            <Input value={hospForm.apiUrl || ""} onChange={v => setHospForm(f => ({...f, apiUrl:v}))}
              placeholder="Paste your Hospitable API token here..." />
          </FormRow>

          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16 }}>
            <div onClick={() => setHospForm(f => ({...f, enabled: !f.enabled}))}
              style={{ width:44, height:24, borderRadius:12, cursor:"pointer", transition:"background 0.2s",
                background: hospForm.enabled ? C.teal : C.border, position:"relative" }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff", position:"absolute",
                top:3, transition:"left 0.2s", left: hospForm.enabled ? 23 : 3 }} />
            </div>
            <span style={{ fontSize:13, color: hospForm.enabled ? C.teal : C.text2, fontWeight:500 }}>
              {hospForm.enabled ? "Auto-sync enabled" : "Auto-sync disabled"}
            </span>
          </div>

          {/* Status */}
          <div style={{ background:C.bg2, borderRadius:8, padding:"12px 16px", marginBottom:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <div>
                <div style={{ fontSize:10, color:C.text3, marginBottom:2 }}>Last Sync</div>
                <div style={{ fontSize:13, color:C.text1, fontWeight:500 }}>
                  {state.settings.hospitable?.lastSync
                    ? new Date(state.settings.hospitable.lastSync).toLocaleString()
                    : "Never"}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:C.text3, marginBottom:2 }}>Total Bookings</div>
                <div style={{ fontSize:13, color:C.teal, fontWeight:600, fontFamily:"'DM Mono',monospace" }}>
                  {state.bookings.length}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:C.text3, marginBottom:2 }}>Sync Behaviour</div>
                <div style={{ fontSize:13, color:C.text1 }}>Add new only · Skip duplicates</div>
              </div>
            </div>
          </div>

          {syncResult && (
            <div style={{ background: syncResult.error ? C.crimsonBg : C.greenBg,
              border:`1px solid ${syncResult.error ? C.crimson : C.green}30`,
              borderRadius:6, padding:"10px 14px", marginBottom:12, fontSize:12,
              color: syncResult.error ? C.crimson : C.green }}>
              {syncResult.error ? "⚠️ " : "✓ "}{syncResult.message}
            </div>
          )}

          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="primary" icon={Save} onClick={async () => {
              dispatch({ type:"UPDATE_SETTINGS", payload:{ hospitable: hospForm }});
              toast("Settings saved");
              if (hospForm.enabled && hospForm.apiUrl) {
                setSyncing(true); setSyncResult(null);
                try {
                  const count = await syncFromHospitable(hospForm.apiUrl, state, dispatch, toast);
                  setSyncResult({ message: count + " new booking" + (count!==1?"s":"") + " added from Hospitable" });
                } catch(e) {
                  setSyncResult({ error:true, message: e.message });
                } finally { setSyncing(false); }
              }
            }} disabled={syncing}>
              {syncing ? "Syncing..." : "Save & Sync Now"}
            </Btn>
            <Btn variant="subtle" icon={RefreshCw} onClick={async () => {
              if (!hospForm.apiUrl) return toast("Enter your MCP URL first","error");
              setSyncing(true); setSyncResult(null);
              try {
                const count = await syncFromHospitable(hospForm.apiUrl, state, dispatch, toast);
                setSyncResult({ message: count + " new booking" + (count!==1?"s":"") + " added" });
              } catch(e) {
                setSyncResult({ error:true, message: e.message });
              } finally { setSyncing(false); }
            }} disabled={syncing}>
              {syncing ? "Syncing..." : "Sync Now"}
            </Btn>
          </div>

          <div style={{ marginTop:12, fontSize:11, color:C.text3, lineHeight:1.6 }}>
            💡 Your API token is a long string starting with <span style={{ fontFamily:"'DM Mono',monospace", color:C.teal }}>eyJ...</span> — find it in Hospitable → Settings → API → Personal Access Tokens.
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


// ─── MODULE ROUTER ────────────────────────────────────────────────────────────
function ModuleContent({ active, onNav }) {
  const map = {
    dashboard:   <Dashboard onNav={onNav} />,
    reservations: <Reservations />,
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

// ─── HOSPITABLE SYNC ─────────────────────────────────────────────────────────
async function syncFromHospitable(token, state, dispatch, toast) {
  if (!token) throw new Error("No API token configured");

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  // Fetch reservations from Hospitable REST API
  // Hospitable API: GET /v1/reservations
  let allReservations = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`https://api.hospitable.com/v1/reservations?per_page=100&page=${page}&status=accepted`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `API error ${res.status}`);
    }
    const data = await res.json();

    // Hospitable returns { data: [...], meta: { current_page, last_page } }
    const items = data.data || data.reservations || data || [];
    if (!Array.isArray(items) || items.length === 0) { hasMore = false; break; }
    allReservations = allReservations.concat(items);

    const meta = data.meta || {};
    if (meta.current_page && meta.last_page && meta.current_page < meta.last_page) {
      page++;
    } else {
      hasMore = false;
    }
  }

  // Also fetch cancelled reservations
  try {
    const cancelRes = await fetch(`https://api.hospitable.com/v1/reservations?per_page=100&status=cancelled`, { headers });
    if (cancelRes.ok) {
      const cancelData = await cancelRes.json();
      const cancelled = cancelData.data || cancelData.reservations || [];
      allReservations = allReservations.concat(cancelled.map(r => ({ ...r, _isCancelled: true })));
    }
  } catch {}

  if (allReservations.length === 0) {
    toast("Hospitable connected — no reservations found", "info");
    return 0;
  }

  // Get existing booking IDs to avoid duplicates
  const existingIds = new Set(state.bookings.map(b => b.id));
  let addedCount = 0;

  allReservations.forEach(r => {
    // Hospitable reservation fields
    const id = String(
      r.code || r.id || r.reservation_code || r.confirmation_code || ""
    ).trim();
    if (!id || existingIds.has(id)) return;

    // Dates
    const checkIn  = (r.check_in  || r.checkin  || r.arrival   || r.start_date || "").slice(0,10);
    const checkOut = (r.check_out || r.checkout || r.departure || r.end_date   || "").slice(0,10);
    if (!checkIn || !checkOut || checkIn >= checkOut) return;

    // Guest name
    const guest = r.guest?.full_name || r.guest?.name || r.guest_name ||
      [r.guest?.first_name, r.guest?.last_name].filter(Boolean).join(" ") || "Guest";

    // Property name
    const propName = r.property?.name || r.listing?.name || r.property_name ||
      r.listing_name || r.unit_name || "Unknown Property";

    // Platform / channel
    const platform = r.platform || r.channel?.name || r.source ||
      r.booking_channel || "Airbnb";

    // Revenue
    const revenue = Number(
      r.revenue?.total || r.total_price || r.amount ||
      r.payout?.amount || r.host_payout || 0
    );

    const booking = mkBookingDirect(id, guest, propName, checkIn, checkOut, platform, revenue, []);
    if (r._isCancelled) booking.bookingStatus = "Cancelled";

    dispatch({ type:"ADD_BOOKING", payload:booking });
    existingIds.add(id); // prevent adding same booking twice if it appears in multiple pages
    addedCount++;
  });

  // Update last sync timestamp
  dispatch({ type:"UPDATE_SETTINGS", payload:{
    hospitable: { ...state.settings.hospitable, lastSync: new Date().toISOString() }
  }});

  if (addedCount > 0) {
    toast(`✓ Hospitable sync — ${addedCount} new booking${addedCount!==1?"s":""} added`);
  } else {
    toast("✓ Hospitable sync — up to date, no new bookings");
  }

  return addedCount;
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
function AppInner() {
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { state, dispatch, toast } = useApp();

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-sync from Hospitable on load and every 5 minutes
  useEffect(() => {
    const doSync = async () => {
      const apiUrl = state.settings?.hospitable?.apiUrl;
      if (!apiUrl || !state.settings?.hospitable?.enabled) return;
      try {
        await syncFromHospitable(apiUrl, state, dispatch, toast); // apiUrl field stores the token
      } catch(e) {
        console.warn("Hospitable auto-sync failed:", e.message);
      }
    };
    doSync();
    const interval = setInterval(doSync, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(interval);
  }, [state.settings?.hospitable?.apiUrl, state.settings?.hospitable?.enabled]);

  const handleNav = (id) => {
    setActive(id);
    if (isMobile) setMobileNavOpen(false);
  };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:C.bg0, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar active={active} onNav={handleNav} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      )}

      {/* Mobile Nav Drawer */}
      {isMobile && mobileNavOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:999, display:"flex" }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)" }} onClick={() => setMobileNavOpen(false)} />
          <div style={{ position:"relative", width:280, background:C.bg1, height:"100%", overflowY:"auto",
            borderRight:`1px solid ${C.border}`, animation:"slideIn 0.25s ease", zIndex:1 }}>
            <Sidebar active={active} onNav={handleNav} collapsed={false} onToggle={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Mobile Top Bar */}
        {isMobile ? (
          <div style={{ height:52, background:C.bg1, borderBottom:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", padding:"0 16px", gap:12, flexShrink:0 }}>
            <button onClick={() => setMobileNavOpen(true)}
              style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:7,
                padding:"6px 8px", cursor:"pointer", color:C.text1, display:"flex", alignItems:"center" }}>
              <Menu size={18} />
            </button>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:C.platinum, flex:1 }}>
              {NAV.find(n => n.id === active)?.label || "Dashboard"}
            </span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.text3 }}>
              {new Date().toLocaleDateString("en-ZA",{day:"numeric",month:"short"})}
            </span>
          </div>
        ) : (
          <TopBar module={active} />
        )}

        <main style={{ flex:1, overflowY:"auto", padding: isMobile ? "16px 14px 80px" : 24 }}>
          <ModuleContent active={active} onNav={handleNav} />
        </main>

        {/* Mobile Bottom Nav Bar */}
        {isMobile && (
          <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.bg1,
            borderTop:`1px solid ${C.border}`, display:"flex", zIndex:100, height:60 }}>
            {[
              { id:"dashboard",    icon:Home,         label:"Home" },
              { id:"reservations", icon:BookMarked,   label:"Reservations" },
              { id:"cleans",       icon:Calendar,     label:"Cleans" },
              { id:"housekeeping", icon:Users,        label:"HK" },
              { id:"incidents",    icon:AlertTriangle,label:"Issues" },
            ].map(({ id, icon:Icon, label }) => {
              const isAct = active === id;
              return (
                <button key={id} onClick={() => handleNav(id)}
                  style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                    justifyContent:"center", gap:3, background:"none", border:"none", cursor:"pointer",
                    color: isAct ? C.teal : C.text3, borderTop: isAct ? `2px solid ${C.teal}` : "2px solid transparent",
                    transition:"all 0.15s" }}>
                  <Icon size={18} />
                  <span style={{ fontSize:10, fontWeight: isAct ? 600 : 400 }}>{label}</span>
                </button>
              );
            })}
            <button onClick={() => setMobileNavOpen(true)}
              style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", gap:3, background:"none", border:"none", cursor:"pointer",
                color:C.text3, borderTop:"2px solid transparent" }}>
              <Menu size={18} />
              <span style={{ fontSize:10 }}>More</span>
            </button>
          </div>
        )}
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
// ─── BOOKING DETAIL MODAL ────────────────────────────────────────────────────
function BookingDetailModal({ booking, properties, onClose, onSave }) {
  const [editingProp, setEditingProp] = useState(false);
  const [editingGuest, setEditingGuest] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(false);
  const [propValue, setPropValue] = useState(booking.propertyName || "");
  const [guestValue, setGuestValue] = useState(booking.guestName || "");
  const [revenueValue, setRevenueValue] = useState(String(booking.revenue || ""));
  const [useCustomProp, setUseCustomProp] = useState(false);

  const activeProps = (properties || []).filter(p => p.status === "Active");

  const handleSave = () => {
    const updates = {
      propertyName: propValue,
      guestName: guestValue,
      revenue: Number(revenueValue) || 0,
    };
    onSave(updates);
  };

  const hasChanges = propValue !== booking.propertyName ||
    guestValue !== booking.guestName ||
    Number(revenueValue) !== booking.revenue;

  return (
    <Modal open={true} onClose={onClose} title="Booking Details" width={580}>
      {/* Property Name — editable */}
      <div style={{ background:C.bg2, borderRadius:8, padding:"14px 16px", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:editingProp?10:0 }}>
          <div>
            <div style={{ fontSize:10, color:C.text3, marginBottom:2, textTransform:"uppercase", letterSpacing:"0.06em" }}>Property Name</div>
            {!editingProp && (
              <div style={{ fontSize:15, fontWeight:700, color:C.text1 }}>{propValue}</div>
            )}
          </div>
          {!editingProp && (
            <Btn size="sm" variant="subtle" icon={Edit} onClick={() => setEditingProp(true)}>Edit</Btn>
          )}
        </div>
        {editingProp && (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <button onClick={() => setUseCustomProp(false)}
                style={{ fontSize:11, padding:"4px 10px", borderRadius:5, cursor:"pointer", border:"none",
                  background: !useCustomProp ? C.tealBg : C.bg3, color: !useCustomProp ? C.teal : C.text2, fontWeight:600 }}>
                Pick from list
              </button>
              <button onClick={() => setUseCustomProp(true)}
                style={{ fontSize:11, padding:"4px 10px", borderRadius:5, cursor:"pointer", border:"none",
                  background: useCustomProp ? C.tealBg : C.bg3, color: useCustomProp ? C.teal : C.text2, fontWeight:600 }}>
                Type custom
              </button>
            </div>
            {useCustomProp ? (
              <Input value={propValue} onChange={setPropValue} placeholder="Type property name..." />
            ) : (
              <Select value={propValue} onChange={setPropValue}
                options={["", ...activeProps.map(p => ({ value:p.name, label:p.name }))]} />
            )}
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <Btn size="sm" variant="primary" onClick={() => setEditingProp(false)}>Done</Btn>
              <Btn size="sm" variant="ghost" onClick={() => { setPropValue(booking.propertyName); setEditingProp(false); }}>Cancel</Btn>
            </div>
            {propValue && (
              <div style={{ marginTop:8, fontSize:11, color:C.teal }}>
                → Will be saved as: <strong>{propValue}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Other booking details grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
        {/* Guest Name - editable */}
        <div style={{ background:C.bg2, borderRadius:6, padding:"10px 12px" }}>
          <div style={{ fontSize:10, color:C.text3, marginBottom:2 }}>Guest Name</div>
          {editingGuest ? (
            <div>
              <Input value={guestValue} onChange={setGuestValue} style={{ marginBottom:6 }} />
              <Btn size="sm" variant="primary" onClick={() => setEditingGuest(false)}>Done</Btn>
            </div>
          ) : (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, color:C.text1, fontWeight:500 }}>{guestValue}</span>
              <button onClick={() => setEditingGuest(true)}
                style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:2 }}>
                <Edit size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Revenue - editable */}
        <div style={{ background:C.bg2, borderRadius:6, padding:"10px 12px" }}>
          <div style={{ fontSize:10, color:C.text3, marginBottom:2 }}>Revenue</div>
          {editingRevenue ? (
            <div>
              <Input type="number" value={revenueValue} onChange={setRevenueValue} style={{ marginBottom:6 }} />
              <Btn size="sm" variant="primary" onClick={() => setEditingRevenue(false)}>Done</Btn>
            </div>
          ) : (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, color:C.teal, fontFamily:"'DM Mono',monospace" }}>{fmtCurr(Number(revenueValue))}</span>
              <button onClick={() => setEditingRevenue(true)}
                style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:2 }}>
                <Edit size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Read-only fields */}
        {[
          ["Booking ID", booking.id],
          ["Platform", booking.platform],
          ["Check-in", fmtDate(booking.checkIn)],
          ["Check-out", fmtDate(booking.checkOut)],
          ["Nights", booking.nights],
          ["Status", booking.status],
        ].map(([k,v]) => (
          <div key={k} style={{ background:C.bg2, borderRadius:6, padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:C.text3, marginBottom:2 }}>{k}</div>
            <div style={{ fontSize:13, color:C.text1, fontWeight:500 }}>{v}</div>
          </div>
        ))}
      </div>

      {booking.notes && (
        <div style={{ background:C.amberBg, border:`1px solid ${C.amber}30`, borderRadius:6,
          padding:"8px 12px", marginBottom:12, fontSize:12, color:C.amber }}>
          {booking.notes}
        </div>
      )}

      {booking.nights >= 10 && (
        <div style={{ background:C.tealBg, border:`1px solid ${C.teal}30`, borderRadius:6,
          padding:"8px 12px", marginBottom:12, fontSize:12, color:C.teal }}>
          ✓ {booking.nights} nights — tracked in Res & Cleans with {booking.cleans.length} mid-stay clean{booking.cleans.length!==1?"s":""}
        </div>
      )}

      {booking.cleans.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginBottom:8 }}>Mid-Stay Cleans</div>
          {booking.cleans.map((c,i) => (
            <div key={i} style={{ display:"flex", gap:12, alignItems:"center", padding:"6px 0",
              borderBottom:`1px solid ${C.border}20`, fontSize:12 }}>
              <span style={{ color:C.text3 }}>Clean #{c.cleanNumber}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", color:C.text2 }}>{fmtDate(c.dueDate)}</span>
              <Badge label={c.status} size="xs" />
              {c.assignedHousekeeper && <span style={{ color:C.teal }}>👤 {c.assignedHousekeeper}</span>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:8 }}>
        {hasChanges && <Btn variant="primary" icon={Save} onClick={handleSave}>Save Changes</Btn>}
        <Btn variant="ghost" onClick={onClose}>{hasChanges ? "Cancel" : "Close"}</Btn>
      </div>
    </Modal>
  );
}

// ─── RESERVATIONS ────────────────────────────────────────────────────────────
function Reservations() {
  const { state, dispatch, toast } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [sortBy, setSortBy] = useState("checkIn");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [nbForm, setNbForm] = useState({ id:"", guestName:"", propId:"", checkIn:"", checkOut:"", platform:"Airbnb", revenue:"", notes:"" });
  const [bookingStatusFilter, setBookingStatusFilter] = useState("Accepted");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const bookings = state.bookings;

  const toISO = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0,10);
    if (typeof v === "number") {
      // Excel serial date
      const d = new Date((v - 25569) * 86400 * 1000);
      return d.toISOString().slice(0,10);
    }
    const s = String(v).trim();
    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (dmy) {
      const yr = dmy[3].length === 2 ? "20"+dmy[3] : dmy[3];
      return `${yr}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;
    }
    // Try YYYY-MM-DD already
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Try parsing naturally
    const parsed = new Date(s);
    if (!isNaN(parsed)) return parsed.toISOString().slice(0,10);
    return null;
  };

  const processRows = (rows, headers) => {
    const find = (keys) => {
      for (const k of keys) {
        const idx = headers.findIndex(h => h && String(h).toLowerCase().includes(k.toLowerCase()));
        if (idx >= 0) return idx;
      }
      return -1;
    };
    const idIdx       = find(["id","booking id","reservation id","ref","confirmation"]);
    const guestIdx    = find(["guest","name","guest name","customer"]);
    const propIdx     = find(["property","unit","apartment","listing"]);
    const checkInIdx  = find(["check in","checkin","check-in","arrival","start"]);
    const checkOutIdx = find(["check out","checkout","check-out","departure","end"]);
    const platformIdx = find(["platform","channel","source","ota"]);
    const revenueIdx  = find(["revenue","amount","total","price","rent","payout"]);
    const nightsIdx   = find(["nights","duration","length","stay"]);

    const added = []; const skipped = [];
    for (const row of rows) {
      if (!row || row.every(v => !v)) continue;
      const checkIn  = toISO(checkInIdx >= 0 ? row[checkInIdx] : null);
      const checkOut = toISO(checkOutIdx >= 0 ? row[checkOutIdx] : null);
      if (!checkIn || !checkOut || checkIn >= checkOut) { skipped.push(row); continue; }

      const id = idIdx >= 0 && row[idIdx] ? String(row[idIdx]).trim() : "IMP-"+Date.now()+"-"+Math.random().toString(36).slice(2,6);
      const guestName = guestIdx >= 0 && row[guestIdx] ? String(row[guestIdx]).trim() : "Guest";
      const propName  = propIdx  >= 0 && row[propIdx]  ? String(row[propIdx]).trim()  : "Unknown Property";
      const platform  = platformIdx >= 0 && row[platformIdx] ? String(row[platformIdx]).trim() : "Airbnb";
      const revenue   = revenueIdx >= 0 ? Number(String(row[revenueIdx]||"0").replace(/[^0-9.]/g,""))||0 : 0;

      // Skip if booking ID already exists
      if (state.bookings.find(b => b.id === id)) { skipped.push(row); continue; }

      added.push(mkBookingDirect(id, guestName, propName, checkIn, checkOut, platform, revenue));
    }
    return { added, skipped };
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      if (ext === "csv") {
        // Parse CSV
        const text = await file.text();
        const lines = text.split("\n").map(l => l.split(",").map(v => v.replace(/^"|"$/g,"").trim()));
        const headers = lines[0];
        const rows = lines.slice(1).filter(r => r.some(v => v));
        const { added, skipped } = processRows(rows, headers);
        added.forEach(b => dispatch({ type:"ADD_BOOKING", payload:b }));
        setImportResult({ added:added.length, skipped:skipped.length, file:file.name });
        toast(added.length + " bookings imported from CSV");
      } else {
        // Parse Excel using dynamic import
        const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
        const headers = data[0] || [];
        const rows = data.slice(1);
        const { added, skipped } = processRows(rows, headers);
        added.forEach(b => dispatch({ type:"ADD_BOOKING", payload:b }));
        setImportResult({ added:added.length, skipped:skipped.length, file:file.name });
        toast(added.length + " bookings imported from Excel");
      }
    } catch (err) {
      toast("Import failed: " + err.message, "error");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const filtered = useMemo(() => {
    let r = bookings;
    if (search) r = r.filter(b =>
      b.guestName.toLowerCase().includes(search.toLowerCase()) ||
      b.propertyName.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "All") r = r.filter(b => b.status === statusFilter);
    if (platformFilter !== "All") r = r.filter(b => b.platform === platformFilter);
    if (bookingStatusFilter === "Cancelled") r = r.filter(b => b.bookingStatus === "Cancelled");
    if (bookingStatusFilter === "Accepted") r = r.filter(b => b.bookingStatus !== "Cancelled");
    return [...r].sort((a,b) => {
      if (sortBy === "checkIn") return a.checkIn.localeCompare(b.checkIn);
      if (sortBy === "checkOut") return a.checkOut.localeCompare(b.checkOut);
      if (sortBy === "revenue") return b.revenue - a.revenue;
      if (sortBy === "nights") return b.nights - a.nights;
      return 0;
    });
  }, [bookings, search, statusFilter, platformFilter, sortBy]);

  const totalRevenue = bookings.reduce((s,b) => s+b.revenue, 0);
  const inHouse = bookings.filter(b => b.status==="In-House").length;
  const upcoming = bookings.filter(b => b.status==="Upcoming").length;
  const checkedOut = bookings.filter(b => b.status==="Checked Out").length;
  const shortStays = bookings.filter(b => b.nights < 10).length;
  const longStays = bookings.filter(b => b.nights >= 10).length;

  const handleAdd = () => {
    if (!form.propId || !nbForm.checkIn || !nbForm.checkOut) return toast("Fill required fields","error");
    const b = mkBooking(
      nbForm.id || ("MAN-"+Date.now()),
      nbForm.guestName || "Guest",
      nbForm.propId, nbForm.checkIn, nbForm.checkOut,
      nbForm.platform, nbForm.revenue, [], nbForm.notes
    );
    dispatch({ type:"ADD_BOOKING", payload:b });
    toast("Booking added");
    setShowAdd(false);
    setNbForm({ id:"", guestName:"", propId:"", checkIn:"", checkOut:"", platform:"Airbnb", revenue:"", notes:"" });
  };

  // Use nbForm not form for add modal
  const form = nbForm;

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <SectionTitle>Reservations</SectionTitle>
          {state.settings?.hospitable?.enabled && state.settings?.hospitable?.apiUrl && (
            <div style={{ fontSize:11, color:C.teal, marginTop:-8 }}>
              ● Hospitable auto-sync active · Last sync: {state.settings.hospitable.lastSync
                ? new Date(state.settings.hospitable.lastSync).toLocaleTimeString()
                : "not yet synced"}
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} style={{ display:"none" }} />
          <Btn variant="subtle" icon={Upload} onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? "Importing..." : "Import CSV / Excel"}
          </Btn>
          {state.settings?.hospitable?.enabled && state.settings?.hospitable?.apiUrl && (
            <Btn variant="subtle" icon={RefreshCw} onClick={async () => {
              try {
                await syncFromHospitable(state.settings.hospitable.apiUrl, state, dispatch, toast);
              } catch(e) { toast("Sync failed: " + e.message, "error"); }
            }}>Sync Now</Btn>
          )}
          <Btn variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Add Booking</Btn>
        </div>
      </div>

      {/* Import Result Banner */}
      {importResult && (
        <div style={{ background:C.tealBg, border:`1px solid ${C.teal}30`, borderRadius:8, padding:"10px 16px",
          marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <CheckCircle size={16} color={C.teal} />
          <span style={{ fontSize:13, color:C.teal }}>
            Imported <strong>{importResult.added}</strong> bookings from <strong>{importResult.file}</strong>
            {importResult.skipped > 0 && ` · ${importResult.skipped} rows skipped (duplicates or missing dates)`}
          </span>
          <button onClick={() => setImportResult(null)}
            style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:C.text3 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <KPICard label="Total Bookings" value={bookings.length} color={C.teal} icon={Hash} />
        <KPICard label="In-House" value={inHouse} color={C.teal} icon={Building} />
        <KPICard label="Upcoming" value={upcoming} color={C.blue} icon={ArrowUp} />
        <KPICard label="Checked Out" value={checkedOut} color={C.text3} icon={ArrowDown} />
        <KPICard label="Short Stays (<10n)" value={shortStays} color={C.amber} />
        <KPICard label="Long Stays (10n+)" value={longStays} color={C.green} sub="tracked in Res & Cleans" />
        <KPICard label="Cancelled" value={bookings.filter(b=>b.bookingStatus==="Cancelled").length} color={C.crimson} />
        <KPICard label="Total Revenue" value={"R "+(totalRevenue/1000).toFixed(0)+"k"} color={C.amber} icon={DollarSign} />
      </div>

      {/* Info strip */}
      <div style={{ background:C.tealBg, border:`1px solid ${C.teal}30`, borderRadius:8, padding:"10px 16px",
        marginBottom:16, fontSize:12, color:C.teal, display:"flex", alignItems:"center", gap:8 }}>
        <Info size={14} />
        Bookings with <strong>10+ nights</strong> are also tracked in <strong>Res & Cleans</strong> for mid-stay clean scheduling.
      </div>

      {/* Import format guide */}
      <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 16px",
        marginBottom:16, fontSize:12, color:C.text3, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
        <span style={{ color:C.text2, fontWeight:600 }}>Import format:</span>
        <span>Columns needed: <span style={{ fontFamily:"'DM Mono',monospace", color:C.teal }}>Booking ID, Guest Name, Property, Check-in, Check-out, Platform, Revenue</span></span>
        <span>Dates accepted: <span style={{ fontFamily:"'DM Mono',monospace", color:C.teal }}>DD/MM/YYYY · YYYY-MM-DD · Excel serial</span></span>
        <button onClick={() => {
          const csv = "Booking ID,Guest Name,Property,Check-in,Check-out,Platform,Revenue\nHM123,John Smith,605 The Tokyo,2026-06-01,2026-06-15,Airbnb,12000\n";
          const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
          a.download = "bookings_template.csv"; a.click();
        }} style={{ background:C.tealBg, color:C.teal, border:`1px solid ${C.teal}30`, borderRadius:5,
          padding:"4px 10px", cursor:"pointer", fontSize:11, fontWeight:600, marginLeft:"auto" }}>
          ↓ Download Template
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search guest, property, ID..." />
        <Select value={statusFilter} onChange={setStatusFilter}
          options={["All","In-House","Upcoming","Checked Out"]} style={{ width:140 }} />
        <Select value={platformFilter} onChange={setPlatformFilter}
          options={["All","Airbnb","Booking.com","Direct"]} style={{ width:140 }} />
        <Select value={bookingStatusFilter} onChange={setBookingStatusFilter}
          options={["All","Accepted","Cancelled"]} style={{ width:130 }} />
        <Select value={sortBy} onChange={setSortBy}
          options={[{value:"checkIn",label:"Sort: Check-in"},{value:"checkOut",label:"Sort: Check-out"},{value:"revenue",label:"Sort: Revenue"},{value:"nights",label:"Sort: Nights"}]}
          style={{ width:160 }} />
        <span style={{ fontSize:12, color:C.text3, marginLeft:"auto" }}>
          Showing {filtered.length} of {bookings.length} bookings
        </span>
      </div>

      {/* Table */}
      <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:10, overflowX:"auto" }}>
        {/* Header */}
        <div style={{ display:"grid", gridTemplateColumns:"12px 1fr 140px 90px 90px 50px 90px 100px 100px 80px", minWidth:900,
          padding:"10px 16px", borderBottom:`1px solid ${C.border}`, background:C.bg2 }}>
          {["","Property","Guest","Check-in","Check-out","Nts","Revenue","Platform","Booking Status",""].map(h => (
            <div key={h} style={{ fontSize:11, color:C.text3, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 && <EmptyState icon={BookMarked} title="No bookings found" sub="Adjust your filters or add a booking." />}

        {filtered.map(b => {
          const hasFlag = b.notes && b.notes.length > 0;
          const isLong = b.nights >= 10;
          return (
            <div key={b.id}
              style={{ display:"grid", gridTemplateColumns:"12px 1fr 140px 90px 90px 50px 90px 100px 100px 80px",
                padding:"11px 16px", borderBottom:`1px solid ${C.border}`,
                background: b.bookingStatus==="Cancelled" ? "rgba(255,59,92,0.05)" : "transparent",
                alignItems:"center", opacity: b.bookingStatus==="Cancelled" ? 0.7 : 1,
                transition:"background 0.1s" }}>
              {/* Night length indicator */}
              <div>
                {isLong && b.bookingStatus !== "Cancelled"
                  ? <div style={{ width:8, height:8, borderRadius:"50%", background:C.teal }} title="In Res & Cleans" />
                  : <div style={{ width:8, height:8, borderRadius:"50%", background:"transparent" }} />
                }
              </div>
              <div onClick={() => setSelected(b)} style={{ cursor:"pointer", minWidth:0 }}>
                <div style={{ fontSize:13, color: b.bookingStatus==="Cancelled"?C.text3:C.text1, fontWeight:500,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  textDecoration: b.bookingStatus==="Cancelled"?"line-through":"none" }}>
                  {b.propertyName}
                </div>
                <div style={{ fontSize:10, color:C.text3, fontFamily:"'DM Mono',monospace" }}>{b.id}</div>
              </div>
              <div onClick={() => setSelected(b)} style={{ cursor:"pointer", fontSize:12, color: b.guestName==="Guest"?C.amber:C.text2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {b.guestName}
              </div>
              <div style={{ fontSize:12, color:C.text2, fontFamily:"'DM Mono',monospace" }}>{fmtShort(b.checkIn)}</div>
              <div style={{ fontSize:12, color:C.text2, fontFamily:"'DM Mono',monospace" }}>{fmtShort(b.checkOut)}</div>
              <div style={{ fontSize:12, color:isLong?C.teal:C.text2, fontFamily:"'DM Mono',monospace", fontWeight:isLong?600:400 }}>{b.nights}</div>
              <div style={{ fontSize:12, color:b.revenue===0?C.amber:C.teal, fontFamily:"'DM Mono',monospace" }}>
                {b.revenue===0?"—":"R "+(b.revenue/1000).toFixed(1)+"k"}
              </div>
              <Badge label={b.platform} size="xs" />
              {/* Booking Status */}
              <div>
                <span style={{ fontSize:11, fontWeight:600, fontFamily:"'DM Mono',monospace", padding:"3px 8px", borderRadius:4,
                  background: b.bookingStatus==="Cancelled" ? C.crimsonBg : C.greenBg,
                  color: b.bookingStatus==="Cancelled" ? C.crimson : C.green,
                  border: `1px solid ${b.bookingStatus==="Cancelled" ? C.crimson : C.green}30` }}>
                  {b.bookingStatus==="Cancelled" ? "Cancelled" : "Accepted"}
                </span>
              </div>
              {/* Cancel / Restore button */}
              <div>
                {b.bookingStatus==="Cancelled"
                  ? <Btn size="sm" variant="subtle" onClick={() => dispatch({ type:"UPDATE_BOOKING", payload:{ id:b.id, bookingStatus:"Accepted" }})} >Restore</Btn>
                  : <Btn size="sm" variant="ghost" onClick={() => { if(window.confirm("Mark this booking as cancelled?")) dispatch({ type:"UPDATE_BOOKING", payload:{ id:b.id, bookingStatus:"Cancelled" }}); }}>Cancel</Btn>
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Detail Modal */}
      {selected && <BookingDetailModal
        booking={selected}
        properties={state.properties}
        onClose={() => setSelected(null)}
        onSave={(updates) => {
          dispatch({ type:"UPDATE_BOOKING", payload:{ id:selected.id, ...updates }});
          toast("Booking updated");
          setSelected(null);
        }}
      />}

      {/* Add Booking Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Booking" width={520}>
        <FormRow label="Booking ID (optional)">
          <Input value={nbForm.id} onChange={v=>setNbForm(f=>({...f,id:v}))} placeholder="e.g. HM1234ABC" />
        </FormRow>
        <FormRow label="Guest Name">
          <Input value={nbForm.guestName} onChange={v=>setNbForm(f=>({...f,guestName:v}))} placeholder="Full name" />
        </FormRow>
        <FormRow label="Property" required>
          <Select value={nbForm.propId} onChange={v=>setNbForm(f=>({...f,propId:v}))}
            options={["", ...state.properties.filter(p=>p.status==="Active").map(p=>({value:p.id, label:p.name}))]} />
        </FormRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormRow label="Check-in" required><Input type="date" value={nbForm.checkIn} onChange={v=>setNbForm(f=>({...f,checkIn:v}))} /></FormRow>
          <FormRow label="Check-out" required><Input type="date" value={nbForm.checkOut} onChange={v=>setNbForm(f=>({...f,checkOut:v}))} /></FormRow>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormRow label="Platform">
            <Select value={nbForm.platform} onChange={v=>setNbForm(f=>({...f,platform:v}))} options={["Airbnb","Booking.com","Direct"]} />
          </FormRow>
          <FormRow label="Revenue (ZAR)">
            <Input type="number" value={nbForm.revenue} onChange={v=>setNbForm(f=>({...f,revenue:v}))} placeholder="0.00" />
          </FormRow>
        </div>
        {nbForm.checkIn && nbForm.checkOut && daysBetween(nbForm.checkIn,nbForm.checkOut) >= 10 && (
          <div style={{ background:C.tealBg, border:`1px solid ${C.teal}30`, borderRadius:6, padding:"10px 14px", marginBottom:12, fontSize:12, color:C.teal }}>
            ✓ {daysBetween(nbForm.checkIn,nbForm.checkOut)} nights → will appear in Res & Cleans with {Math.ceil(daysBetween(nbForm.checkIn,nbForm.checkOut)/7)-1} mid-stay clean(s)
          </div>
        )}
        <FormRow label="Notes">
          <Input value={nbForm.notes} onChange={v=>setNbForm(f=>({...f,notes:v}))} placeholder="Any notes..." />
        </FormRow>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="primary" icon={Plus} onClick={handleAdd}>Add Booking</Btn>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}
