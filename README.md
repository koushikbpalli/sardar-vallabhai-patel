# Virtual Bazaar Tour

A 360° photo virtual tour of a bazaar, built with React, Vite and
[Photo Sphere Viewer](https://photo-sphere-viewer.js.org/). Made for display on a monitor.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## How it works

1. **Home page**: a background image, the title in the centre, an **Enter the Bazaar** button and
   English / हिन्दी / తెలుగు buttons at the bottom.
2. **Enter the Bazaar**: the background pushes in, the home page fades away and the tour starts at the
   Main Entrance.
3. **Tour**: drag to look around, scroll to zoom, click the floor arrows to walk to the next spot and the
   pins to open a stall's details.
4. **Round menu (bottom-left)**: opens in an arc with Home, Locations, Language, Fullscreen and Help.
5. After 2 minutes without any interaction the tour returns to the home page (kiosk behaviour).

## Replace the placeholder images

| File | Used for |
| --- | --- |
| `public/images/home-bg.jpg` | Home page background (about 1920x1080 or larger) |
| `public/panos/entrance.jpg` | 360° photo, Main Entrance |
| `public/panos/vegetables.jpg` | 360° photo, Vegetable Section |
| `public/panos/spices.jpg` | 360° photo, Spice Lane |

Panoramas must be equirectangular (2:1), about 6000x3000 px, JPG or WebP. The placeholder panoramas have
yaw/pitch guide lines drawn on them. Use those numbers when you place arrows and pins, then swap in your
real photos with the same file names (or change the paths in `src/data/nodes.js`).

## Add or edit scenes, stalls and text

Everything about scenes lives in `src/data/nodes.js`:

- one entry per panorama, with its name in English, Hindi and Telugu,
- `links`: the floor arrows that connect spots (`yaw` / `pitch` position and the `nodeId` they lead to),
- `markers`: stall pins with a title, tag and description in all three languages.

Interface text (title, button, menu labels, help) is in `src/i18n.jsx`.

## Project layout

```
src/
  App.jsx                    home <-> tour flow and transition
  i18n.jsx                   English / Hindi / Telugu strings and language state
  components/Home.jsx        title, Enter button, language buttons
  components/Tour.jsx        Photo Sphere Viewer + virtual tour + idle timer
  components/FloatingMenu.jsx  round menu, locations / language / help panels
  components/InfoPanel.jsx   stall details card
  data/nodes.js              scenes, links, markers (edit this)
  styles.css
public/
  images/home-bg.jpg
  panos/*.jpg
```

## Build for hosting

```bash
npm run build
```

Upload the `dist/` folder to Netlify, Vercel or Cloudflare Pages.
