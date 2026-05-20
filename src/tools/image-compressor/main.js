import { initTheme, toggleTheme, setupDragDrop, showToast } from '../../assets/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }

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

  // Bind input elements
  if (dropArea && fileSelector) {
    dropArea.addEventListener('click', () => fileSelector.click());
    fileSelector.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processFile(e.target.files[0]);
      }
    });

    // Install Drag-and-drop SDK helper
    setupDragDrop(dropArea, (files) => {
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    });
  }

  function processFile(file) {
    if (!file.type.match('image.*')) {
      showToast('Please select an image file (PNG/JPEG).', 'error');
      return;
    }
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (origImg) origImg.src = e.target.result;
      originalImageEl.src = e.target.result;
      if (origInfo) origInfo.textContent = `Size: ${(file.size / 1024).toFixed(2)} KB`;
      
      originalImageEl.onload = () => {
        compressImage();
        if (dropArea) dropArea.style.display = 'none';
        if (previewPanel) previewPanel.style.display = 'flex';
        showToast('Image uploaded successfully!');
      };
    };
    reader.readAsDataURL(file);
  }

  function compressImage() {
    if (!currentFile || !qualitySlider || !qualityDisplay || !optImg || !optInfo) return;
    
    const quality = qualitySlider.value / 100;
    qualityDisplay.textContent = `${qualitySlider.value}%`;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = originalImageEl.naturalWidth;
    canvas.height = originalImageEl.naturalHeight;
    
    // Draw the image on the canvas
    ctx.drawImage(originalImageEl, 0, 0);

    // Convert PNG to JPEG for actual compression benefit
    const outputMime = 'image/jpeg';
    
    try {
      const compressedDataUrl = canvas.toDataURL(outputMime, quality);
      optImg.src = compressedDataUrl;

      // Extract size in bytes from base64 string
      const head = `data:${outputMime};base64,`;
      const sizeBytes = Math.round((compressedDataUrl.length - head.length) * 3 / 4);
      const savedPercent = ((1 - (sizeBytes / currentFile.size)) * 100).toFixed(0);

      optInfo.textContent = `Size: ${(sizeBytes / 1024).toFixed(2)} KB (Saved: ${savedPercent}%)`;
    } catch (e) {
      console.error('Compression failed:', e);
      showToast('Compression failed. Please try a different image.', 'error');
    }
  }

  if (qualitySlider) {
    qualitySlider.addEventListener('input', compressImage);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!currentFile || !optImg) return;
      const link = document.createElement('a');
      link.download = `compressed-${currentFile.name.replace(/\.[^/.]+$/, "")}.jpg`;
      link.href = optImg.src;
      link.click();
      showToast('Download started!');
    });
  }
});
