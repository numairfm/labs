# Design Spec: Web Lab Modular Static Toolbox

A professional, modern, and highly modular personal website that functions as a rich, accessible toolbox for on-browser utilities (compression, file conversion, media utilities, interactive toys, etc.). Hosted entirely as a static site via GitHub Pages, with a dynamic build-time auto-discovery mechanism powered by Vite.

---

## 1. Project Architecture & Directory Structure

```text
jukebox/
├── .github/workflows/deploy.yml <-- GitHub Actions for auto-deploying to Pages
├── docs/                         <-- Project specs and design documentation
│   └── superpowers/
│       └── specs/
│           └── 2026-05-20-web-lab-architecture-design.md
├── public/                       <-- Global static assets (favicons, manifest.json)
├── src/
│   ├── assets/                   <-- Shared resources
│   │   ├── css/
│   │   │   ├── main.css          <-- CSS custom variables, typography, reset
│   │   │   └── components.css    <-- Sleek shared components (cards, navbar, controls)
│   │   └── js/
│   │       ├── utils.js          <-- Shared SDK helpers (drag-drop, toast notifications)
│   │       └── manifest.json     <-- Generated dynamically at build time
│   ├── tools/                    <-- Directory of modular tools
│   │   ├── image-compressor/     <-- Example tool 1: Image Compression
│   │   │   ├── index.html
│   │   │   ├── main.js
│   │   │   ├── style.css
│   │   │   └── meta.json
│   │   └── unit-converter/       <-- Example tool 2: Converter & Calculator
│   │       ├── index.html
│   │       ├── main.js
│   │       ├── style.css
│   │       └── meta.json
│   ├── index.html                <-- Dashboard Hub Homepage
│   └── main.js                   <-- Homepage search, category filtering & card rendering
├── vite.config.js                <-- Dynamic build entry generator & auto-registry generator
├── package.json
└── README.md
```

---

## 2. Dynamic Discovery & Build System

### 2.1 Dynamic Entry Generation (`vite.config.js`)
We use a lightweight script inside `vite.config.js` to scan `src/tools/*/index.html` at build time. These paths are dynamically added to Vite's `rollupOptions.input` object so that Vite compiles each tool as an independent page (e.g., building to `/tools/image-compressor/index.html` inside `dist/`).

### 2.2 Metadata Collection & Manifest
At build time (and local startup), Vite runs a custom hook that:
1. Scans `src/tools/*/meta.json`.
2. Reads the metadata fields (name, category, description, icon, tags).
3. Compiles a single dynamic registry manifest `src/assets/js/manifest.json`.
4. Writes it to the source directory so that `src/main.js` can import it natively.

---

## 3. UI/UX Design System & Layout Guidelines

The design avoids "AI SEO slop" by utilizing high-end typography, strict layout grids, interactive glassmorphic surfaces, and curated dark/light palettes.

### 3.1 Color System & Dark Mode
We implement a modern HSL color framework in `/src/assets/css/main.css` targeting high-contrast, professional shades:
- **Dark Mode Background:** `hsl(220, 15%, 8%)` (Deep midnight grey)
- **Light Mode Background:** `hsl(0, 0%, 98%)` (Warm soft white)
- **Container Borders:** `1px solid hsl(220, 10%, 15%)` / `hsl(0, 0%, 90%)`
- **Primary Accents:** Slate Blue (`hsl(230, 75%, 60%)`) and Emerald Teal (`hsl(160, 75%, 45%)`)

### 3.2 Homepage Hub Layout
- **Minimal Navigation:** Header with "Web Lab", Light/Dark Toggle, and external repo icon.
- **Hero Hub & Search Bar:** An elegant search input that immediately filters tools by name, description, category, or tag with no lag.
- **Categories Tab Bar:** Seamless slider chips to filter the grid down to `All`, `Media`, `Utilities`, `Music`, `Toys`.
- **Dynamic CSS Grid:** Beautiful tool cards that exhibit smooth hover transforms (micro-animations, slight drop shadows, gradient border reveals).

### 3.3 Dynamic Canvas Layout (Per Tool)
Every tool page features an isolated container matching the layout:
- **Top Bar:** Back to Hub button, page title, and utility settings.
- **The Canvas Box:** Centered workspace where the tool logic operates. The stylesheet `style.css` in each tool folder is loaded locally, ensuring zero leakage of CSS classes to the rest of the application.

---

## 4. The Tool Registry Contract

Every modular tool MUST supply:
1. **`meta.json`**:
   ```json
   {
     "id": "tool-id",
     "name": "Human-Readable Name",
     "description": "Short summary of utility functionality.",
     "category": "Media | Utilities | Music | Toys",
     "icon": "svg-icon-key",
     "tags": ["image", "compress", "quick"],
     "author": "Author",
     "version": "1.0.0"
   }
   ```
2. **`index.html`**: Links to `../../assets/css/main.css` for styling tokens and standard HTML wrappers.
3. **`main.js`**: An ES6 Module that registers interactive handlers and performs processing.
4. **`style.css`**: Isolated custom rules for rendering UI interfaces in the Canvas.

---

## 5. First-Phase Tools for Implementation
1. **Homepage Hub**: Interactive search/category dashboard.
2. **Image Compressor (Media)**: Fast browser-side Canvas-based JPEG/PNG compression with live percentage optimization updates.
3. **Unit Converter & Calculator (Utilities)**: Clean, sleek input fields for instant unit calculation (size, digital data, length, temperature).

---

## 6. Verification Plan
- **Vite Multi-Page Build Verification**: Verify that running `npm run build` compiles clean directories matching static structures.
- **Modularity Validation Test**: Verify that removing a folder completely deletes it from the home page manifest and build layout.
- **A11y/Responsiveness Check**: Verify responsive typography and inputs from 320px (mobile) to 1920px (desktop viewport width).
