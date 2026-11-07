import type {
  AnalyzeResponse,
  DirectiveSeverity,
  LanguageCode,
} from "../types/atie";
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPct,
} from "../utils/format";

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
  holdValue: string;
  holdSuffix: string;
  weakMarginSuffix: string;
  defaultRouteValue: string;
  keepRouteSuffix: string;
  noRerouteValue: string;
  belowSafeFloorSuffix: string;
  vsDefaultSuffix: string;
  netDeltaSuffix: string;
  dispatchHeading: string;
  shareWhatsApp: string;
  shareSms: string;
  shareMore: string;
  profitChartTag: string;
  profitChartTitle: string;
  netProfitLegend: string;
  fuelHandlingLegend: string;
  spoilageLegend: string;
  routeLedgerTag: string;
  routeLedgerTitle: string;
  rankedByNetProfit: string;
  estimatedNetProfit: string;
  recommendedBadgeLabel: string;
  defaultBaselineLabel: string;
  currentPriceLabel: string;
  fuelCostLabel: string;
  handlingCostLabel: string;
  grossRevLabel: string;
  spoilageCostLabel: string;
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
  customUrlLabel: string;
  apiKeyLabel: string;
  apiKeyHint: string;
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
    holdValue: "Hold",
    holdSuffix: "do not dispatch",
    weakMarginSuffix: "weak net margin",
    defaultRouteValue: "Default",
    keepRouteSuffix: "keep route",
    noRerouteValue: "No reroute",
    belowSafeFloorSuffix: "below 5% floor",
    vsDefaultSuffix: "vs default market",
    netDeltaSuffix: "LKR net delta",
    dispatchHeading: "FIELD DISPATCH · SEND TO DRIVER OR CO-OP",
    shareWhatsApp: "WhatsApp",
    shareSms: "SMS",
    shareMore: "Share",
    profitChartTag: "MARKET ECONOMICS",
    profitChartTitle: "Net Profit vs Route Deductions",
    netProfitLegend: "Net Profit",
    fuelHandlingLegend: "Fuel + Handling",
    spoilageLegend: "Spoilage Loss",
    routeLedgerTag: "ROUTE LEDGER",
    routeLedgerTitle: "Every rupee accounted for.",
    rankedByNetProfit: "RANKED BY NET PROFIT",
    estimatedNetProfit: "ESTIMATED NET PROFIT",
    recommendedBadgeLabel: "RECOMMENDED",
    defaultBaselineLabel: "DEFAULT BASELINE",
    currentPriceLabel: "Current",
    fuelCostLabel: "Fuel",
    handlingCostLabel: "Handling",
    grossRevLabel: "Gross rev",
    spoilageCostLabel: "Spoilage opp. cost",
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
    customUrlLabel: "CUSTOM LAN / HOST URL (FOR PHYSICAL ANDROID APK OR WI-FI)",
    apiKeyLabel: "OPTIONAL X-ATIE-API-KEY (FOR DIRECT :8080 AUTH)",
    apiKeyHint: "Leave empty when using the :15173 gateway or local dev mode",
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
    recommendedForecast: "නිර්දේශය",
    profitUplift: "ශුද්ධ ලාභ වැඩිවීම",
    extraTakeHome: "අමතර ශුද්ධ ආදායම",
    holdValue: "රඳවන්න",
    holdSuffix: "පිටත් නොකරන්න",
    weakMarginSuffix: "අඩු/සෘණ ශුද්ධ ලාභය",
    defaultRouteValue: "සාමාන්‍ය",
    keepRouteSuffix: "මාර්ගය තබාගන්න",
    noRerouteValue: "වෙනසක් නැත",
    belowSafeFloorSuffix: "5% සීමාවට අඩුයි",
    vsDefaultSuffix: "සාමාන්‍ය වෙළඳපොළට සාපේක්ෂව",
    netDeltaSuffix: "රු. ශුද්ධ වෙනස",
    dispatchHeading: "රියදුරු හෝ සමිතිය වෙත යවන්න",
    shareWhatsApp: "WhatsApp",
    shareSms: "SMS",
    shareMore: "බෙදාගන්න",
    profitChartTag: "වෙළඳපොළ ආර්ථිකය",
    profitChartTitle: "ශුද්ධ ලාභය සහ ප්‍රවාහන වියදම්",
    netProfitLegend: "ශුද්ධ ලාභය",
    fuelHandlingLegend: "ඉන්ධන + ගාස්තු",
    spoilageLegend: "නරක්වීම් පාඩුව",
    routeLedgerTag: "මාර්ග ලෙජරය",
    routeLedgerTitle: "සෑම රුපියලකම නිවැරදි ගණනය.",
    rankedByNetProfit: "ශුද්ධ ලාභය අනුව",
    estimatedNetProfit: "ඇස්තමේන්තුගත ශුද්ධ ලාභය",
    recommendedBadgeLabel: "නිර්දේශිතයි",
    defaultBaselineLabel: "සාමාන්‍ය මට්ටම",
    currentPriceLabel: "වත්මන් මිල",
    fuelCostLabel: "ඉන්ධන",
    handlingCostLabel: "වෙළඳපොළ ගාස්තු",
    grossRevLabel: "දළ ආදායම",
    spoilageCostLabel: "නරක්වීම් පිරිවැය",
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
    customUrlLabel: "අභිරුචි LAN / සේවාදායක URL ලිපිනය",
    apiKeyLabel: "විකල්ප X-ATIE-API-KEY (සෘජු :8080 සඳහා)",
    apiKeyHint: ":15173 ද්වාරය භාවිතා කරන විට හිස්ව තබන්න",
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
    recommendedForecast: "பரிந்துரை",
    profitUplift: "நிகர இலாப உயர்வு",
    extraTakeHome: "கூடுதல் நிகர வருமானம்",
    holdValue: "நிறுத்துக",
    holdSuffix: "அனுப்ப வேண்டாம்",
    weakMarginSuffix: "குறைந்த/எதிர்மறை இலாபம்",
    defaultRouteValue: "வழக்கமான",
    keepRouteSuffix: "பாதையைத் தொடர்க",
    noRerouteValue: "மாற்றம் இல்லை",
    belowSafeFloorSuffix: "5% வரம்புக்கு கீழ்",
    vsDefaultSuffix: "வழக்கமான சந்தையுடன் ஒப்பீடு",
    netDeltaSuffix: "ரூ. நிகர வேறுபாடு",
    dispatchHeading: "சாரதி அல்லது கூட்டுறவுக்கு அனுப்புக",
    shareWhatsApp: "WhatsApp",
    shareSms: "SMS",
    shareMore: "பகிர்",
    profitChartTag: "சந்தை பொருளாதாரம்",
    profitChartTitle: "நிகர இலாபம் மற்றும் போக்குவரத்து செலவு",
    netProfitLegend: "நிகர இலாபம்",
    fuelHandlingLegend: "எரிபொருள் + கட்டணம்",
    spoilageLegend: "வீணாகும் இழப்பு",
    routeLedgerTag: "பாதை கணக்கு",
    routeLedgerTitle: "ஒவ்வொரு ரூபாயும் துல்லியமாக கணக்கிடப்பட்டது.",
    rankedByNetProfit: "நிகர இலாப வரிசை",
    estimatedNetProfit: "மதிப்பிடப்பட்ட நிகர இலாபம்",
    recommendedBadgeLabel: "பரிந்துரைக்கப்பட்டது",
    defaultBaselineLabel: "வழக்கமான அடிப்படை",
    currentPriceLabel: "தற்போதைய விலை",
    fuelCostLabel: "எரிபொருள்",
    handlingCostLabel: "சந்தைக் கட்டணம்",
    grossRevLabel: "மொத்த வருவாய்",
    spoilageCostLabel: "வீணாகும் செலவு",
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
    customUrlLabel: "தனிப்பயன் LAN / சேவையக முகவரி",
    apiKeyLabel: "விருப்ப X-ATIE-API-KEY (நேரடி :8080 இணைப்புக்கு)",
    apiKeyHint: ":15173 நுழைவாயிலைப் பயன்படுத்தும்போது காலியாக விடவும்",
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

export function localizeDirectiveCopy(
  response: AnalyzeResponse,
  lang: LanguageCode,
): { headline: string; explanation: string; crashWarning: string | null } {
  const directive = response.primaryDirective;
  const defaultMarket = response.marketComparisons.find(
    (m) => m.marketCode === directive.defaultMarketCode,
  );
  const recommended = directive.recommendedMarketCode
    ? response.marketComparisons.find(
        (m) => m.marketCode === directive.recommendedMarketCode,
      )
    : undefined;

  const defaultName = localizePlaceName(
    directive.defaultMarketCode,
    defaultMarket?.marketName ?? directive.defaultMarketCode,
    lang,
  );
  const recName = recommended
    ? localizePlaceName(recommended.marketCode, recommended.marketName, lang)
    : defaultName;

  if (lang === "en") {
    const crashWarning =
      defaultMarket?.direction === "CRASH"
        ? `${defaultName} is forecast to drop from ${defaultMarket.currentPriceLkr.toFixed(2)} to ${defaultMarket.predictedPriceLkr.toFixed(2)} LKR/kg.`
        : null;
    return {
      headline: directive.headline,
      explanation: directive.explanation,
      crashWarning,
    };
  }

  if (lang === "si") {
    const crashWarning =
      defaultMarket?.direction === "CRASH"
        ? `${defaultName} තොග මිල කි.ග්‍රෑ. රු. ${defaultMarket.currentPriceLkr.toFixed(2)} සිට රු. ${defaultMarket.predictedPriceLkr.toFixed(2)} දක්වා පහත වැටෙනු ඇතැයි පුරෝකථනය කෙරේ.`
        : null;

    if (directive.severity === "CRITICAL_REROUTE" && recommended) {
      return {
        headline: `${recName} වෙත යොමු කරන්න`,
        explanation: `${defaultName} වෙනුවට ${recName} වෙත ප්‍රවාහනය කිරීමෙන් ඉන්ධන, ගාස්තු සහ නරක්වීම් අඩු කළ පසු ${formatSignedCurrency(directive.profitDeltaLkr)} (${formatSignedPct(directive.profitUpliftPct)}) ක වැඩි ශුද්ධ ලාභයක් ලැබේ.`,
        crashWarning,
      };
    }
    if (directive.severity === "HOLD_HARVEST") {
      return {
        headline: "අස්වැන්න රඳවා තබන්න — දැන් පිටත් නොකරන්න",
        explanation: `${defaultName} ඇතුළු ළඟා විය හැකි වෙළඳපොළවල ප්‍රවාහන සහ නරක්වීම් වියදම් අඩු කළ පසු ආරක්ෂිත ශුද්ධ ලාභයක් නොලැබේ${defaultMarket ? ` (${formatCurrency(defaultMarket.netProfitLkr)})` : ""}.`,
        crashWarning,
      };
    }
    return {
      headline: `${defaultName} වෙත සාමාන්‍ය පරිදි යන්න`,
      explanation: `වෙනත් කිසිදු වෙළඳපොළක් 5% සහ රු. 1,000 ආරක්ෂිත ශුද්ධ ලාභ සීමාව ඉක්මවා නොයයි${defaultMarket ? ` (${defaultName}: ${formatCurrency(defaultMarket.netProfitLkr)})` : ""}.`,
      crashWarning,
    };
  }

  // Tamil (ta)
  const crashWarning =
    defaultMarket?.direction === "CRASH"
      ? `${defaultName} மொத்த விலை கி.கி ரூ. ${defaultMarket.currentPriceLkr.toFixed(2)} இலிருந்து ரூ. ${defaultMarket.predictedPriceLkr.toFixed(2)} ஆகக் குறையும் என கணிக்கப்பட்டுள்ளது.`
      : null;

  if (directive.severity === "CRITICAL_REROUTE" && recommended) {
    return {
      headline: `${recName} சந்தைக்கு மாற்றி அனுப்புக`,
      explanation: `${defaultName} சந்தைக்குப் பதிலாக ${recName} சந்தைக்கு அனுப்புவதால் எரிபொருள், கட்டணம் மற்றும் வீணாகும் செலவுகளுக்குப் பிறகு ${formatSignedCurrency(directive.profitDeltaLkr)} (${formatSignedPct(directive.profitUpliftPct)}) கூடுதல் நிகர இலாபம் கிடைக்கும்.`,
      crashWarning,
    };
  }
  if (directive.severity === "HOLD_HARVEST") {
    return {
      headline: "அறுவடையை நிறுத்தி வைக்கவும் — அனுப்ப வேண்டாம்",
      explanation: `${defaultName} உட்பட அணுகக்கூடிய சந்தைகளில் போக்குவரத்து மற்றும் வீணாகும் செலவுகளுக்குப் பிறகு பாதுகாப்பான நிகர இலாபம் இல்லை${defaultMarket ? ` (${formatCurrency(defaultMarket.netProfitLkr)})` : ""}.`,
      crashWarning,
    };
  }
  return {
    headline: `${defaultName} சந்தைக்கு வழக்கம்போல் அனுப்புக`,
    explanation: `மாற்றுச் சந்தைகள் எதுவும் 5% மற்றும் ரூ. 1,000 பாதுகாப்பான நிகர இலாப வரம்பைத் தாண்டவில்லை${defaultMarket ? ` (${defaultName}: ${formatCurrency(defaultMarket.netProfitLkr)})` : ""}.`,
    crashWarning,
  };
}
