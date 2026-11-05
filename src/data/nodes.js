// Scene data for the 3D walkthrough.
//
// Each node is a "spot" the visitor can walk to inside the 3D model
// (public/models/market.glb). Coordinates are in metres:
//   x = left(-) / right(+),  y = up,  z = towards the viewer(+) / into the street(-)
// The model is centred on x/z = 0 and its lowest point is placed at y = 0.
//
// TIP: walk around the model in the browser and press the P key. The console
// prints a ready-made `camera: {...}` line you can paste into a node below.
//
// camera.yaw   : degrees, 0 = looking down -Z, 90 = looking left, -90 = looking right
// camera.pitch : degrees, 0 = horizon, positive = look up
// links        : floor arrows that walk to another node. `position` is where the arrow floats.
// markers      : info pins on stalls. `position` is a 3D point on the stall.
//
// Text is written per language: { en: '...', hi: '...', te: '...' }.

export const START_NODE = "entrance";

export const nodes = [
  // {
  //   id: "entrance",
  //   name: {
  //     en: "Main Entrance",
  //     hi: "मुख्य प्रवेश द्वार",
  //     te: "ప్రధాన ప్రవేశ ద్వారం",
  //   },
  //   thumbnail: "/panos/entrance.png", // only used for the menu circle
  //   camera: { position: [0, 1.7, 12], yaw: 0, pitch: 0 },
  //   links: [{ nodeId: "vegetables", position: [0, 0.3, 5] }],
  //   markers: [
  //     {
  //       id: "welcome",
  //       position: [-3, 2.5, 6],
  //       title: { en: "Welcome", hi: "स्वागत", te: "స్వాగతం" },
  //       tag: { en: "Info", hi: "जानकारी", te: "సమాచారం" },
  //       description: {
  //         en: "Welcome to the bazaar! Drag to look around, scroll to zoom, use W/A/S/D to walk, or click the arrows and the floor to move.",
  //         hi: "बाज़ार में आपका स्वागत है! चारों ओर देखने के लिए खींचें, ज़ूम करने के लिए स्क्रॉल करें, चलने के लिए W/A/S/D दबाएँ, या तीरों और ज़मीन पर क्लिक करें।",
  //         te: "బజార్‌కు స్వాగతం! చుట్టూ చూడటానికి లాగండి, జూమ్ చేయడానికి స్క్రోల్ చేయండి, నడవడానికి W/A/S/D నొక్కండి లేదా బాణాలు, నేలపై క్లిక్ చేయండి.",
  //       },
  //     },
  //   ],
  // },
  // {
  //   id: "vegetables",
  //   name: {
  //     en: "Vegetable Section",
  //     hi: "सब्ज़ी बाज़ार",
  //     te: "కూరగాయల విభాగం",
  //   },
  //   thumbnail: "/panos/vegetables.jpg",
  //   camera: { position: [0, 1.7, -12], yaw: 90, pitch: 0 },
  //   links: [
  //     { nodeId: "entrance", position: [0, 0.3, -7] },
  //     { nodeId: "spices", position: [0, 0.3, -20] },
  //   ],
  //   markers: [
  //     {
  //       id: "veg-stall-1",
  //       position: [-6.2, 2.2, -14],
  //       title: {
  //         en: "Fresh Vegetables",
  //         hi: "ताज़ी सब्ज़ियाँ",
  //         te: "తాజా కూరగాయలు",
  //       },
  //       tag: { en: "Stall 12", hi: "दुकान 12", te: "దుకాణం 12" },
  //       description: {
  //         en: "Seasonal vegetables delivered every morning from nearby farms. Replace this text with your stall details.",
  //         hi: "आस-पास के खेतों से हर सुबह आने वाली मौसमी सब्ज़ियाँ। इस टेक्स्ट को अपनी दुकान के विवरण से बदलें।",
  //         te: "సమీప పొలాల నుండి ప్రతి ఉదయం వచ్చే సీజనల్ కూరగాయలు. ఈ టెక్స్ట్‌ను మీ దుకాణ వివరాలతో మార్చండి.",
  //       },
  //     },
  //   ],
  // },
  // {
  //   id: "spices",
  //   name: { en: "Spice Lane", hi: "मसाला गली", te: "మసాలా వీధి" },
  //   thumbnail: "/panos/spices.jpg",
  //   camera: { position: [0, 1.7, -32], yaw: -90, pitch: 0 },
  //   links: [{ nodeId: "vegetables", position: [0, 0.3, -27] }],
  //   markers: [
  //     {
  //       id: "spice-stall-1",
  //       position: [6.2, 2.2, -30],
  //       title: {
  //         en: "Spice Merchant",
  //         hi: "मसाला व्यापारी",
  //         te: "మసాలా వ్యాపారి",
  //       },
  //       tag: { en: "Stall 27", hi: "दुकान 27", te: "దుకాణం 27" },
  //       description: {
  //         en: "Whole and ground spices, blended fresh. Replace this text with your stall details.",
  //         hi: "साबुत और पिसे मसाले, ताज़ा मिश्रित। इस टेक्स्ट को अपनी दुकान के विवरण से बदलें।",
  //         te: "మొత్తం మరియు పొడి మసాలాలు, తాజాగా కలిపినవి. ఈ టెక్స్ట్‌ను మీ దుకాణ వివరాలతో మార్చండి.",
  //       },
  //     },
  //   ],
  // },
];

export function getNode(id) {
  return nodes.find((n) => n.id === id);
}

// marker id -> marker data, used by the info card.
export const markerIndex = Object.fromEntries(
  nodes.flatMap((n) => (n.markers || []).map((m) => [m.id, m])),
);
