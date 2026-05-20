import { defineConfig } from 'vite';
import { resolve, join } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

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
              if (!meta.name) {
                console.warn(`[Jukebox Registry] Skipping ${folder}: 'name' is required in meta.json`);
                return;
              }
              toolsManifest.push({
                id: folder,
                name: meta.name,
                description: meta.description || '',
                category: meta.category || 'Utilities',
                icon: meta.icon || '',
                tags: Array.isArray(meta.tags) ? meta.tags : [],
                author: meta.author || 'Anonymous',
                version: meta.version || '1.0.0'
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

      const manifestPath = join(assetsJsDir, 'manifest.json');
      const manifestContent = JSON.stringify(toolsManifest, null, 2);
      let existingContent = '';
      if (fs.existsSync(manifestPath)) {
        existingContent = fs.readFileSync(manifestPath, 'utf8');
      }

      if (existingContent !== manifestContent) {
        fs.writeFileSync(manifestPath, manifestContent);
        console.log(`[Jukebox Registry] Registered ${toolsManifest.length} tools dynamically.`);
      } else {
        console.log(`[Jukebox Registry] Manifest unchanged (${toolsManifest.length} tools). Skipping file write.`);
      }
    }
  };
}

export default defineConfig({
  base: '/labs/',
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
      const folderPath = join(toolsDir, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        const indexPath = join(folderPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          entries[folder] = indexPath;
        }
      }
    });
  }

  return entries;
}
