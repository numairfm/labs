import { initTheme, toggleTheme, showToast } from '../../assets/js/utils.js';
import qrcode from './qr-generator.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // DOM Elements
  const qrTextInput = document.getElementById('qr-text');
  const qrEccSelect = document.getElementById('qr-ecc');
  const qrStyleSelect = document.getElementById('qr-style');
  const qrMarginInput = document.getElementById('qr-margin');
  const marginValDisp = document.getElementById('margin-val');
  const qrScaleInput = document.getElementById('qr-scale');
  const scaleValDisp = document.getElementById('scale-val');
  const qrFgPicker = document.getElementById('qr-fg');
  const fgHexDisp = document.getElementById('fg-hex');
  const qrBgPicker = document.getElementById('qr-bg');
  const bgHexDisp = document.getElementById('bg-hex');
  
  const qrViewframe = document.getElementById('qr-viewframe');
  const btnDownload = document.getElementById('btn-download');
  const btnCopy = document.getElementById('btn-copy');

  let currentSvgString = '';

  // Finder pattern detection helper (7x7 corners)
  function isFinderPattern(r, c, moduleCount) {
    if (r < 7 && c < 7) return true; // Top-left
    if (r < 7 && c >= moduleCount - 7) return true; // Top-right
    if (r >= moduleCount - 7 && c < 7) return true; // Bottom-left
    return false;
  }

  // Compile and draw the QR code
  function generateQRCode() {
    const text = qrTextInput.value; // Get raw value including spacing
    const ecc = qrEccSelect.value;
    const style = qrStyleSelect.value;
    const margin = parseInt(qrMarginInput.value, 10);
    const scale = parseInt(qrScaleInput.value, 10);
    const fgColor = qrFgPicker.value;
    const bgColor = qrBgPicker.value;

    // Update hex labels
    fgHexDisp.textContent = fgColor.toUpperCase();
    bgHexDisp.textContent = bgColor.toUpperCase();

    // Update range labels
    marginValDisp.textContent = `${margin} block${margin === 1 ? '' : 's'}`;
    scaleValDisp.textContent = `${scale}px`;

    // Handle empty text fallback gracefully
    const textToEncode = text === '' ? 'https://jukebox.dev' : text;

    try {
      // 0 means auto-calculate version (typeNumber)
      const qr = qrcode(0, ecc);
      qr.addData(textToEncode);
      qr.make();

      const moduleCount = qr.getModuleCount();
      const gridSize = moduleCount + margin * 2;
      
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${gridSize} ${gridSize}" width="${scale}" height="${scale}" style="background-color: ${bgColor};">`;
      
      // Background path / rect
      svg += `<rect width="${gridSize}" height="${gridSize}" fill="${bgColor}" />`;
      
      let pathData = '';
      let finderPathData = '';
      let modulesHtml = '';
      
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (qr.isDark(r, c)) {
            const x = c + margin;
            const y = r + margin;
            
            if (isFinderPattern(r, c, moduleCount)) {
              // Keep finders bold and clean squares (with tiny overlap to prevent renderer subpixel gaps)
              finderPathData += `M${x},${y}h1.02v1.02h-1.02z `;
            } else {
              // Custom Styles for Data Modules
              if (style === 'rounded') {
                // Circle dots with high-fidelity render
                modulesHtml += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.4" fill="${fgColor}" />`;
              } else if (style === 'smooth') {
                // Connected rounded tiles
                modulesHtml += `<rect x="${x}" y="${y}" width="1.02" height="1.02" rx="0.32" ry="0.32" fill="${fgColor}" />`;
              } else {
                // Strict square with slight overlap to prevent renderer subpixel gaps
                pathData += `M${x},${y}h1.02v1.02h-1.02z `;
              }
            }
          }
        }
      }
      
      // Concat optimized paths to minimize DOM elements & file size
      if (pathData) {
        svg += `<path d="${pathData}" fill="${fgColor}" shape-rendering="crispEdges" />`;
      }
      if (finderPathData) {
        svg += `<path d="${finderPathData}" fill="${fgColor}" shape-rendering="crispEdges" />`;
      }
      if (modulesHtml) {
        svg += modulesHtml;
      }
      
      svg += `</svg>`;
      
      qrViewframe.innerHTML = svg;
      currentSvgString = svg;
      
      // Enable buttons
      btnDownload.disabled = false;
      btnCopy.disabled = false;
    } catch (error) {
      console.error('QR Compilation Error:', error);
      qrViewframe.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--accent-red); font-family: var(--font-sans); font-weight: 700; text-align: center; gap: 0.5rem; padding: 1rem;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter" style="margin-bottom: 0.5rem;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span style="font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">DATA OVERFLOW</span>
          <span style="font-size: 0.75rem; font-weight: 500; color: var(--text-secondary);">Reduce content size or select a lower ECC recovery tier.</span>
        </div>
      `;
      currentSvgString = '';
      btnDownload.disabled = true;
      btnCopy.disabled = true;
    }
  }

  // Download SVG file handler
  function triggerDownload() {
    if (!currentSvgString) {
      showToast('No valid QR Code vector generated yet!', 'error');
      return;
    }
    
    try {
      const blob = new Blob([currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Custom clean filename based on content prefix
      const cleanInput = qrTextInput.value.trim() || 'jukebox_qr';
      const cleanName = cleanInput
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
        .substring(0, 20);
      
      link.download = `qr_${cleanName || 'code'}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Vector QR Code downloaded successfully!');
    } catch (e) {
      showToast('Failed to export vector file.', 'error');
    }
  }

  // Copy SVG to clipboard handler
  async function triggerCopy() {
    if (!currentSvgString) {
      showToast('No valid QR Code vector to copy!', 'error');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(currentSvgString);
      showToast('SVG XML copied to clipboard!');
    } catch (err) {
      showToast('Failed to copy to clipboard.', 'error');
    }
  }

  // Attach event bindings
  qrTextInput.addEventListener('input', generateQRCode);
  qrEccSelect.addEventListener('change', generateQRCode);
  qrStyleSelect.addEventListener('change', generateQRCode);
  qrMarginInput.addEventListener('input', generateQRCode);
  qrScaleInput.addEventListener('input', generateQRCode);
  
  // Color Picker live updates
  qrFgPicker.addEventListener('input', generateQRCode);
  qrBgPicker.addEventListener('input', generateQRCode);

  // Click actions
  btnDownload.addEventListener('click', triggerDownload);
  btnCopy.addEventListener('click', triggerCopy);

  // Initial compile
  generateQRCode();
});
