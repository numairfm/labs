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
