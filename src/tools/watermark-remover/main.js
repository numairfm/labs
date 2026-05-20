import { initTheme, toggleTheme } from '../../assets/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const dropZone = document.getElementById('drop-zone');
  const uploadPrompt = document.getElementById('upload-prompt');
  const canvasStack = document.querySelector('.canvas-stack');
  const imgCanvas = document.getElementById('image-canvas');
  const maskCanvas = document.getElementById('mask-canvas');
  
  const imgCtx = imgCanvas.getContext('2d', { willReadFrequently: true });
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

  const btnUpload = document.getElementById('btn-upload');
  const fileInput = document.getElementById('file-input');
  const btnGemini = document.getElementById('btn-gemini');
  const btnClear = document.getElementById('btn-clear');
  const btnHeal = document.getElementById('btn-heal');
  const btnDownload = document.getElementById('btn-download');
  const brushSizeSlider = document.getElementById('brush-size');

  let currentImage = null;
  let isDrawing = false;
  let hasMask = false;

  // --- UI & FILE LOADING ---
  
  btnUpload.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      loadImage(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadImage(e.dataTransfer.files[0]);
    }
  });

  function loadImage(file) {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        currentImage = img;
        
        // Setup canvases sizes based on intrinsic vs container bounds
        const containerWidth = dropZone.clientWidth - 40;
        const containerHeight = dropZone.clientHeight - 40;
        
        let width = img.width;
        let height = img.height;
        
        if (width > containerWidth || height > containerHeight) {
          const ratio = Math.min(containerWidth / width, containerHeight / height);
          width *= ratio;
          height *= ratio;
        }

        imgCanvas.width = width;
        imgCanvas.height = height;
        maskCanvas.width = width;
        maskCanvas.height = height;

        canvasStack.style.width = `${width}px`;
        canvasStack.style.height = `${height}px`;

        imgCtx.drawImage(img, 0, 0, width, height);
        
        uploadPrompt.style.display = 'none';
        canvasStack.style.display = 'block';
        dropZone.style.border = 'none';
        
        clearMask();
        btnDownload.classList.remove('disabled');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // --- DRAWING MASK ---

  function updateCursor() {
    const size = parseInt(brushSizeSlider.value);
    // Create a circular cursor via a tiny inline SVG data URI
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="rgba(239, 68, 68, 0.4)" stroke="red" stroke-width="1"/></svg>`;
    const url = `url(data:image/svg+xml;base64,${btoa(svg)}) ${size/2} ${size/2}, crosshair`;
    maskCanvas.style.cursor = url;
  }

  brushSizeSlider.addEventListener('input', updateCursor);
  updateCursor();

  maskCanvas.addEventListener('pointerdown', (e) => {
    isDrawing = true;
    drawMaskPoint(e);
  });

  maskCanvas.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    drawMaskPoint(e);
  });

  window.addEventListener('pointerup', () => {
    if (isDrawing) {
      isDrawing = false;
      checkMaskPresence();
    }
  });

  function drawMaskPoint(e) {
    const rect = maskCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const radius = parseInt(brushSizeSlider.value) / 2;

    maskCtx.fillStyle = 'rgba(255, 0, 0, 1)'; // Solid red internally to easily threshold later, but display with opacity
    maskCtx.beginPath();
    maskCtx.arc(x, y, radius, 0, Math.PI * 2);
    maskCtx.fill();
    hasMask = true;
  }

  function clearMask() {
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    hasMask = false;
    checkMaskPresence();
  }

  function checkMaskPresence() {
    if (hasMask) {
      btnHeal.classList.remove('disabled');
      maskCanvas.style.opacity = '0.5'; // Display visual opacity
    } else {
      btnHeal.classList.add('disabled');
    }
  }

  btnClear.addEventListener('click', clearMask);

  // --- PRESETS & ALGORITHM ---
  
  btnGemini.addEventListener('click', () => {
    if (!currentImage) return;
    // Gemini watermark is usually bottom right
    const w = maskCanvas.width;
    const h = maskCanvas.height;
    const zoneW = w * 0.15;
    const zoneH = h * 0.08;
    
    maskCtx.fillStyle = 'rgba(255, 0, 0, 1)';
    maskCtx.fillRect(w - zoneW - 10, h - zoneH - 10, zoneW, zoneH);
    hasMask = true;
    checkMaskPresence();
  });

  btnDownload.addEventListener('click', () => {
    if (btnDownload.classList.contains('disabled')) return;
    const link = document.createElement('a');
    link.download = 'watermark-removed.png';
    link.href = imgCanvas.toDataURL('image/png');
    link.click();
  });

  btnHeal.addEventListener('click', () => {
    if (btnHeal.classList.contains('disabled')) return;
    healWatermark();
  });

  // Fast-Marching Pixel Neighborhood Diffusion
  function healWatermark() {
    btnHeal.classList.add('disabled');
    btnHeal.textContent = 'Healing...';
    
    // We do this in a setTimeout to allow the UI to update the button text
    setTimeout(() => {
      const w = imgCanvas.width;
      const h = imgCanvas.height;
      const imgData = imgCtx.getImageData(0, 0, w, h);
      const maskData = maskCtx.getImageData(0, 0, w, h);
      
      const pixels = imgData.data;
      const maskPixels = maskData.data;

      // 1. Identify all masked pixels (where red channel > 128)
      // We will track the state in a typed array: 0 = unmasked, 1 = masked
      const state = new Uint8Array(w * h);
      let maskedCount = 0;
      for (let i = 0; i < w * h; i++) {
        if (maskPixels[i * 4] > 128) {
          state[i] = 1;
          maskedCount++;
        }
      }

      // 2. Diffuse inward iteratively
      const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]];
      
      // Safety limit to avoid infinite loops
      let iter = 0;
      const maxIter = 500; 

      while (maskedCount > 0 && iter < maxIter) {
        const boundaryPixels = [];

        // Find boundary pixels
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (state[idx] === 1) {
              // Check if it touches an unmasked pixel
              let hasUnmaskedNeighbor = false;
              for (let n of neighbors) {
                const nx = x + n[0];
                const ny = y + n[1];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                  if (state[ny * w + nx] === 0) {
                    hasUnmaskedNeighbor = true;
                    break;
                  }
                }
              }
              if (hasUnmaskedNeighbor) {
                boundaryPixels.push({ x, y, idx });
              }
            }
          }
        }

        if (boundaryPixels.length === 0) break; // Should not happen unless mask covers whole image and no unmasked pixels exist

        // Calculate averages for boundaries
        const newColors = new Map();
        for (let bp of boundaryPixels) {
          let r = 0, g = 0, b = 0, count = 0;
          for (let n of neighbors) {
            const nx = bp.x + n[0];
            const ny = bp.y + n[1];
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nIdx = ny * w + nx;
              if (state[nIdx] === 0) {
                const pxIdx = nIdx * 4;
                r += pixels[pxIdx];
                g += pixels[pxIdx + 1];
                b += pixels[pxIdx + 2];
                count++;
              }
            }
          }
          if (count > 0) {
            newColors.set(bp.idx, [r / count, g / count, b / count]);
          }
        }

        // Apply new colors
        for (let bp of boundaryPixels) {
          const color = newColors.get(bp.idx);
          if (color) {
            const pxIdx = bp.idx * 4;
            pixels[pxIdx] = color[0];
            pixels[pxIdx + 1] = color[1];
            pixels[pxIdx + 2] = color[2];
            // alpha remains same
            
            // Mark as unmasked
            state[bp.idx] = 0;
            maskedCount--;
          }
        }

        iter++;
      }

      // Put image data back
      imgCtx.putImageData(imgData, 0, 0);
      
      // Clear mask
      clearMask();
      btnHeal.textContent = 'Heal Selection';
    }, 50);
  }
});
