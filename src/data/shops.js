// Shops listed in the tour's "Explore the market" panel, with the content shown
// in the info card when a shop is selected.
//
// Text is written per language: { en: '...', hi: '...', te: '...' }.
//   name / desc : title and one-line summary in the side list
//   about       : short paragraph in the info card
//   items       : "What you'll find" chips (a list per language)
//   tip         : "Good to know" line
//
// The text below is general information about each kind of stall. Replace it
// with details of your own stalls (names, timings, specialities) when you have them.
export const SHOPS = [
  {
    id: "vegetables",
    emoji: "🥬",
    name: {
      en: "Vegetable Market",
      hi: "सब्ज़ी बाज़ार",
      te: "కూరగాయల మార్కెట్",
    },
    desc: {
      en: "Greens, tomatoes and gourds",
      hi: "पत्तेदार सब्ज़ियाँ, टमाटर और लौकी",
      te: "ఆకుకూరలు, టమాటాలు మరియు సొరకాయలు",
    },
    about: {
      en: "Fresh vegetables arrive from nearby farms early each morning and are stacked in crates and baskets along the stall. Prices change with the season, so the best choices are usually whatever is being sold in the biggest heaps.",
      hi: "आसपास के खेतों से हर सुबह ताज़ी सब्ज़ियाँ आती हैं और दुकान पर क्रेट व टोकरियों में सजाई जाती हैं। भाव मौसम के साथ बदलते हैं, इसलिए जो सब्ज़ी सबसे ज़्यादा मात्रा में बिक रही हो, वही अक्सर सबसे अच्छा विकल्प होती है।",
      te: "సమీప పొలాల నుండి ప్రతి ఉదయం తాజా కూరగాయలు వస్తాయి, వాటిని క్రేట్లు మరియు బుట్టలలో దుకాణంలో అమరుస్తారు. ధరలు సీజన్‌ను బట్టి మారుతాయి, అందువల్ల ఎక్కువ రాశిగా అమ్ముతున్నవే తరచుగా ఉత్తమ ఎంపిక.",
    },
    items: {
      en: [
        "Tomatoes",
        "Onions & potatoes",
        "Leafy greens",
        "Gourds & beans",
        "Brinjal & okra",
      ],
      hi: [
        "टमाटर",
        "प्याज़ और आलू",
        "पत्तेदार साग",
        "लौकी और फलियाँ",
        "बैंगन और भिंडी",
      ],
      te: [
        "టమాటాలు",
        "ఉల్లిపాయలు & బంగాళదుంపలు",
        "ఆకుకూరలు",
        "సొరకాయలు & చిక్కుళ్ళు",
        "వంకాయ & బెండకాయ",
      ],
    },
    tip: {
      en: "Come early in the morning for the freshest greens.",
      hi: "सबसे ताज़ा साग के लिए सुबह जल्दी आएँ।",
      te: "అత్యంత తాజా ఆకుకూరల కోసం ఉదయాన్నే రండి.",
    },
  },
  {
    id: "fruits",
    emoji: "🍊",
    name: {
      en: "Fresh Fruit Market",
      hi: "ताज़ा फल बाज़ार",
      te: "తాజా పండ్ల మార్కెట్",
    },
    desc: {
      en: "Bananas, mangoes and citrus",
      hi: "केले, आम और खट्टे फल",
      te: "అరటి, మామిడి మరియు నిమ్మజాతి పండ్లు",
    },
    about: {
      en: "Seasonal fruit is arranged in colourful baskets and crates, from everyday bananas to summer mangoes. Ask the vendor which fruit is ripe for eating today and which will keep for a few days.",
      hi: "मौसमी फल रंग-बिरंगी टोकरियों और क्रेट में सजे होते हैं, रोज़ के केलों से लेकर गर्मियों के आमों तक। विक्रेता से पूछें कि आज खाने लायक पका फल कौन-सा है और कौन-सा कुछ दिन टिकेगा।",
      te: "రంగురంగుల బుట్టలు మరియు క్రేట్లలో కాలానుగుణ పండ్లు అమర్చబడతాయి, రోజువారీ అరటిపండ్ల నుండి వేసవి మామిడి వరకు. ఈ రోజు తినడానికి పండినవి ఏవో, కొన్ని రోజులు నిలిచేవి ఏవో విక్రేతను అడగండి.",
    },
    items: {
      en: [
        "Bananas",
        "Mangoes (in season)",
        "Oranges & sweet lime",
        "Apples & pomegranates",
        "Papaya & guava",
      ],
      hi: [
        "केले",
        "आम (मौसम में)",
        "संतरे और मौसमी",
        "सेब और अनार",
        "पपीता और अमरूद",
      ],
      te: [
        "అరటిపండ్లు",
        "మామిడి (సీజన్‌లో)",
        "నారింజ & బత్తాయి",
        "ఆపిల్ & దానిమ్మ",
        "బొప్పాయి & జామ",
      ],
    },
    tip: {
      en: "Choose fruit that feels heavy for its size and smells sweet.",
      hi: "ऐसा फल चुनें जो आकार के हिसाब से भारी लगे और जिसमें मीठी ख़ुशबू हो।",
      te: "పరిమాణానికి బరువుగా అనిపించి, తీయని వాసన వచ్చే పండ్లను ఎంచుకోండి.",
    },
  },
  {
    id: "flowers",
    emoji: "🌼",
    name: { en: "Flower Shop", hi: "फूलों की दुकान", te: "పూల దుకాణం" },
    desc: {
      en: "Jasmine, marigold and roses",
      hi: "चमेली, गेंदा और गुलाब",
      te: "మల్లెలు, బంతిపూలు మరియు గులాబీలు",
    },
    about: {
      en: "Fresh flowers for pooja, weddings and everyday decoration are sold loose, by weight, or tied into garlands. Garlands are strung fresh through the morning, so the scent is strongest early in the day.",
      hi: "पूजा, शादियों और रोज़ की सजावट के लिए ताज़े फूल खुले, तौल के हिसाब से या माला में गूँथकर बिकते हैं। सुबह के समय माला ताज़ा गूँथी जाती है, इसलिए ख़ुशबू तब सबसे अच्छी होती है।",
      te: "పూజలు, పెళ్లిళ్లు మరియు రోజువారీ అలంకరణ కోసం తాజా పూలు విడిగా, తూకం ప్రకారం లేదా మాలలుగా అమ్ముతారు. ఉదయం వేళ మాలలు తాజాగా అల్లుతారు, కాబట్టి సువాసన అప్పుడే ఎక్కువగా ఉంటుంది.",
    },
    items: {
      en: ["Jasmine", "Marigold", "Roses", "Garlands", "Pooja flowers"],
      hi: ["चमेली", "गेंदा", "गुलाब", "मालाएँ", "पूजा के फूल"],
      te: ["మల్లెలు", "బంతిపూలు", "గులాబీలు", "మాలలు", "పూజా పూలు"],
    },
    tip: {
      en: "Buy garlands on the day you need them; jasmine and roses wilt fast.",
      hi: "माला उसी दिन ख़रीदें जिस दिन ज़रूरत हो; चमेली और गुलाब जल्दी मुरझा जाते हैं।",
      te: "మాలలను అవసరమైన రోజే కొనండి; మల్లెలు, గులాబీలు త్వరగా వాడిపోతాయి.",
    },
  },
  {
    id: "meat",
    emoji: "🥩",
    name: { en: "Meat Shop", hi: "मांस की दुकान", te: "మాంసం దుకాణం" },
    desc: {
      en: "Fresh meat counter",
      hi: "ताज़ा मांस काउंटर",
      te: "తాజా మాంసం కౌంటర్",
    },
    about: {
      en: "A fresh meat counter with cuts prepared to order. The meat is kept chilled and weighed in front of you, so you can ask for the cut and size you want.",
      hi: "ऑर्डर के अनुसार कटे हुए ताज़े मांस का काउंटर। मांस ठंडा रखा जाता है और आपके सामने तौला जाता है, इसलिए आप अपनी पसंद का कट और आकार माँग सकते हैं।",
      te: "ఆర్డర్ ప్రకారం ముక్కలు కోసే తాజా మాంసం కౌంటర్. మాంసాన్ని చల్లగా ఉంచి మీ ముందే తూకం వేస్తారు, కాబట్టి మీకు కావలసిన ముక్క, పరిమాణం అడగవచ్చు.",
    },
    items: {
      en: [
        "Mutton",
        "Mince (keema)",
        "Curry cuts",
        "Bone-in pieces",
        "Ready-to-cook portions",
      ],
      hi: [
        "मटन",
        "कीमा",
        "करी कट",
        "हड्डी वाले टुकड़े",
        "पकाने के लिए तैयार टुकड़े",
      ],
      te: [
        "మటన్",
        "కీమా",
        "కర్రీ కట్స్",
        "ఎముకతో ముక్కలు",
        "వండడానికి సిద్ధమైన ముక్కలు",
      ],
    },
    tip: {
      en: "Ask for the cut that suits your recipe: curry, fry or mince.",
      hi: "अपनी रेसिपी के हिसाब से कट माँगें: करी, फ्राई या कीमा।",
      te: "మీ వంటకానికి తగిన ముక్కను అడగండి: కర్రీ, ఫ్రై లేదా కీమా.",
    },
  },
  {
    id: "poultry",
    emoji: "🍗",
    name: {
      en: "Chicken & Poultry",
      hi: "चिकन और पोल्ट्री",
      te: "చికెన్ మరియు పౌల్ట్రీ",
    },
    desc: {
      en: "Poultry display",
      hi: "पोल्ट्री प्रदर्शन",
      te: "పౌల్ట్రీ ప్రదర్శన",
    },
    about: {
      en: "Chicken and poultry are cut and cleaned at the counter. Whole birds, curry cuts and boneless pieces are all available, prepared fresh for the day.",
      hi: "चिकन और पोल्ट्री काउंटर पर ही काटकर साफ़ की जाती है। पूरा चिकन, करी कट और बोनलेस टुकड़े उपलब्ध रहते हैं, जो उसी दिन ताज़ा तैयार होते हैं।",
      te: "చికెన్ మరియు పౌల్ట్రీని కౌంటర్ వద్దే కోసి శుభ్రం చేస్తారు. మొత్తం కోడి, కర్రీ కట్స్ మరియు ఎముకలేని ముక్కలు లభిస్తాయి, ఆ రోజుకు తాజాగా సిద్ధం చేస్తారు.",
    },
    items: {
      en: [
        "Whole chicken",
        "Curry cut",
        "Boneless pieces",
        "Country chicken",
        "Drumsticks & wings",
      ],
      hi: [
        "पूरा चिकन",
        "करी कट",
        "बोनलेस टुकड़े",
        "देसी मुर्गा",
        "ड्रमस्टिक और विंग्स",
      ],
      te: [
        "మొత్తం కోడి",
        "కర్రీ కట్",
        "ఎముకలేని ముక్కలు",
        "నాటు కోడి",
        "డ్రమ్‌స్టిక్స్ & వింగ్స్",
      ],
    },
    tip: {
      en: "Carry a cool bag if you have a long journey home.",
      hi: "घर दूर हो तो कूल बैग साथ रखें।",
      te: "ఇల్లు దూరంగా ఉంటే కూల్ బ్యాగ్ తీసుకెళ్లండి.",
    },
  },
  {
    id: "fish",
    emoji: "🐟",
    name: { en: "Fish Market", hi: "मछली बाज़ार", te: "చేపల మార్కెట్" },
    desc: {
      en: "Seafood display",
      hi: "समुद्री भोजन प्रदर्शन",
      te: "సీఫుడ్ ప్రదర్శన",
    },
    about: {
      en: "Fresh fish and seafood are kept on ice and cleaned on request. The catch changes from day to day, so ask what came in this morning.",
      hi: "ताज़ी मछली और समुद्री भोजन बर्फ़ पर रखा जाता है और माँगने पर साफ़ किया जाता है। मछली रोज़ बदलती रहती है, इसलिए पूछें कि आज सुबह क्या आया है।",
      te: "తాజా చేపలు మరియు సీఫుడ్‌ను మంచుపై ఉంచి, కోరితే శుభ్రం చేస్తారు. రోజును బట్టి చేపలు మారుతాయి, కాబట్టి ఈ ఉదయం ఏవి వచ్చాయో అడగండి.",
    },
    items: {
      en: ["River fish", "Sea fish", "Prawns", "Crab", "Dried fish"],
      hi: ["नदी की मछली", "समुद्री मछली", "झींगा", "केकड़ा", "सूखी मछली"],
      te: ["నది చేపలు", "సముద్ర చేపలు", "రొయ్యలు", "పీతలు", "ఎండు చేపలు"],
    },
    tip: {
      en: "Look for clear eyes and firm flesh; fresh fish has no strong smell.",
      hi: "साफ़ आँखें और सख़्त गूदा देखें; ताज़ी मछली में तेज़ गंध नहीं होती।",
      te: "స్పష్టమైన కళ్ళు, గట్టి మాంసం చూడండి; తాజా చేపకు ఘాటు వాసన ఉండదు.",
    },
  },
  {
    id: "dairy",
    emoji: "🥚",
    name: {
      en: "Dairy & Eggs",
      hi: "डेयरी और अंडे",
      te: "పాల ఉత్పత్తులు మరియు గుడ్లు",
    },
    desc: {
      en: "Milk, curd and eggs",
      hi: "दूध, दही और अंडे",
      te: "పాలు, పెరుగు మరియు గుడ్లు",
    },
    about: {
      en: "Milk, curd, butter and eggs for the daily kitchen. Dairy is kept cool, and eggs are sold by the piece or in trays.",
      hi: "रोज़ की रसोई के लिए दूध, दही, मक्खन और अंडे। डेयरी उत्पाद ठंडे रखे जाते हैं और अंडे नग के हिसाब से या ट्रे में बिकते हैं।",
      te: "రోజువారీ వంటగది కోసం పాలు, పెరుగు, వెన్న మరియు గుడ్లు. పాల ఉత్పత్తులను చల్లగా ఉంచుతారు, గుడ్లను ముక్కల లెక్కన లేదా ట్రేలలో అమ్ముతారు.",
    },
    items: {
      en: ["Milk", "Curd", "Butter & ghee", "Paneer", "Eggs"],
      hi: ["दूध", "दही", "मक्खन और घी", "पनीर", "अंडे"],
      te: ["పాలు", "పెరుగు", "వెన్న & నెయ్యి", "పనీర్", "గుడ్లు"],
    },
    tip: {
      en: "Check the date on packed items and keep dairy cold on the way home.",
      hi: "पैकेट वाली चीज़ों की तारीख़ देखें और घर तक डेयरी को ठंडा रखें।",
      te: "ప్యాక్ చేసిన వస్తువుల తేదీ చూడండి, ఇంటికి వెళ్లే వరకు పాల ఉత్పత్తులను చల్లగా ఉంచండి.",
    },
  },
  {
    id: "spices",
    emoji: "🌶️",
    name: {
      en: "Spices & Groceries",
      hi: "मसाले और किराना",
      te: "మసాలాలు మరియు కిరాణా",
    },
    desc: {
      en: "Pulses, spices and grains",
      hi: "दालें, मसाले और अनाज",
      te: "పప్పులు, మసాలాలు మరియు ధాన్యాలు",
    },
    about: {
      en: "Whole and ground spices, pulses and grains, sold loose by weight from sacks and steel bowls. Smell before you buy: fresh spices are strongly aromatic.",
      hi: "साबुत और पिसे मसाले, दालें और अनाज बोरियों और स्टील के कटोरों से तौलकर खुले बिकते हैं। ख़रीदने से पहले सूँघकर देखें: ताज़े मसालों की ख़ुशबू तेज़ होती है।",
      te: "మొత్తం మరియు పొడి మసాలాలు, పప్పులు మరియు ధాన్యాలు బస్తాలు, స్టీల్ గిన్నెల నుండి తూకం ప్రకారం విడిగా అమ్ముతారు. కొనే ముందు వాసన చూడండి: తాజా మసాలాలు ఘాటుగా సువాసన ఇస్తాయి.",
    },
    items: {
      en: [
        "Turmeric & chilli",
        "Cumin & coriander",
        "Toor & moong dal",
        "Rice & millets",
        "Tamarind & jaggery",
      ],
      hi: [
        "हल्दी और मिर्च",
        "जीरा और धनिया",
        "अरहर और मूँग दाल",
        "चावल और मोटे अनाज",
        "इमली और गुड़",
      ],
      te: [
        "పసుపు & కారం",
        "జీలకర్ర & ధనియాలు",
        "కందిపప్పు & పెసరపప్పు",
        "బియ్యం & చిరుధాన్యాలు",
        "చింతపండు & బెల్లం",
      ],
    },
    tip: {
      en: "Store spices in airtight jars away from sunlight.",
      hi: "मसालों को हवाबंद डिब्बों में धूप से दूर रखें।",
      te: "మసాలాలను గాలి చొరబడని డబ్బాల్లో ఎండకు దూరంగా నిల్వ చేయండి.",
    },
  },
];
