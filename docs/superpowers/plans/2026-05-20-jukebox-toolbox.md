# Jukebox Modular Static Toolbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a modular, responsive static website hosted on GitHub Pages that serves as a rich personal toolbox of on-browser utilities and toys.

**Architecture:** We use Vite as a static builder. A custom build-time script scans a dedicated `/src/tools` folder for sub-directories containing tools, automatically generates a central metadata manifest `manifest.json`, and configures multi-page input paths. The homepage consumes the dynamic manifest to render a beautiful, searchable, and category-filtered toolbox dashboard, where each tool is fully sandboxed in its own directory.

**Tech Stack:** Vite, Vanilla HTML5, Vanilla CSS3 (Custom Properties & HSL theme system), Vanilla ES6 JavaScript (ES Modules).

---

### Task 1: Project Initialization & Build-Time Registry Config

**Files:**
- Create: `package.json`
- Create: `vite.config.js`

- [ ] **Step 1: Create package.json**
  
  Write package.json with the necessary Vite dev dependency and script commands.
  
  ```json
  {
    "name": "jukebox",
    "private": true,
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview"
    },
    "devDependencies": {
      "vite": "^5.2.11"
    }
  }
  ```

- [ ] **Step 2: Create vite.config.js**

  Write a Vite configuration file that scans directories under `src/tools/` at startup and build-time. It will:
  1. Find all folders containing `meta.json` and build a static `manifest.json`.
  2. Dynamically feed every tool's `index.html` into Vite's Multi-Page setup (`rollupOptions.input`).
  
  ```javascript
  import { defineConfig } from 'vite';
  import { resolve, join } from 'path';
  import fs from 'fs';

  function jukeboxAutoRegistryPlugin() {
    return {
      name: 'jukebox-auto-registry',
      buildStart() {
        const toolsDir = resolve(__dirname, 'src/tools');
        if (!fs.existsSync(toolsDir)) {
          fs.mkdirSync(toolsDir, { recursive: true });
        }

        const folders = fs.readdirSync(toolsDir);
        const toolsManifest = [];

        folders.forEach(folder => {
          const folderPath = join(toolsDir, folder);
          if (fs.statSync(folderPath).isDirectory()) {
            const metaPath = join(folderPath, 'meta.json');
            if (fs.existsSync(metaPath)) {
              try {
                const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                toolsManifest.push({
                  id: folder,
                  ...meta
                });
              } catch (e) {
                console.error(`Failed to parse meta.json in ${folderPath}`, e);
              }
            }
          }
        });

        const assetsJsDir = resolve(__dirname, 'src/assets/js');
        if (!fs.existsSync(assetsJsDir)) {
          fs.mkdirSync(assetsJsDir, { recursive: true });
        }

        fs.writeFileSync(
          join(assetsJsDir, 'manifest.json'),
          JSON.stringify(toolsManifest, null, 2)
        );
        console.log(`[Jukebox Registry] Registered ${toolsManifest.length} tools dynamically.`);
      }
    };
  }

  export default defineConfig({
    root: 'src',
    publicDir: '../public',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: getEntryPoints()
      }
    },
    plugins: [jukeboxAutoRegistryPlugin()]
  });

  function getEntryPoints() {
    const entries = {
      main: resolve(__dirname, 'src/index.html')
    };

    const toolsDir = resolve(__dirname, 'src/tools');
    if (fs.existsSync(toolsDir)) {
      const folders = fs.readdirSync(toolsDir);
      folders.forEach(folder => {
        const indexPath = join(toolsDir, folder, 'index.html');
        if (fs.existsSync(indexPath)) {
          entries[folder] = indexPath;
        }
      });
    }

    return entries;
  }
  ```

- [ ] **Step 3: Create temporary tools structure to verify build**

  Create a placeholder directory `src/tools/test-tool` with a standard `meta.json` and a simple `index.html` to ensure the dynamic scan plugin works successfully during initial runs.
  
  Create `src/tools/test-tool/meta.json`:
  ```json
  {
    "name": "Test Tool",
    "description": "Verification placeholder",
    "category": "Utilities",
    "icon": "verified",
    "tags": ["test"],
    "author": "Numair",
    "version": "1.0.0"
  }
  ```
  
  Create `src/tools/test-tool/index.html`:
  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <title>Test Tool</title>
  </head>
  <body>
    <h1>Test Tool Operational</h1>
  </body>
  </html>
  ```
  
  Create `src/index.html` (minimal):
  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <title>Jukebox</title>
  </head>
  <body>
    <h1>Welcome to Jukebox</h1>
  </body>
  </html>
  ```

- [ ] **Step 4: Verify the builder config**

  Run `npm install` and trigger Vite building sequence to ensure it output `src/assets/js/manifest.json` correctly and compiled multiple page inputs.
  
  Run: `npm install && npm run build`
  Expected: Command finishes successfully. File `src/assets/js/manifest.json` is generated with one object (`Test Tool`). Directory `dist/` contains both `index.html` and a nested `tools/test-tool/index.html`.

- [ ] **Step 5: Commit**

  Run:
  ```bash
  git add package.json vite.config.js src/tools/test-tool src/index.html
  git commit -m "feat: initialize package.json and dynamic vite config builder"
  ```

---

### Task 2: Global CSS Design System & Theme Engine

**Files:**
- Create: `src/assets/css/main.css`
- Create: `src/assets/css/components.css`

- [ ] **Step 1: Write main.css**

  Implement high-fidelity vanilla styling layout with customizable dark/light mode toggle. Write HSL variable colors, resets, typography bindings, responsive utilities, and background blurs.
  
  ```css
  :root {
    /* Theme Light System */
    --bg-primary: hsl(0, 0%, 98%);
    --bg-secondary: hsl(0, 0%, 93%);
    --bg-card: hsl(0, 0%, 100%);
    --border-color: hsl(0, 0%, 90%);
    --text-primary: hsl(0, 0%, 15%);
    --text-secondary: hsl(0, 0%, 45%);
    
    --accent-blue: hsl(230, 75%, 60%);
    --accent-teal: hsl(160, 75%, 45%);
    --accent-red: hsl(0, 75%, 60%);
    --shadow-main: 0 4px 20px rgba(0, 0, 0, 0.05);
    
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  }

  [data-theme="dark"] {
    /* Theme Dark System */
    --bg-primary: hsl(220, 15%, 8%);
    --bg-secondary: hsl(220, 15%, 12%);
    --bg-card: hsl(220, 15%, 15%);
    --border-color: hsl(220, 10%, 20%);
    --text-primary: hsl(220, 15%, 90%);
    --text-secondary: hsl(220, 10%, 65%);
    
    --shadow-main: 0 4px 30px rgba(0, 0, 0, 0.3);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    transition: background-color 0.3s ease, border-color 0.3s ease;
  }

  body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-sans);
    line-height: 1.6;
    overflow-x: hidden;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  /* Utility Focus States */
  button:focus-visible, input:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 4px;
  }
  ```

- [ ] **Step 2: Write components.css**

  Implement high-fidelity reusable layout classes like premium dashboard cards, button frames, text input rows, layout headers, filter buttons, and custom micro-animations.
  
  ```css
  /* Premium Glassmorphic Cards */
  .card {
    background-color: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: var(--shadow-main);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
    cursor: pointer;
    text-decoration: none;
    color: inherit;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
    border-color: var(--accent-blue);
  }

  /* Shared Navigation Headers */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 0;
    border-bottom: 1px solid var(--border-color);
  }

  .header h1 {
    font-size: 1.8rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-teal));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* Clean Theme Control Buttons */
  .btn-icon {
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    width: 40px;
    height: 40px;
  }

  .btn-icon:hover {
    background-color: var(--bg-secondary);
    border-color: var(--text-secondary);
  }
  ```

- [ ] **Step 3: Update Test Tool index.html to verify stylesheets**

  Modify `src/tools/test-tool/index.html` to integrate both `main.css` and `components.css` to verify link validity.
  
  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Tool - Jukebox</title>
    <link rel="stylesheet" href="../../assets/css/main.css">
    <link rel="stylesheet" href="../../assets/css/components.css">
  </head>
  <body class="container">
    <header class="header">
      <h1>Verification Success</h1>
    </header>
    <main style="margin-top: 2rem;">
      <div class="card">
        <h3>Design System Active</h3>
        <p>The shared styling properties loaded perfectly inside the tool boundary container.</p>
      </div>
    </main>
  </body>
  </html>
  ```

- [ ] **Step 4: Verify styles locally**

  Run Vite development server and verify styling loads without errors.
  
  Run: `npx vite build` (ensures asset link resolution)
  Expected: Successful compilation, zero css bundle warnings.

- [ ] **Step 5: Commit**

  Run:
  ```bash
  git add src/assets/css src/tools/test-tool/index.html
  git commit -m "feat: implement main.css design system and styling tokens"
  ```

---

### Task 3: Common Utilities SDK & Dark Mode script

**Files:**
- Create: `src/assets/js/utils.js`

- [ ] **Step 1: Write shared JS utilities**

  Write helpers for dark-mode toggle, custom notifications/toasts rendering, and simplified Drag-and-Drop file processing wrappers that tools can import directly.
  
  ```javascript
  // Jukebox Common SDK Utilities

  // 1. Unified Theme Management
  export function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    return savedTheme;
  }

  export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
    return target;
  }

  // 2. Drag & Drop Visual Handler Wrapper
  export function setupDragDrop(zoneElement, onFilesLoaded) {
    ['dragenter', 'dragover'].forEach(eventName => {
      zoneElement.addEventListener(eventName, (e) => {
        e.preventDefault();
        zoneElement.classList.add('drag-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      zoneElement.addEventListener(eventName, (e) => {
        e.preventDefault();
        zoneElement.classList.remove('drag-active');
      }, false);
    });

    zoneElement.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        onFilesLoaded(files);
      }
    }, false);
  }

  // 3. Simple Beautiful Dynamic Toast Alerts
  export function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 9999;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const color = type === 'error' ? 'var(--accent-red)' : 'var(--accent-teal)';
    toast.style.cssText = `
      background-color: var(--bg-card);
      border-left: 4px solid ${color};
      color: var(--text-primary);
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: var(--shadow-main);
      font-size: 0.9rem;
      font-weight: 500;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    `;
    toast.textContent = message;
    container.appendChild(toast);

    // Trigger micro-animation
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);

    // Automatically remove after 3.5s
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
  ```

- [ ] **Step 2: Commit**

  Run:
  ```bash
  git add src/assets/js/utils.js
  git commit -m "feat: implement utils.js shared SDK helpers and theme engine"
  ```

---

### Task 4: Homepage Hub Dashboard

**Files:**
- Create: `src/index.html` (Replace basic)
- Create: `src/main.js`

- [ ] **Step 1: Write homepage HTML structure**

  Implement dashboard grid with navigation theme toggles, filtering chips, and dynamic search elements.
  
  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jukebox - Interactive Personal Toolbox</title>
    <link rel="stylesheet" href="./assets/css/main.css">
    <link rel="stylesheet" href="./assets/css/components.css">
    <style>
      .search-box {
        margin: 2rem auto;
        max-width: 600px;
        position: relative;
      }
      .search-input {
        width: 100%;
        padding: 1rem 1.5rem;
        background-color: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 30px;
        color: var(--text-primary);
        font-size: 1.1rem;
        outline: none;
        box-shadow: var(--shadow-main);
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .search-input:focus {
        border-color: var(--accent-blue);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      }
      .filter-chips {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: 2.5rem;
      }
      .chip {
        padding: 0.5rem 1.25rem;
        border: 1px solid var(--border-color);
        background-color: var(--bg-card);
        border-radius: 20px;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.2s;
      }
      .chip.active, .chip:hover {
        background-color: var(--accent-blue);
        border-color: var(--accent-blue);
        color: white;
      }
      .tools-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
      }
      .tool-category-badge {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--accent-teal);
        letter-spacing: 0.5px;
      }
      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 4rem 2rem;
        color: var(--text-secondary);
        font-size: 1.1rem;
      }
    </style>
  </head>
  <body class="container">
    <header class="header">
      <h1>Jukebox</h1>
      <button id="theme-toggle-btn" class="btn-icon" aria-label="Toggle Theme">🌓</button>
    </header>

    <div class="search-box">
      <input type="text" id="search-bar" class="search-input" placeholder="Search a tool, conversion, toy...">
    </div>

    <div id="filter-chips" class="filter-chips">
      <button class="chip active" data-category="All">All Tools</button>
      <button class="chip" data-category="Media">Media</button>
      <button class="chip" data-category="Utilities">Utilities</button>
      <button class="chip" data-category="Music">Music</button>
      <button class="chip" data-category="Toys">Toys</button>
    </div>

    <main id="tools-grid" class="tools-grid">
      <!-- Generated dynamically by main.js -->
    </main>

    <script type="module" src="./main.js"></script>
  </body>
  </html>
  ```

- [ ] **Step 2: Write homepage main.js**

  Load Dynamic Registry from `src/assets/js/manifest.json`. Build instant fuzzy query filter, active category chips listeners, and light/dark theme switches.
  
  ```javascript
  import { initTheme, toggleTheme } from './assets/js/utils.js';
  import toolsRegistry from './assets/js/manifest.json';

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme Setup
    initTheme();
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => toggleTheme());
    }

    const searchBar = document.getElementById('search-bar');
    const toolsGrid = document.getElementById('tools-grid');
    const chipsContainer = document.getElementById('filter-chips');
    const chips = chipsContainer.querySelectorAll('.chip');
    
    let currentCategory = 'All';
    let searchQuery = '';

    // 2. Render Cards Loop
    function renderTools() {
      toolsGrid.innerHTML = '';
      
      const filtered = toolsRegistry.filter(tool => {
        const matchesCategory = currentCategory === 'All' || tool.category === currentCategory;
        const matchesSearch = 
          tool.name.toLowerCase().includes(searchQuery) ||
          tool.description.toLowerCase().includes(searchQuery) ||
          tool.tags.some(tag => tag.toLowerCase().includes(searchQuery));
        return matchesCategory && matchesSearch;
      });

      if (filtered.length === 0) {
        toolsGrid.innerHTML = `
          <div class="empty-state">
            <p>No tools matched your query.</p>
          </div>
        `;
        return;
      }

      filtered.forEach(tool => {
        const card = document.createElement('a');
        card.className = 'card';
        card.href = `./tools/${tool.id}/index.html`;

        card.innerHTML = `
          <div class="tool-category-badge">${tool.category}</div>
          <h2>${tool.name}</h2>
          <p>${tool.description}</p>
        `;
        toolsGrid.appendChild(card);
      });
    }

    // 3. Bind Search Listener
    if (searchBar) {
      searchBar.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderTools();
      });
    }

    // 4. Bind Category Filtering Chips
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentCategory = chip.dataset.category;
        renderTools();
      });
    });

    // 5. Initial Draw
    renderTools();
  });
  ```

- [ ] **Step 3: Test routing locally**

  Verify card selection dynamically route locally.
  
  Run: `npx vite build`
  Expected: Success. Running `npm run preview` launches site and lets you click the test-tool card correctly.

- [ ] **Step 4: Commit**

  Run:
  ```bash
  git add src/index.html src/main.js
  git commit -m "feat: complete interactive homepage hub with search and chips filtering"
  ```

---

### Task 5: Tool implementation: On-browser Image Compressor

**Files:**
- Create: `src/tools/image-compressor/meta.json`
- Create: `src/tools/image-compressor/index.html`
- Create: `src/tools/image-compressor/style.css`
- Create: `src/tools/image-compressor/main.js`

- [ ] **Step 1: Write meta.json**

  ```json
  {
    "name": "Image Compressor",
    "description": "Adjustable on-browser image optimizer. Reduces JPEGs/PNGs entirely client-side.",
    "category": "Media",
    "icon": "compress",
    "tags": ["image", "compress", "png", "jpeg", "optimize"],
    "author": "Numair",
    "version": "1.0.0"
  }
  ```

- [ ] **Step 2: Write index.html**

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Compressor - Jukebox</title>
    <link rel="stylesheet" href="../../assets/css/main.css">
    <link rel="stylesheet" href="../../assets/css/components.css">
    <link rel="stylesheet" href="./style.css">
  </head>
  <body class="container">
    <header class="header">
      <a href="/" class="btn-icon" style="text-decoration: none;" title="Back to Hub">←</a>
      <h1>Image Compressor</h1>
      <button id="theme-btn" class="btn-icon">🌓</button>
    </header>

    <main class="workspace-wrapper">
      <div id="drop-area" class="drop-area">
        <p>Drag and drop files here, or click to upload</p>
        <input type="file" id="file-selector" accept="image/png, image/jpeg" style="display: none;">
      </div>

      <div id="preview-panel" class="preview-panel" style="display: none;">
        <div class="control-box">
          <label for="quality-slider">Compression Quality: <span id="quality-display">80%</span></label>
          <input type="range" id="quality-slider" min="10" max="100" value="80">
        </div>

        <div class="result-grid">
          <div class="result-card">
            <h4>Original</h4>
            <div class="image-wrapper"><img id="orig-img" src="" alt="Original image"></div>
            <p id="orig-info">Size: 0 KB</p>
          </div>
          <div class="result-card">
            <h4>Optimized</h4>
            <div class="image-wrapper"><img id="opt-img" src="" alt="Optimized image"></div>
            <p id="opt-info">Size: 0 KB (Saved: 0%)</p>
          </div>
        </div>

        <button id="download-btn" class="download-btn">Download Compressed Image</button>
      </div>
    </main>

    <script type="module" src="./main.js"></script>
  </body>
  </html>
  ```

- [ ] **Step 3: Write style.css**

  ```css
  .workspace-wrapper {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .drop-area {
    border: 2px dashed var(--border-color);
    border-radius: 12px;
    padding: 4rem 2rem;
    text-align: center;
    cursor: pointer;
    background-color: var(--bg-card);
    transition: border-color 0.2s, background-color 0.2s;
  }

  .drop-area.drag-active {
    border-color: var(--accent-teal);
    background-color: var(--bg-secondary);
  }

  .preview-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background-color: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .control-box {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-box input[type="range"] {
    width: 100%;
    accent-color: var(--accent-blue);
  }

  .result-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .result-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .result-card {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }

  .image-wrapper {
    max-height: 300px;
    overflow: hidden;
    margin: 1rem 0;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 4px;
    background-color: var(--bg-secondary);
  }

  .image-wrapper img {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
  }

  .download-btn {
    align-self: center;
    background-color: var(--accent-teal);
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 30px;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .download-btn:hover {
    opacity: 0.9;
  }
  ```

- [ ] **Step 4: Write main.js**

  Utilize standard `HTMLCanvasElement` to output optimized data-url bytes in secondary threads client-side.
  
  ```javascript
  import { initTheme, toggleTheme, setupDragDrop, showToast } from '../../assets/js/utils.js';

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    document.getElementById('theme-btn').addEventListener('click', toggleTheme);

    const dropArea = document.getElementById('drop-area');
    const fileSelector = document.getElementById('file-selector');
    const previewPanel = document.getElementById('preview-panel');
    const origImg = document.getElementById('orig-img');
    const optImg = document.getElementById('opt-img');
    const origInfo = document.getElementById('orig-info');
    const optInfo = document.getElementById('opt-info');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityDisplay = document.getElementById('quality-display');
    const downloadBtn = document.getElementById('download-btn');

    let currentFile = null;
    let originalImageEl = new Image();

    // Bind inputs click
    dropArea.addEventListener('click', () => fileSelector.click());
    fileSelector.addEventListener('change', (e) => {
      if (e.target.files.length > 0) processFile(e.target.files[0]);
    });

    // Install Drag-and-drop SDK helper
    setupDragDrop(dropArea, (files) => {
      if (files.length > 0) processFile(files[0]);
    });

    function processFile(file) {
      if (!file.type.match('image.*')) {
        showToast('Please select an image file (PNG/JPEG).', 'error');
        return;
      }
      currentFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        origImg.src = e.target.result;
        originalImageEl.src = e.target.result;
        origInfo.textContent = `Size: ${(file.size / 1024).toFixed(2)} KB`;
        
        originalImageEl.onload = () => {
          compressImage();
          dropArea.style.display = 'none';
          previewPanel.style.display = 'flex';
          showToast('Image uploaded successfully!');
        };
      };
      reader.readAsDataURL(file);
    }

    function compressImage() {
      if (!currentFile) return;
      const quality = qualitySlider.value / 100;
      qualityDisplay.textContent = `${qualitySlider.value}%`;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = originalImageEl.naturalWidth;
      canvas.height = originalImageEl.naturalHeight;
      ctx.drawImage(originalImageEl, 0, 0);

      // Force output compression type matching original MIME or fallback to jpeg
      const mime = currentFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const outputMime = currentFile.type === 'image/png' ? 'image/jpeg' : mime; // Convert png to jpeg for actual compression benefit
      
      const compressedDataUrl = canvas.toDataURL(outputMime, quality);
      optImg.src = compressedDataUrl;

      // Extract size
      const head = `data:${outputMime};base64,`;
      const sizeBytes = Math.round((compressedDataUrl.length - head.length)*3/4);
      const savedPercent = ((1 - (sizeBytes / currentFile.size)) * 100).toFixed(0);

      optInfo.textContent = `Size: ${(sizeBytes / 1024).toFixed(2)} KB (Saved: ${savedPercent}%)`;
    }

    qualitySlider.addEventListener('input', compressImage);

    downloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `compressed-${currentFile.name.replace(/\.[^/.]+$/, "")}.jpg`;
      link.href = optImg.src;
      link.click();
      showToast('Download started!');
    });
  });
  ```

- [ ] **Step 5: Verify build auto-registry outputs**

  Run Vite compilation to check if `image-compressor` builds cleanly.
  
  Run: `npx vite build`
  Expected: Success. Running build dynamically registers `src/tools/image-compressor` in entrypoints.

- [ ] **Step 6: Commit**

  Run:
  ```bash
  git add src/tools/image-compressor
  git commit -m "feat: implement on-browser Image Compressor tool"
  ```

---

### Task 6: Tool implementation: Unit Converter & Calculator

**Files:**
- Create: `src/tools/unit-converter/meta.json`
- Create: `src/tools/unit-converter/index.html`
- Create: `src/tools/unit-converter/style.css`
- Create: `src/tools/unit-converter/main.js`

- [ ] **Step 1: Write meta.json**

  ```json
  {
    "name": "Unit Converter & Calculator",
    "description": "Fast size, digital data, length, and temperature conversions instantly as you type.",
    "category": "Utilities",
    "icon": "calculator",
    "tags": ["unit", "convert", "calculator", "bytes", "metric"],
    "author": "Numair",
    "version": "1.0.0"
  }
  ```

- [ ] **Step 2: Write index.html**

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unit Converter - Jukebox</title>
    <link rel="stylesheet" href="../../assets/css/main.css">
    <link rel="stylesheet" href="../../assets/css/components.css">
    <link rel="stylesheet" href="./style.css">
  </head>
  <body class="container">
    <header class="header">
      <a href="/" class="btn-icon" style="text-decoration: none;" title="Back to Hub">←</a>
      <h1>Unit Converter & Calculator</h1>
      <button id="theme-btn" class="btn-icon">🌓</button>
    </header>

    <main class="converter-box">
      <div class="row">
        <label for="converter-type">Conversion Category</label>
        <select id="converter-type" class="select-input">
          <option value="data">Digital Data (Bytes / MB / GB)</option>
          <option value="length">Length (Metric / Imperial)</option>
          <option value="temperature">Temperature (C / F / K)</option>
        </select>
      </div>

      <div class="io-grid">
        <div class="io-card">
          <label for="input-value">From</label>
          <input type="number" id="input-value" value="1" class="num-input">
          <select id="input-unit" class="select-input"></select>
        </div>

        <div class="io-card">
          <label for="output-value">To</label>
          <input type="number" id="output-value" readonly class="num-input readonly-input">
          <select id="output-unit" class="select-input"></select>
        </div>
      </div>
    </main>

    <script type="module" src="./main.js"></script>
  </body>
  </html>
  ```

- [ ] **Step 3: Write style.css**

  ```css
  .converter-box {
    margin-top: 2rem;
    background-color: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 2rem;
    box-shadow: var(--shadow-main);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .select-input, .num-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    background-color: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .select-input:focus, .num-input:focus {
    border-color: var(--accent-blue);
  }

  .io-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .io-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .io-card {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .readonly-input {
    background-color: var(--bg-secondary);
    cursor: not-allowed;
  }
  ```

- [ ] **Step 4: Write main.js**

  ```javascript
  import { initTheme, toggleTheme } from '../../assets/js/utils.js';

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    document.getElementById('theme-btn').addEventListener('click', toggleTheme);

    const typeSelector = document.getElementById('converter-type');
    const inputVal = document.getElementById('input-value');
    const outputVal = document.getElementById('output-value');
    const inputUnit = document.getElementById('input-unit');
    const outputUnit = document.getElementById('output-unit');

    const units = {
      data: {
        'Bytes': 1,
        'Kilobytes (KB)': 1024,
        'Megabytes (MB)': 1024 * 1024,
        'Gigabytes (GB)': 1024 * 1024 * 1024
      },
      length: {
        'Millimeters (mm)': 0.001,
        'Meters (m)': 1,
        'Kilometers (km)': 1000,
        'Inches (in)': 0.0254,
        'Feet (ft)': 0.3048,
        'Miles (mi)': 1609.34
      },
      temperature: {
        'Celsius (°C)': 'C',
        'Fahrenheit (°F)': 'F',
        'Kelvin (K)': 'K'
      }
    };

    function populateUnits() {
      const type = typeSelector.value;
      inputUnit.innerHTML = '';
      outputUnit.innerHTML = '';

      Object.keys(units[type]).forEach((unitName, index) => {
        const opt1 = new Option(unitName, units[type][unitName]);
        const opt2 = new Option(unitName, units[type][unitName]);
        
        inputUnit.add(opt1);
        outputUnit.add(opt2);
        
        if (index === 0) opt1.selected = true;
        if (index === 1 || (index === 0 && Object.keys(units[type]).length === 1)) opt2.selected = true;
      });

      calculate();
    }

    function calculate() {
      const type = typeSelector.value;
      const val = parseFloat(inputVal.value);
      if (isNaN(val)) {
        outputVal.value = '';
        return;
      }

      if (type === 'temperature') {
        const from = inputUnit.value;
        const to = outputUnit.value;
        outputVal.value = convertTemperature(val, from, to).toFixed(2);
      } else {
        const fromFactor = parseFloat(inputUnit.value);
        const toFactor = parseFloat(outputUnit.value);
        const valueInBase = val * fromFactor;
        outputVal.value = (valueInBase / toFactor).toFixed(4);
      }
    }

    function convertTemperature(value, from, to) {
      if (from === to) return value;
      let celsius = value;

      // Convert to Celsius first
      if (from === 'F') celsius = (value - 32) * 5/9;
      if (from === 'K') celsius = value - 273.15;

      // Convert from Celsius to Target
      if (to === 'C') return celsius;
      if (to === 'F') return (celsius * 9/5) + 32;
      if (to === 'K') return celsius + 273.15;
    }

    // Attach listeners
    typeSelector.addEventListener('change', populateUnits);
    inputVal.addEventListener('input', calculate);
    inputUnit.addEventListener('change', calculate);
    outputUnit.addEventListener('change', calculate);

    // Bootstrap
    populateUnits();
  });
  ```

- [ ] **Step 5: Clean placeholder and perform final build check**

  Remove `src/tools/test-tool` directory so we launch strictly with our robust fully functional tools! Verify everything compiles elegantly.
  
  Run: `rm -rf src/tools/test-tool && npx vite build`
  Expected: Success. Running local build dynamically registers `image-compressor` and `unit-converter` without placeholder traces.

- [ ] **Step 6: Commit**

  Run:
  ```bash
  git add src/tools/unit-converter
  git commit -m "feat: implement Unit Converter & Calculator tool"
  ```

---

### Task 7: Clean-up & CI/CD Deployment Setup

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Setup GitHub Action workflow file**

  Write auto-deploy script to compile and publish code to GitHub Pages on every `main` branch push.
  
  ```yaml
  name: Deploy to GitHub Pages

  on:
    push:
      branches:
        - main

  permissions:
    contents: read
    pages: write
    id-token: write

  concurrency:
    group: 'pages'
    cancel-in-progress: true

  jobs:
    deploy:
      environment:
        name: github-pages
        url: ${{ steps.deployment.outputs.page_url }}
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Set up Node
          uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: 'npm'

        - name: Install dependencies
          run: npm install

        - name: Build
          run: npm run build

        - name: Setup Pages
          uses: actions/configure-pages@v4

        - name: Upload Artifact
          uses: actions/upload-pages-artifact@v3
          with:
            path: './dist'

        - name: Deploy to GitHub Pages
          id: deployment
          uses: actions/deploy-pages@v4
  ```

- [ ] **Step 2: Verify production build output files**

  Run a production build manually to confirm that Vite outputs a fully static bundle inside `/dist`.
  
  Run: `npm run build`
  Expected: Successful exit. Files inside `/dist` are clean static HTML/CSS/JS without compilation errors.

- [ ] **Step 3: Commit**

  Run:
  ```bash
  git add .github/workflows/deploy.yml
  git commit -m "ci: add github action workflow for pages automatic deploy"
  ```
