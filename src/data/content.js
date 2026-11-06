// Content for the History video, the Plans page and the Gallery.
// Text is written per language: { en: '...', hi: '...', te: '...' }.

// ---- History: video shown in a popup -------------------------------------
// Put the file in public/video/ (served from "/video/...").
export const HISTORY_VIDEO = {
  src: "/video/history.mp4",
  poster: "/images/home-bg.png",
};

// ---- Plans: market plan with clickable pins ------------------------------
// image : the plan picture, put it in public/images/
// ratio : its width / height (3058 x 4096 -> 0.7466). Pins are placed as a
//         percentage of the image, so this must match the real picture.
// pins  : x = % from the left edge, y = % from the top edge.
//         image/title/tag/description appear in the side card on click.
//         `image` is optional - leave it out for a pin without a photo.
const TODO = {
  en: "Replace this text with your details.",
  hi: "इस टेक्स्ट को अपने विवरण से बदलें।",
  te: "ఈ టెక్స్ట్‌ను మీ వివరాలతో మార్చండి.",
};

export const PLAN = {
  image: "/images/market-plan.png",
  ratio: 3058 / 4096,
  pins: [
    {
      id: "plan-main-entry",
      x: 79,
      y: 36.8,
      image: "/panos/entrance.jpg",
      title: { en: "Main Entry", hi: "मुख्य प्रवेश", te: "ప్రధాన ప్రవేశం" },
      tag: { en: "Entry", hi: "प्रवेश", te: "ప్రవేశం" },
      description: TODO,
    },
    {
      id: "plan-indoor-hall",
      x: 71.2,
      y: 22.5,
      title: { en: "Indoor Hall", hi: "इनडोर हॉल", te: "ఇండోర్ హాల్" },
      tag: { en: "Hall", hi: "हॉल", te: "హాల్" },
      description: TODO,
    },
    {
      id: "plan-covered-passage",
      x: 43.7,
      y: 33.5,
      title: {
        en: "Covered Passage",
        hi: "ढका हुआ गलियारा",
        te: "కప్పబడిన నడవ",
      },
      tag: { en: "Walkway", hi: "गलियारा", te: "నడవ" },
      description: TODO,
    },
    {
      id: "plan-vegetables",
      x: 40.3,
      y: 46.8,
      image: "/panos/vegetables.jpg",
      title: {
        en: "Vegetable Stalls",
        hi: "सब्ज़ी की दुकानें",
        te: "కూరగాయల దుకాణాలు",
      },
      tag: { en: "Stalls", hi: "दुकानें", te: "దుకాణాలు" },
      description: TODO,
    },
    {
      id: "plan-grains-spices",
      x: 40.2,
      y: 52.2,
      image: "/panos/spices.jpg",
      title: {
        en: "Grains & Spices",
        hi: "अनाज और मसाले",
        te: "ధాన్యాలు మరియు మసాలాలు",
      },
      tag: { en: "Stalls", hi: "दुकानें", te: "దుకాణాలు" },
      description: TODO,
    },
    {
      id: "plan-ramp-stalls",
      x: 64.1,
      y: 71.5,
      title: {
        en: "Ramp-side Stalls",
        hi: "रैंप किनारे की दुकानें",
        te: "ర్యాంప్ పక్కన దుకాణాలు",
      },
      tag: { en: "Stalls", hi: "दुकानें", te: "దుకాణాలు" },
      description: TODO,
    },
  ],
};

// ---- Gallery: horizontally scrollable pictures ---------------------------
// Put the pictures in public/images/gallery/ and list them here.
export const GALLERY = [
  {
    src: "/images/gallery-1.png",
    caption: {
      en: "Meat Section",
      hi: "मांस का भाग",
      te: "మాంస విభాగం",
    },
  },
  {
    src: "/images/gallery-2.png",
    caption: {
      en: "Main Entrance",
      hi: "मुख्य प्रवेश द्वार",
      te: "ప్రధాన ప్రవేశ ద్వారం",
    },
  },
  {
    src: "/images/gallery-3.jpeg",
    caption: { en: "Flower Shop", hi: "फूल की दुकान", te: "పువ్వు దుకాణం" },
  },
  {
    src: "/images/gallery-4.jpeg",
    caption: {
      en: "Fruits & Vegetables",
      hi: "फल और सब्ज़ी",
      te: "ఫలాలు మరియు కూరగాయలు",
    },
  },
];

// ---- 360° Renders: panorama images ---------------------------------------
// src       : picture in public/ (path starts with "/")
// thumbnail : optional small preview for the grid (faster than the full picture)
// hfov      : optional, how many degrees the picture spans sideways.
//             Leave it out for a full 360° panorama. For a picture that only
//             covers part of the way round (e.g. a wide photo), set the
//             angle (e.g. 120) and the viewer stops at the picture's edges.
export const RENDERS = [
  {
    src: "/images/renders/chai-corner.jpg",
    thumbnail: "/images/renders/chai-corner-thumb.jpg",
    caption: { en: "Chai Corner", hi: "चाय कॉर्नर", te: "చాయ్ కార్నర్" },
  },
  {
    src: "/images/renders/flower-shop.jpg",
    thumbnail: "/images/renders/flower-shop-thumb.jpg",
    hfov: 180,
    caption: { en: "Flower Shop", hi: "फूल की दुकान", te: "పువ్వుల దుకాణం" },
  },
  {
    src: "/images/renders/vegetables.jpg",
    thumbnail: "/images/renders/vegetables-thumb.jpg",
    caption: {
      en: "Fruits & Vegetables",
      hi: "फल और सब्ज़ी",
      te: "ఫలాలు మరియు కూరగాయలు",
    },
  },
  {
    src: "/images/renders/meat-shop.jpg",
    thumbnail: "/images/renders/meat-shop-thumb.jpg",
    caption: { en: "Meat Section", hi: "मांस का भाग", te: "మాంస విభాగం" },
  },
];
