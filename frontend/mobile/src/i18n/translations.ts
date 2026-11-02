import type { DirectiveSeverity, LanguageCode } from "../types/atie";

export interface UiStrings {
  appSubtitle: string;
  regionTag: string;
  heroTitlePrefix: string;
  heroTitleAccent: string;
  heroDescription: string;
  canonicalCorridor: string;
  tabDirective: string;
  tabMarkets: string;
  tabForecast: string;
  tabTrust: string;
  consignmentTag: string;
  consignmentTitle: string;
  loadDemoBtn: string;
  cropLabel: string;
  originLabel: string;
  defaultMarketLabel: string;
  quantityLabel: string;
  vehicleLabel: string;
  horizonLabel: string;
  hoursSuffix: string;
  safeRuleNote: string;
  analyzeBtn: string;
  analyzingBtn: string;
  defaultForecast: string;
  recommendedForecast: string;
  profitUplift: string;
  extraTakeHome: string;
  dispatchHeading: string;
  shareWhatsApp: string;
  shareSms: string;
  shareMore: string;
  profitChartTag: string;
  profitChartTitle: string;
  routeLedgerTag: string;
  routeLedgerTitle: string;
  rankedByNetProfit: string;
  estimatedNetProfit: string;
  forecastTag: string;
  forecastTitle: string;
  forecastSubtitle: string;
  weatherTag: string;
  weatherTitle: string;
  provenanceTag: string;
  provenanceTitle: string;
  provenanceSubtitle: string;
  benchmarksTag: string;
  benchmarksTitle: string;
  serverModalTitle: string;
  serverModalSubtitle: string;
  saveAndReconnect: string;
  testConnection: string;
  closeLabel: string;
}

export const UI_STRINGS: Record<LanguageCode, UiStrings> = {
  en: {
    appSubtitle: "AGRICULTURAL TRADE & INTELLIGENCE ENGINE",
    regionTag: "SRI LANKA · WHOLESALE INTELLIGENCE",
    heroTitlePrefix: "Send the harvest where it ",
    heroTitleAccent: "actually pays.",
    heroDescription:
      "48–72 hour wholesale forecasts, transport fuel, terrain, spoilage, and a safe net-profit margin before a single crate leaves the farm.",
    canonicalCorridor: "ANURADHAPURA → DAMBULLA / PETTAH",
    tabDirective: "Directive",
    tabMarkets: "Markets",
    tabForecast: "Forecast",
    tabTrust: "Trust & Live",
    consignmentTag: "CONSIGNMENT SETUP",
    consignmentTitle: "Tell us what is leaving the farm.",
    loadDemoBtn: "Load Northern Glut Demo",
    cropLabel: "PRODUCE CROP",
    originLabel: "ORIGIN REGION",
    defaultMarketLabel: "DEFAULT TARGET MARKET",
    quantityLabel: "HARVEST QUANTITY (KG)",
    vehicleLabel: "VEHICLE",
    horizonLabel: "HORIZON",
    hoursSuffix: "Hours",
    safeRuleNote:
      "Ranks destination markets by net profit after fuel, terrain, handling, and spoilage.",
    analyzeBtn: "Analyze Market Route",
    analyzingBtn: "Calculating safest route…",
    defaultForecast: "DEFAULT FORECAST",
    recommendedForecast: "RECOMMENDED",
    profitUplift: "PROFIT UPLIFT",
    extraTakeHome: "EXTRA TAKE-HOME",
    dispatchHeading: "FIELD DISPATCH · SEND TO DRIVER OR CO-OP",
    shareWhatsApp: "WhatsApp",
    shareSms: "SMS",
    shareMore: "Share",
    profitChartTag: "MARKET ECONOMICS",
    profitChartTitle: "Net Profit vs Route Deductions",
    routeLedgerTag: "ROUTE LEDGER",
    routeLedgerTitle: "Every rupee accounted for.",
    rankedByNetProfit: "RANKED BY NET PROFIT",
    estimatedNetProfit: "ESTIMATED NET PROFIT",
    forecastTag: "FORECAST TRACE",
    forecastTitle: "14-Day History & 48–72h Horizon",
    forecastSubtitle:
      "Observed wholesale series compared against the ATIE model, naive persistence, and 7-day moving average.",
    weatherTag: "CORRIDOR WEATHER",
    weatherTitle: "Microclimate Disruption Radar",
    provenanceTag: "DATA PROVENANCE",
    provenanceTitle: "Live where it can be.",
    provenanceSubtitle:
      "Every data source is labeled honestly. Seeded or cached series are never disguised as live.",
    benchmarksTag: "BENCHMARK ACCURACY",
    benchmarksTitle: "Model vs Mandatory Baselines",
    serverModalTitle: "Android Backend Endpoint",
    serverModalSubtitle:
      "Connect through the Docker Nginx gateway (:15173) or directly to Spring Boot (:8080).",
    saveAndReconnect: "Save & Refresh",
    testConnection: "Test Endpoint",
    closeLabel: "Close",
  },
  si: {
    appSubtitle: "කෘෂි වෙළඳ සහ බුද්ධිමය තීරණ එන්ජිම",
    regionTag: "ශ්‍රී ලංකා · තොග වෙළඳපොළ බුද්ධිය",
    heroTitlePrefix: "අස්වැන්න සැබෑ ලාභයක් ලැබෙන ",
    heroTitleAccent: "වෙළඳපොළට යවන්න.",
    heroDescription:
      "පැය 48–72 තොග මිල පුරෝකථනය, ප්‍රවාහන ඉන්ධන වියදම, නරක්වීම් සහ ආරක්ෂිත ශුද්ධ ලාභය එකම තැනකින්.",
    canonicalCorridor: "අනුරාධපුරය → දඹුල්ල / පිටකොටුව",
    tabDirective: "නියෝගය",
    tabMarkets: "වෙළඳපොළ",
    tabForecast: "පුරෝකථනය",
    tabTrust: "දත්ත තත්ත්වය",
    consignmentTag: "අස්වැන්න විස්තර",
    consignmentTitle: "ගොවිපළෙන් පිටත්වන තොගය තෝරන්න.",
    loadDemoBtn: "උතුරු අතිරික්ත නිදර්ශනය (Demo)",
    cropLabel: "බෝග වර්ගය",
    originLabel: "පිටත්වන ප්‍රදේශය",
    defaultMarketLabel: "සාමාන්‍ය ඉලක්ක වෙළඳපොළ",
    quantityLabel: "අස්වනු ප්‍රමාණය (කි.ග්‍රෑ / KG)",
    vehicleLabel: "ප්‍රවාහන රථය",
    horizonLabel: "කාල පරාසය",
    hoursSuffix: "පැය",
    safeRuleNote:
      "ඉන්ධන, මාර්ග දුෂ්කරතා, ගාස්තු සහ නරක්වීම් අඩු කළ පසු ඉහළම ශුද්ධ ලාභය අනුව පෙළගස්වයි.",
    analyzeBtn: "හොඳම වෙළඳපොළ විශ්ලේෂණය කරන්න",
    analyzingBtn: "ආරක්ෂිතම මාර්ගය ගණනය කරමින්…",
    defaultForecast: "සාමාන්‍ය වෙළඳපොළ මිල",
    recommendedForecast: "නිර්දේශිත මිල",
    profitUplift: "ශුද්ධ ලාභ වැඩිවීම",
    extraTakeHome: "අමතර ශුද්ධ ආදායම",
    dispatchHeading: "රියදුරු හෝ සමිතිය වෙත යවන්න",
    shareWhatsApp: "WhatsApp",
    shareSms: "SMS",
    shareMore: "බෙදාගන්න",
    profitChartTag: "වෙළඳපොළ ආර්ථිකය",
    profitChartTitle: "ශුද්ධ ලාභය සහ ප්‍රවාහන වියදම්",
    routeLedgerTag: "මාර්ග ලෙජරය",
    routeLedgerTitle: "සෑම රුපියලකම නිවැරදි ගණනය.",
    rankedByNetProfit: "ශුද්ධ ලාභය අනුව",
    estimatedNetProfit: "ඇස්තමේන්තුගත ශුද්ධ ලාභය",
    forecastTag: "මිල ගමන්මග",
    forecastTitle: "දින 14 ඉතිහාසය සහ පැය 48–72 පුරෝකථනය",
    forecastSubtitle:
      "පසුගිය දින 14 මිල ගණන් සමඟ ATIE ආකෘතිය, Naive සහ දින-7 සාමාන්‍යය සැසඳීම.",
    weatherTag: "කාලගුණ අවදානම",
    weatherTitle: "ප්‍රාදේශීය වැසි සහ සැපයුම් අනතුරු ඇඟවීම්",
    provenanceTag: "දත්ත මූලාශ්‍ර",
    provenanceTitle: "සජීවී සහ සත්‍යාපිත දත්ත තත්ත්වය.",
    provenanceSubtitle:
      "සෑම දත්ත මූලාශ්‍රයක්ම විනිවිදභාවයෙන් දක්වා ඇත.",
    benchmarksTag: "ආකෘති නිරවද්‍යතාව",
    benchmarksTitle: "ATIE ආකෘතිය සහ මූලික මිනුම් සැසඳීම",
    serverModalTitle: "Android සේවාදායක සම්බන්ධතාව",
    serverModalSubtitle:
      "Docker Nginx (:15173) හෝ Spring Boot (:8080) සේවාදායක ලිපිනය සකසන්න.",
    saveAndReconnect: "සුරකින්න",
    testConnection: "පරීක්ෂා කරන්න",
    closeLabel: "වසන්න",
  },
  ta: {
    appSubtitle: "விவசாய வர்த்தக மற்றும் நுண்ணறிவு இயந்திரம்",
    regionTag: "இலங்கை · மொத்த சந்தை நுண்ணறிவு",
    heroTitlePrefix: "உண்மையான இலாபம் தரும் ",
    heroTitleAccent: "சந்தைக்கு அனுப்புங்கள்.",
    heroDescription:
      "48–72 மணிநேர மொத்த விலை முன்னறிவிப்பு, போக்குவரத்து எரிபொருள், வீணாகும் அளவு மற்றும் பாதுகாப்பான நிகர இலாபம்.",
    canonicalCorridor: "அனுராதபுரம் → தம்புள்ளை / புறக்கோட்டை",
    tabDirective: "பரிந்துரை",
    tabMarkets: "சந்தைகள்",
    tabForecast: "முன்னறிவிப்பு",
    tabTrust: "தரவு நிலை",
    consignmentTag: "அறுவடை விவரம்",
    consignmentTitle: "பண்ணையிலிருந்து புறப்படும் அறுவடையைத் தேர்ந்தெடுக்கவும்.",
    loadDemoBtn: "வடக்கு விளைச்சல் மாதிரி (Demo)",
    cropLabel: "பயிர் வகை",
    originLabel: "புறப்படும் பகுதி",
    defaultMarketLabel: "வழக்கமான இலக்கு சந்தை",
    quantityLabel: "அறுவடை அளவு (கி.கி / KG)",
    vehicleLabel: "வாகனம்",
    horizonLabel: "கால அளவு",
    hoursSuffix: "மணி",
    safeRuleNote:
      "எரிபொருள், பாதை, கட்டணம் மற்றும் வீணாகும் செலவுகளுக்குப் பிறகு நிகர இலாபத்தின் அடிப்படையில் வரிசைப்படுத்தப்படுகிறது.",
    analyzeBtn: "சந்தை பாதையை பகுப்பாய்வு செய்",
    analyzingBtn: "பாதுகாப்பான பாதை கணக்கிடப்படுகிறது…",
    defaultForecast: "வழக்கமான சந்தை விலை",
    recommendedForecast: "பரிந்துரைக்கப்பட்ட விலை",
    profitUplift: "நிகர இலாப உயர்வு",
    extraTakeHome: "கூடுதல் நிகர வருமானம்",
    dispatchHeading: "சாரதி அல்லது கூட்டுறவுக்கு அனுப்புக",
    shareWhatsApp: "WhatsApp",
    shareSms: "SMS",
    shareMore: "பகிர்",
    profitChartTag: "சந்தை பொருளாதாரம்",
    profitChartTitle: "நிகர இலாபம் மற்றும் போக்குவரத்து செலவு",
    routeLedgerTag: "பாதை கணக்கு",
    routeLedgerTitle: "ஒவ்வொரு ரூபாயும் துல்லியமாக கணக்கிடப்பட்டது.",
    rankedByNetProfit: "நிகர இலாப வரிசை",
    estimatedNetProfit: "மதிப்பிடப்பட்ட நிகர இலாபம்",
    forecastTag: "விலை போக்கு",
    forecastTitle: "14-நாள் வரலாறு & 48–72 மணிநேர முன்னறிவிப்பு",
    forecastSubtitle:
      "கடந்த 14 நாட்கள் விலையுடன் ATIE மாதிரி, Naive மற்றும் 7-நாள் சராசரி ஒப்பீடு.",
    weatherTag: "வானிலை எச்சரிக்கை",
    weatherTitle: "பாதை மழை மற்றும் விநியோக அபாயம்",
    provenanceTag: "தரவு மூலம்",
    provenanceTitle: "நேரடி மற்றும் சரிபார்க்கப்பட்ட தரவு நிலை.",
    provenanceSubtitle:
      "ஒவ்வொரு தரவு மூலமும் வெளிப்படையாக அடையாளப்படுத்தப்பட்டுள்ளது.",
    benchmarksTag: "மாதிரி துல்லியம்",
    benchmarksTitle: "ATIE மாதிரி vs அடிப்படை அளவீடுகள்",
    serverModalTitle: "Android சேவையக இணைப்பு",
    serverModalSubtitle:
      "Docker Nginx (:15173) அல்லது Spring Boot (:8080) முகவரியை அமைக்கவும்.",
    saveAndReconnect: "சேமி & புதுப்பி",
    testConnection: "இணைப்பை சோதி",
    closeLabel: "மூடு",
  },
};

const CROP_NAMES: Record<string, Record<LanguageCode, string>> = {
  TOMATO: { en: "Tomato", si: "තක්කාලි", ta: "தக்காளி" },
  CARROT: { en: "Carrot", si: "කැරට්", ta: "கேரட்" },
  GREEN_CHILI: { en: "Green Chili", si: "අමු මිරිස්", ta: "பச்சை மிளகாய்" },
  RED_ONION: { en: "Red Onion", si: "රතු ළුණු", ta: "சின்ன வெங்காயம்" },
};

const PLACE_NAMES: Record<string, Record<LanguageCode, string>> = {
  ANURADHAPURA: { en: "Anuradhapura", si: "අනුරාධපුරය", ta: "அனுராதபுரம்" },
  JAFFNA: { en: "Jaffna", si: "යාපනය", ta: "யாழ்ப்பாணம்" },
  DAMBULLA: { en: "Dambulla", si: "දඹුල්ල", ta: "தம்புள்ளை" },
  PETTAH_COLOMBO: { en: "Colombo Pettah", si: "කොළඹ පිටකොටුව", ta: "கொழும்பு புறக்கோட்டை" },
  NUWARA_ELIYA: { en: "Nuwara Eliya", si: "නුවරඑළිය", ta: "நுவரெலியா" },
  KEPPETIPOLA: { en: "Keppetipola", si: "කැප්පෙටිපොළ", ta: "கெப்பெட்டிபொல" },
  MEEGODA: { en: "Meegoda", si: "මීගොඩ", ta: "மீகொட" },
  THAMBUTTEGAMA: { en: "Thambuttegama", si: "තඹුත්තේගම", ta: "தம்புத்தேகம" },
};

const VEHICLE_NAMES: Record<string, Record<LanguageCode, string>> = {
  THREE_WHEELER: { en: "Three-Wheeler", si: "ත්‍රිරෝද රථය", ta: "முச்சக்கர வண்டி" },
  MINI_TRUCK_BATTA: { en: "Batta Mini-Truck", si: "බට්ටා ලොරිය", ta: "பட்டா சிறிய லொறி" },
  LORRY_3_5T: { en: "3.5t Lorry", si: "ටොන් 3.5 ලොරිය", ta: "3.5 தொன் லொறி" },
};

const SEVERITY_LABELS: Record<DirectiveSeverity, Record<LanguageCode, string>> = {
  CRITICAL_REROUTE: {
    en: "CRITICAL REROUTE",
    si: "විකල්ප වෙළඳපොළට යොමු කරන්න",
    ta: "மாற்றுச் சந்தைக்கு அனுப்புக",
  },
  PROCEED_DEFAULT: {
    en: "PROCEED DEFAULT",
    si: "සාමාන්‍ය වෙළඳපොළට යන්න",
    ta: "வழக்கமான சந்தைக்குச் செல்க",
  },
  HOLD_HARVEST: {
    en: "HOLD HARVEST",
    si: "අස්වැන්න රඳවා තබන්න",
    ta: "அறுவடையை நிறுத்தி வைக்கவும்",
  },
};

const DIRECTION_LABELS: Record<"CRASH" | "STABLE" | "SURGE", Record<LanguageCode, string>> = {
  CRASH: { en: "CRASH", si: "මිල කඩාවැටීම", ta: "விலை வீழ்ச்சி" },
  STABLE: { en: "STABLE", si: "ස්ථාවරයි", ta: "நிலையானது" },
  SURGE: { en: "SURGE", si: "මිල ඉහළ යාම", ta: "விலை உயர்வு" },
};

export function localizeCropName(code: string, fallback: string, lang: LanguageCode): string {
  return CROP_NAMES[code]?.[lang] ?? fallback;
}

export function localizePlaceName(code: string, fallback: string, lang: LanguageCode): string {
  return PLACE_NAMES[code]?.[lang] ?? fallback;
}

export function localizeVehicleName(code: string, fallback: string, lang: LanguageCode): string {
  return VEHICLE_NAMES[code]?.[lang] ?? fallback;
}

export function localizeSeverity(severity: DirectiveSeverity, lang: LanguageCode): string {
  return SEVERITY_LABELS[severity]?.[lang] ?? severity.replace(/_/g, " ");
}

export function localizeDirection(
  direction: "CRASH" | "STABLE" | "SURGE",
  lang: LanguageCode,
): string {
  return DIRECTION_LABELS[direction]?.[lang] ?? direction;
}
