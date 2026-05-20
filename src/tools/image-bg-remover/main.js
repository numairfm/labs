// Image Background Remover - JUKEBOX
// Fully responsive, touch-compatible, with AI Auto mode and local Retro Magic Erasers

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const themeBtn = document.getElementById('theme-btn');
  const btnUpload = document.getElementById('btn-upload');
  const fileInput = document.getElementById('file-input');
  const dropZone = document.getElementById('drop-zone');
  const uploadPrompt = document.getElementById('upload-prompt');
  const canvasStack = document.querySelector('.canvas-stack');
  const canvas = document.getElementById('editor-canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Controls
  const modeAI = document.getElementById('mode-ai');
  const modeManual = document.getElementById('mode-manual');
  const aiControls = document.getElementById('ai-controls');
  const manualControls = document.getElementById('manual-controls');
  const btnRemoveAI = document.getElementById('btn-remove-ai');
  
  const toleranceRange = document.getElementById('tolerance-range');
  const toleranceVal = document.getElementById('tolerance-val');
  const toolPicker = document.getElementById('tool-picker');
  const toolBrush = document.getElementById('tool-brush');
  const brushSizeItem = document.getElementById('brush-size-item');
  const brushRange = document.getElementById('brush-range');
  const brushVal = document.getElementById('brush-val');
  
  const btnUndo = document.getElementById('btn-undo');
  const btnReset = document.getElementById('btn-reset');
  const btnDownload = document.getElementById('btn-download');
  
  const aiLoading = document.getElementById('ai-loading');
  const aiLoadingText = document.getElementById('ai-loading-text');
  const retroProgressFill = document.getElementById('retro-progress-fill');

  // App State
  let originalImage = null; // Image object
  let history = []; // Array of ImageData
  let activeMode = 'ai'; // 'ai' or 'manual'
  let activeTool = 'picker'; // 'picker' or 'brush'
  let isDrawing = false;
  let lastPointerPos = { x: 0, y: 0 };
  let removeBackgroundFn = null;

  // Init Theme
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  }
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Sync Slider values
  toleranceRange.addEventListener('input', (e) => {
    toleranceVal.textContent = e.target.value;
  });
  brushRange.addEventListener('input', (e) => {
    brushVal.textContent = e.target.value;
  });

  // Switch Modes
  modeAI.addEventListener('click', () => {
    modeAI.classList.add('active');
    modeManual.classList.remove('active');
    aiControls.style.display = 'flex';
    manualControls.style.display = 'none';
    activeMode = 'ai';
  });

  modeManual.addEventListener('click', () => {
    modeManual.classList.add('active');
    modeAI.classList.remove('active');
    aiControls.style.display = 'none';
    manualControls.style.display = 'flex';
    activeMode = 'manual';
  });

  // Switch Manual Tools
  toolPicker.addEventListener('click', () => {
    toolPicker.classList.add('active');
    toolBrush.classList.remove('active');
    brushSizeItem.style.display = 'none';
    activeTool = 'picker';
  });

  toolBrush.addEventListener('click', () => {
    toolBrush.classList.add('active');
    toolPicker.classList.remove('active');
    brushSizeItem.style.display = 'flex';
    activeTool = 'brush';
  });

  // History Management
  function saveState() {
    try {
      const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
      history.push(state);
      if (history.length > 15) history.shift(); // Limit history stack
      btnUndo.classList.remove('disabled');
    } catch (e) {
      console.error("Could not save undo state", e);
    }
  }

  btnUndo.addEventListener('click', () => {
    if (history.length > 1) {
      history.pop(); // Remove current state
      const prevState = history[history.length - 1];
      ctx.putImageData(prevState, 0, 0);
      if (history.length <= 1) {
        btnUndo.classList.add('disabled');
      }
    }
  });

  btnReset.addEventListener('click', () => {
    if (!originalImage) return;
    history = [];
    btnUndo.classList.add('disabled');
    
    // Reset canvas to original image dimensions
    canvas.width = originalImage.naturalWidth;
    canvas.height = originalImage.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0);
    saveState();
  });

  // Load and Render Uploaded Image
  function loadImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        originalImage = img;
        
        // Setup canvas size
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Show stack, hide prompt
        uploadPrompt.style.display = 'none';
        canvasStack.style.display = 'inline-block';
        
        // Reset states & enable controls
        history = [];
        saveState();
        
        btnRemoveAI.classList.remove('disabled');
        btnReset.classList.remove('disabled');
        btnDownload.classList.remove('disabled');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // File Upload Handlers
  btnUpload.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));

  // Drag and Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      loadImage(e.dataTransfer.files[0]);
    }
  });

  // Click & Drag Canvas logic (Magic Color Eraser & Brush)
  function getCanvasPointerCoords(e) {
    const rect = canvas.getBoundingClientRect();
    // Account for canvas CSS scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY)
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!originalImage) return;
    if (e.pointerType === 'touch') return; // Handled by touch events
    canvas.setPointerCapture(e.pointerId);
    
    const pos = getCanvasPointerCoords(e);
    
    if (activeMode === 'manual') {
      if (activeTool === 'picker') {
        // Chroma Key Eraser
        eraseColorAt(pos.x, pos.y);
      } else if (activeTool === 'brush') {
        isDrawing = true;
        lastPointerPos = pos;
        eraseBrushAt(pos.x, pos.y, true);
      }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return; // Handled by touch events
    if (!isDrawing || activeMode !== 'manual' || activeTool !== 'brush') return;
    const pos = getCanvasPointerCoords(e);
    
    // Draw brush line between last pos and current pos
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = parseInt(brushRange.value, 10);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastPointerPos.x, lastPointerPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();
    
    lastPointerPos = pos;
  });

  const stopDrawing = (e) => {
    if (e.pointerType === 'touch') return; // Handled by touch events
    if (isDrawing) {
      isDrawing = false;
      saveState();
    }
  };

  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointercancel', stopDrawing);

  // Native touch event listeners (specifically optimized for mobile gesture locks)
  canvas.addEventListener('touchstart', (e) => {
    if (!originalImage) return;
    if (activeMode === 'manual') {
      e.preventDefault(); // Stop mobile zooming/panning
      const pos = getCanvasPointerCoords(e);
      if (activeTool === 'picker') {
        eraseColorAt(pos.x, pos.y);
      } else if (activeTool === 'brush') {
        isDrawing = true;
        lastPointerPos = pos;
        eraseBrushAt(pos.x, pos.y, true);
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!originalImage) return;
    if (activeMode === 'manual' && isDrawing && activeTool === 'brush') {
      e.preventDefault(); // Stop mobile scrolling during brush drag
      const pos = getCanvasPointerCoords(e);
      
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = parseInt(brushRange.value, 10);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(lastPointerPos.x, lastPointerPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
      
      lastPointerPos = pos;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (isDrawing) {
      e.preventDefault();
      isDrawing = false;
      saveState();
    }
  }, { passive: false });

  canvas.addEventListener('touchcancel', (e) => {
    if (isDrawing) {
      isDrawing = false;
      saveState();
    }
  }, { passive: false });

  function eraseBrushAt(x, y, start = false) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.arc(x, y, parseInt(brushRange.value, 10) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Retro Magic Color Eraser (Chroma Key Algorithm)
  function eraseColorAt(startX, startY) {
    if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) return;
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    // Get target RGB color
    const targetIdx = (startY * canvas.width + startX) * 4;
    const targetR = data[targetIdx];
    const targetG = data[targetIdx + 1];
    const targetB = data[targetIdx + 2];
    const targetA = data[targetIdx + 3];
    
    if (targetA === 0) return; // Already transparent
    
    const tolerance = parseInt(toleranceRange.value, 10);
    // Euclidean distance threshold in RGB space
    const threshold = tolerance * 4.4; // Scale 1-100 tolerance dynamically
    
    // Localized flood scan vs global keying. Let's do global keying since it removes the background globally.
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a === 0) continue;
      
      // Calculate color distance
      const dist = Math.sqrt(
        Math.pow(r - targetR, 2) +
        Math.pow(g - targetG, 2) +
        Math.pow(b - targetB, 2)
      );
      
      if (dist <= threshold) {
        data[i + 3] = 0; // Make pixel completely transparent
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
    saveState();
  }

  // AI Auto Background Remover implementation
  btnRemoveAI.addEventListener('click', async () => {
    if (!originalImage || btnRemoveAI.classList.contains('disabled')) return;
    
    aiLoading.style.display = 'flex';
    aiLoadingText.textContent = 'Initializing AI engine...';
    retroProgressFill.style.style = 'width: 15%';
    
    try {
      // 1. Dynamic script imports
      aiLoadingText.textContent = 'Downloading AI models (40MB - Cached after first run)...';
      
      // We dynamically load the imgly background removal bundle
      // We will load v2.0.1 which is stable and client-side webgpu/webgl accelerated.
      if (!removeBackgroundFn) {
        retroProgressFill.style.width = '30%';
        const module = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@2.0.1/dist/bundle.esm.js');
        removeBackgroundFn = module.removeBackground;
        retroProgressFill.style.width = '60%';
      }
      
      aiLoadingText.textContent = 'Running neural segmentation model locally...';
      retroProgressFill.style.width = '80%';
      
      // Get current image canvas blob
      canvas.toBlob(async (blob) => {
        try {
          const resultBlob = await removeBackgroundFn(blob, {
            progress: (handle, current, total) => {
              const pct = Math.round((current / total) * 100);
              aiLoadingText.textContent = `Processing: ${handle} (${pct}%)`;
              retroProgressFill.style.width = `${pct}%`;
            },
            model: 'medium', // Use balanced model
            device: 'auto'
          });
          
          const resultUrl = URL.createObjectURL(resultBlob);
          const resultImg = new Image();
          resultImg.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(resultImg, 0, 0);
            saveState();
            
            aiLoading.style.display = 'none';
            URL.revokeObjectURL(resultUrl);
          };
          resultImg.src = resultUrl;
        } catch (err) {
          console.error("AI execution error", err);
          fallbackToManual(err.message || err);
        }
      }, 'image/png');
      
    } catch (err) {
      console.error("Failed to load AI background removal library", err);
      fallbackToManual(err.message || err);
    }
  });

  function fallbackToManual(errMsg) {
    aiLoading.style.display = 'none';
    alert(`AI auto removal encountered a loading issue (CORS, offline or browser compatibility).\n\nDetails: ${errMsg}\n\nFalling back to completely local Retro Magic Color Eraser! Perfect for solid backgrounds.`);
    // Switch to manual mode
    modeManual.click();
  }

  // Download Transparent PNG
  btnDownload.addEventListener('click', () => {
    if (!originalImage || btnDownload.classList.contains('disabled')) return;
    
    const link = document.createElement('a');
    link.download = 'no-bg_' + (fileInput.files[0] ? fileInput.files[0].name.replace(/\.[^/.]+$/, "") : 'image') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
});
