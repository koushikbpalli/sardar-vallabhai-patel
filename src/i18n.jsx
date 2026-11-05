import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "te", label: "తెలుగు" },
];

// All interface text lives here. Scene/stall text lives in data/nodes.js.
const STRINGS = {
  en: {
    title: "Sardar Vallabhbhai Patel Market",
    enter: "Enter the Bazaar",
    entering: "Entering…",
    description:
      "The revitalized Sardar Vallabhbhai Patel (Poorna) Market beautifully blends colonial-era heritage with modern design. The restored clock tower and the original entrance serve as the primary attractions of the complex; the old, narrow, and congested lanes have been replaced by pedestrian-friendly pathways shaded by trees. While retaining their unique character, the traditional shops have been upgraded with modern, modular features that offer better lighting and resilience against weather conditions. Amenities such as a covered plaza, a digital wayfinding system, and organized parking have been seamlessly integrated. At night, heritage-style lighting complements the modern canopies, creating a sustainable space where history and contemporary needs coexist.",
    menu: "Menu",
    home: "Home",
    locations: "Locations",
    language: "Language",
    fullscreen: "Fullscreen",
    help: "Help",
    close: "Close",
    virtualTour: "Virtual Tour",
    history: "History",
    plans: "Plans",
    gallery: "Gallery",
    planHint: "Click a pin on the plan to see details.",
    prev: "Previous",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    recenter: "Recenter view",
    next: "Next",
    videoError:
      "The video can't be loaded. Check that public/video/history.mp4 exists.",
    youAreAt: "You are at",
    helpText:
      "Drag to look around. Scroll to zoom. Click the arrows on the floor to walk to the next spot, and click the pins to learn about a stall.",
  },
  hi: {
    title: "सरदार वल्लभभाई पटेल मार्केट",
    enter: "बाज़ार में प्रवेश करें",
    entering: "प्रवेश हो रहा है…",
    menu: "मेनू",
    home: "होम",
    locations: "स्थान",
    description:
      "नए सिरे से तैयार सरदार वल्लभभाई पटेल (पूर्णा) मार्केट में औपनिवेशिक दौर की विरासत और आधुनिक डिज़ाइन का मेल दिखता है। ठीक किया गया क्लॉक टावर और पुरानी इमारत का सामने का हिस्सा इस जगह की मुख्य पहचान हैं। इसके चारों ओर पैदल चलने वालों के लिए रास्ते और छायादार हरियाली है, जिसने पुरानी भीड़-भाड़ वाली गलियों की जगह ले ली है। पारंपरिक स्टॉल अपनी जीवंत पहचान बनाए रखते हैं, लेकिन उन्हें बेहतर लाइटिंग के साथ मॉड्यूलर और मौसम से सुरक्षित अपग्रेड मिला है। यहाँ एक ढका हुआ प्लाज़ा, डिजिटल वे-फाइंडिंग और व्यवस्थित पार्किंग की सुविधा भी दी गई है। रात में हेरिटेज लाइटिंग आधुनिक कैनोपी के साथ मिलकर एक ऐसी टिकाऊ जगह बनाती है जहाँ इतिहास और आधुनिक कामकाज साथ-साथ चलते हैं।",
    language: "भाषा",
    fullscreen: "फ़ुलस्क्रीन",
    help: "सहायता",
    close: "बंद करें",
    virtualTour: "वर्चुअल टूर",
    history: "इतिहास",
    plans: "बाज़ार नक्शा",
    gallery: "गैलरी",
    planHint: "जानकारी देखने के लिए नक्शे पर किसी पिन पर क्लिक करें।",
    prev: "पिछला",
    zoomIn: "ज़ूम इन",
    zoomOut: "ज़ूम आउट",
    recenter: "दृश्य केंद्र में लाएँ",
    next: "अगला",
    videoError: "वीडियो लोड नहीं हो सका।",
    youAreAt: "आप यहाँ हैं",
    helpText:
      "चारों ओर देखने के लिए खींचें। ज़ूम करने के लिए स्क्रॉल करें। अगले स्थान पर जाने के लिए ज़मीन पर बने तीरों पर क्लिक करें, और दुकान के बारे में जानने के लिए पिन पर क्लिक करें।",
  },
  te: {
    title: "సర్దార్ వల్లభాయ్ పటేల్ (పూర్ణ) మార్కెట్",
    enter: "బజార్‌లోకి ప్రవేశించండి",
    entering: "ప్రవేశిస్తోంది…",
    menu: "మెనూ",
    home: "హోమ్",
    locations: "ప్రదేశాలు",
    description:
      "పునరుద్ధరించబడిన సర్దార్ వల్లభాయ్ పటేల్ (పూర్ణ) మార్కెట్, వలస పాలన నాటి వారసత్వాన్ని ఆధునిక డిజైన్‌తో అద్భుతంగా మిళితం చేస్తుంది. పునరుద్ధరించిన గడియార స్తంభం (క్లాక్ టవర్) మరియు అసలు ముఖద్వారం ఈ ప్రాంగణానికి ప్రధాన ఆకర్షణగా నిలుస్తాయి; పాత ఇరుకైన, రద్దీగా ఉండే సందుల స్థానంలో ఇప్పుడు పాదచారులకు అనుకూలమైన, నీడనిచ్చే చెట్లతో కూడిన మార్గాలు ఏర్పాటు చేయబడ్డాయి. సాంప్రదాయ దుకాణాలు తమ ప్రత్యేకతను నిలుపుకుంటూనే, మెరుగైన వెలుతురుతో పాటు వాతావరణ పరిస్థితులను తట్టుకునే ఆధునిక 'మాడ్యులర్' హంగులను సంతరించుకున్నాయి. పైకప్పుతో కూడిన బహిరంగ ప్రదేశం (ప్లాజా), డిజిటల్ దిశానిర్దేశక వ్యవస్థ మరియు క్రమబద్ధమైన పార్కింగ్ వంటి సౌకర్యాలు ఇందులో సున్నితంగా జోడించబడ్డాయి. రాత్రివేళల్లో వారసత్వ శైలి లైటింగ్ ఆధునిక పైకప్పులతో (కానోపీలతో) కలిసిపోయి, చరిత్ర మరియు ఆధునిక అవసరాలు కలిసి సాగే ఒక సుస్థిరమైన ప్రాంగణాన్ని సృష్టిస్తాయి.",
    language: "భాష",
    fullscreen: "ఫుల్‌స్క్రీన్",
    help: "సహాయం",
    close: "మూసివేయండి",
    virtualTour: "వర్చువల్ టూర్",
    history: "చరిత్ర",
    plans: "మార్కెట్ ప్లాన్",
    gallery: "గ్యాలరీ",
    planHint: "వివరాలు చూడటానికి ప్లాన్‌లోని పిన్‌పై క్లిక్ చేయండి.",
    prev: "మునుపటి",
    zoomIn: "జూమ్ ఇన్",
    zoomOut: "జూమ్ అవుట్",
    recenter: "వీక్షణాన్ని మధ్యకు తీసుకురండి",
    next: "తదుపరి",
    videoError: "వీడియో లోడ్ కాలేదు.",
    youAreAt: "మీరు ఇక్కడ ఉన్నారు",
    helpText:
      "చుట్టూ చూడటానికి లాగండి. జూమ్ చేయడానికి స్క్రోల్ చేయండి. తదుపరి ప్రదేశానికి వెళ్లడానికి నేలపై ఉన్న బాణాలపై క్లిక్ చేయండి, దుకాణం గురించి తెలుసుకోవడానికి పిన్‌లపై క్లిక్ చేయండి.",
  },
};

const STORAGE_KEY = "bazaar-lang";
const LanguageContext = createContext(null);

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {
    /* storage may be unavailable */
  }
  return "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  const value = useMemo(() => {
    const setLang = (code) => {
      setLangState(code);
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        /* ignore */
      }
    };
    const t = (key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
    return { lang, setLang, t };
  }, [lang]);

  // Lets the browser pick the right fonts / hyphenation for the language.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

// For data objects shaped like { en: '...', hi: '...', te: '...' }.
export function pick(value, lang) {
  if (value && typeof value === "object") return value[lang] ?? value.en ?? "";
  return value ?? "";
}
