import { initTheme, toggleTheme } from '../../assets/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const dropZone = document.getElementById('drop-zone');
  const uploadPrompt = document.getElementById('upload-prompt');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  const outputCanvas = document.getElementById('output-canvas');
  const sourceVideo = document.getElementById('source-video');
  
  const ctx = outputCanvas.getContext('2d');

  const btnUpload = document.getElementById('btn-upload');
  const fileInput = document.getElementById('file-input');
  const scaleSelect = document.getElementById('scale-select');
  const bitrateSlider = document.getElementById('bitrate-slider');
  const bitrateVal = document.getElementById('bitrate-val');
  const includeAudio = document.getElementById('include-audio');
  const btnCompress = document.getElementById('btn-compress');
  
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');

  let currentFile = null;
  let isCompressing = false;
  let animationFrameId = null;

  // Format bitrate display
  bitrateSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    bitrateVal.textContent = (val / 1000000).toFixed(1) + 'M';
  });

  // --- FILE HANDLING ---
  
  btnUpload.addEventListener('click', () => {
    if (!isCompressing) fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      loadVideo(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!isCompressing) dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (!isCompressing && e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadVideo(e.dataTransfer.files[0]);
    }
  });

  function loadVideo(file) {
    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid video file.');
      return;
    }
    
    currentFile = file;
    const url = URL.createObjectURL(file);
    
    sourceVideo.src = url;
    sourceVideo.onloadedmetadata = () => {
      uploadPrompt.style.display = 'none';
      canvasWrapper.style.display = 'flex';
      dropZone.style.border = 'none';
      
      // Draw first frame
      sourceVideo.currentTime = 0;
      updateCanvasScale();
      
      btnCompress.classList.remove('disabled');
    };

    sourceVideo.onseeked = () => {
      if (!isCompressing) {
        ctx.drawImage(sourceVideo, 0, 0, outputCanvas.width, outputCanvas.height);
      }
    };
  }

  function updateCanvasScale() {
    const scale = parseFloat(scaleSelect.value);
    const targetW = Math.floor(sourceVideo.videoWidth * scale);
    const targetH = Math.floor(sourceVideo.videoHeight * scale);
    
    outputCanvas.width = targetW;
    outputCanvas.height = targetH;
    
    if (!isCompressing) {
      ctx.drawImage(sourceVideo, 0, 0, targetW, targetH);
    }
  }

  scaleSelect.addEventListener('change', () => {
    if (sourceVideo.src) {
      updateCanvasScale();
    }
  });

  // --- COMPRESSION ENGINE ---

  btnCompress.addEventListener('click', async () => {
    if (btnCompress.classList.contains('disabled') || !currentFile) return;
    startCompression();
  });

  async function startCompression() {
    isCompressing = true;
    btnCompress.classList.add('disabled');
    btnCompress.textContent = 'COMPRESSING...';
    btnUpload.classList.add('disabled');
    
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';

    updateCanvasScale();
    
    // 1. Setup Canvas Stream (30 FPS)
    const canvasStream = outputCanvas.captureStream(30);
    
    // 2. Setup Audio Routing if requested
    const finalStream = new MediaStream();
    canvasStream.getVideoTracks().forEach(track => finalStream.addTrack(track));

    let audioCtx;
    if (includeAudio.checked) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const sourceNode = audioCtx.createMediaElementSource(sourceVideo);
        const destNode = audioCtx.createMediaStreamDestination();
        
        // Connect to destination (for recording)
        sourceNode.connect(destNode);
        // Also connect to destination (for playback volume, though we mute it)
        sourceNode.connect(audioCtx.destination);
        
        destNode.stream.getAudioTracks().forEach(track => finalStream.addTrack(track));
      } catch (e) {
        console.warn("Could not setup audio context routing", e);
      }
    }

    // 3. Setup MediaRecorder
    const targetBitrate = parseInt(bitrateSlider.value);
    
    // Try codecs, prefer webm/vp9 or mp4/h264
    let options = { videoBitsPerSecond: targetBitrate };
    if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
      options.mimeType = 'video/webm; codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/mp4; codecs=avc1')) {
      options.mimeType = 'video/mp4; codecs=avc1';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      options.mimeType = 'video/webm';
    }

    const recorder = new MediaRecorder(finalStream, options);
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      cancelAnimationFrame(animationFrameId);
      
      const blob = new Blob(chunks, { type: options.mimeType || 'video/webm' });
      const ext = (options.mimeType && options.mimeType.includes('mp4')) ? 'mp4' : 'webm';
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed-video.${ext}`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      // Reset UI
      isCompressing = false;
      btnCompress.classList.remove('disabled');
      btnCompress.textContent = 'START COMPRESSION';
      btnUpload.classList.remove('disabled');
      
      progressFill.style.width = '100%';
      progressPercent.textContent = '100%';
      setTimeout(() => {
        if (!isCompressing) progressContainer.style.display = 'none';
      }, 2000);
      
      // Cleanup Audio
      if (audioCtx) {
        audioCtx.close();
      }
    };

    // 4. Playback and Frame Rendering Loop
    sourceVideo.volume = 0; // Mute actual playback
    sourceVideo.currentTime = 0;
    
    // Setup progress tracking based on timeupdate
    const duration = sourceVideo.duration;
    
    const onTimeUpdate = () => {
      if (!isCompressing) return;
      const pct = Math.min(100, Math.round((sourceVideo.currentTime / duration) * 100));
      progressFill.style.width = `${pct}%`;
      progressPercent.textContent = `${pct}%`;
    };
    sourceVideo.addEventListener('timeupdate', onTimeUpdate);

    const onEnded = () => {
      sourceVideo.removeEventListener('timeupdate', onTimeUpdate);
      sourceVideo.removeEventListener('ended', onEnded);
      recorder.stop();
    };
    sourceVideo.addEventListener('ended', onEnded);

    function renderLoop() {
      if (!isCompressing) return;
      ctx.drawImage(sourceVideo, 0, 0, outputCanvas.width, outputCanvas.height);
      animationFrameId = requestAnimationFrame(renderLoop);
    }

    // Start everything
    recorder.start();
    sourceVideo.play().then(() => {
      renderLoop();
    }).catch(err => {
      console.error("Playback failed", err);
      recorder.stop();
    });
  }
});
