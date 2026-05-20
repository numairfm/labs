import { initTheme, toggleTheme } from '../../assets/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Audio Context State
  let audioCtx = null;
  let masterGain = null;
  let isPlaying = false;

  // Sound source nodes
  let whiteSource = null;
  let pinkSource = null;
  let brownSource = null;
  let binauralOscL = null;
  let binauralOscR = null;

  // Sound gain nodes
  let gainWhite = null;
  let gainPink = null;
  let gainBrown = null;
  let gainBinaural = null;

  // DOM Elements
  const playBtn = document.getElementById('play-btn');
  const playText = document.getElementById('play-text');
  const playIcon = document.getElementById('play-icon');
  const masterVolSlider = document.getElementById('master-vol');
  const masterVolVal = document.getElementById('master-val');

  const volWhiteSlider = document.getElementById('vol-white');
  const valWhiteLabel = document.getElementById('white-val');
  const volPinkSlider = document.getElementById('vol-pink');
  const valPinkLabel = document.getElementById('pink-val');
  const volBrownSlider = document.getElementById('vol-brown');
  const valBrownLabel = document.getElementById('brown-val');
  const volBinauralSlider = document.getElementById('vol-binaural');
  const valBinauralLabel = document.getElementById('binaural-val');

  const presetButtons = document.querySelectorAll('.preset-btn');

  // Helper to sync label values
  function updateSliderDisplay(slider, label, isPercent = true) {
    const val = parseFloat(slider.value);
    label.textContent = isPercent ? `${Math.round(val * 100)}%` : `${val.toFixed(2)}`;
  }

  // Update volume labels from current slider positions
  function syncAllLabels() {
    updateSliderDisplay(masterVolSlider, masterVolVal);
    updateSliderDisplay(volWhiteSlider, valWhiteLabel);
    updateSliderDisplay(volPinkSlider, valPinkLabel);
    updateSliderDisplay(volBrownSlider, valBrownLabel);
    updateSliderDisplay(volBinauralSlider, valBinauralLabel);
  }

  syncAllLabels();

  // Input listeners for mixer
  masterVolSlider.addEventListener('input', () => {
    updateSliderDisplay(masterVolSlider, masterVolVal);
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(parseFloat(masterVolSlider.value), audioCtx.currentTime);
    }
  });

  volWhiteSlider.addEventListener('input', () => {
    updateSliderDisplay(volWhiteSlider, valWhiteLabel);
    if (gainWhite && audioCtx) {
      gainWhite.gain.setValueAtTime(parseFloat(volWhiteSlider.value), audioCtx.currentTime);
    }
  });

  volPinkSlider.addEventListener('input', () => {
    updateSliderDisplay(volPinkSlider, valPinkLabel);
    if (gainPink && audioCtx) {
      gainPink.gain.setValueAtTime(parseFloat(volPinkSlider.value), audioCtx.currentTime);
    }
  });

  volBrownSlider.addEventListener('input', () => {
    updateSliderDisplay(volBrownSlider, valBrownLabel);
    if (gainBrown && audioCtx) {
      gainBrown.gain.setValueAtTime(parseFloat(volBrownSlider.value), audioCtx.currentTime);
    }
  });

  volBinauralSlider.addEventListener('input', () => {
    updateSliderDisplay(volBinauralSlider, valBinauralLabel);
    if (gainBinaural && audioCtx) {
      gainBinaural.gain.setValueAtTime(parseFloat(volBinauralSlider.value), audioCtx.currentTime);
    }
  });

  // Math Buffers generators
  function createWhiteNoiseBuffer() {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function createPinkNoiseBuffer() {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Kellet refined filter approximation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; // scale to rough peak
      b6 = white * 0.115926;
    }
    return buffer;
  }

  function createBrownNoiseBuffer() {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Compensate amplitude loss
    }
    return buffer;
  }

  function initAudio() {
    if (audioCtx) return;
    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(parseFloat(masterVolSlider.value), audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    // Create intermediate channel gain nodes
    gainWhite = audioCtx.createGain();
    gainPink = audioCtx.createGain();
    gainBrown = audioCtx.createGain();
    gainBinaural = audioCtx.createGain();

    // Set initial gain levels matching slider values
    gainWhite.gain.setValueAtTime(parseFloat(volWhiteSlider.value), audioCtx.currentTime);
    gainPink.gain.setValueAtTime(parseFloat(volPinkSlider.value), audioCtx.currentTime);
    gainBrown.gain.setValueAtTime(parseFloat(volBrownSlider.value), audioCtx.currentTime);
    gainBinaural.gain.setValueAtTime(parseFloat(volBinauralSlider.value), audioCtx.currentTime);

    // Connect all sound mixer paths directly to the master output
    gainWhite.connect(masterGain);
    gainPink.connect(masterGain);
    gainBrown.connect(masterGain);
  }

  function startEngine() {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // 1. Setup White Noise Source
    const whiteBuffer = createWhiteNoiseBuffer();
    whiteSource = audioCtx.createBufferSource();
    whiteSource.buffer = whiteBuffer;
    whiteSource.loop = true;
    whiteSource.connect(gainWhite);
    whiteSource.start(now);

    // 2. Setup Pink Noise Source
    const pinkBuffer = createPinkNoiseBuffer();
    pinkSource = audioCtx.createBufferSource();
    pinkSource.buffer = pinkBuffer;
    pinkSource.loop = true;
    pinkSource.connect(gainPink);
    pinkSource.start(now);

    // 3. Setup Brown Noise Source
    const brownBuffer = createBrownNoiseBuffer();
    brownSource = audioCtx.createBufferSource();
    brownSource.buffer = brownBuffer;
    brownSource.loop = true;
    brownSource.connect(gainBrown);
    brownSource.start(now);

    // 4. Setup Binaural / Cosmic Drone oscillators (Stereo separate panning)
    binauralOscL = audioCtx.createOscillator();
    binauralOscR = audioCtx.createOscillator();

    binauralOscL.type = 'sine';
    binauralOscL.frequency.setValueAtTime(100, now); // Left ear base frequency

    binauralOscR.type = 'sine';
    binauralOscR.frequency.setValueAtTime(104, now); // Right ear detuned frequency (creates 4Hz pulsations)

    const channelMerger = audioCtx.createChannelMerger(2);
    
    // Connect oscillators to individual channel gains
    const gainL = audioCtx.createGain();
    const gainR = audioCtx.createGain();
    gainL.gain.setValueAtTime(0.5, now);
    gainR.gain.setValueAtTime(0.5, now);

    binauralOscL.connect(gainL);
    binauralOscR.connect(gainR);

    // Merge outputs into single stereo track
    gainL.connect(channelMerger, 0, 0); // route left oscillator to left ear (channel 0)
    gainR.connect(channelMerger, 0, 1); // route right oscillator to right ear (channel 1)

    channelMerger.connect(gainBinaural);
    gainBinaural.connect(masterGain);

    binauralOscL.start(now);
    binauralOscR.start(now);

    isPlaying = true;
    playBtn.classList.add('playing');
    playText.textContent = "STOP ENGINE";
    
    // Replace SVG icon to STOP (square symbol)
    playIcon.innerHTML = `
      <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"></rect>
    `;
  }

  function stopEngine() {
    if (!isPlaying) return;

    const now = audioCtx.currentTime;

    // Fade out smoothly over 0.2s before stopping
    if (masterGain) {
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    }

    setTimeout(() => {
      try { whiteSource.stop(); } catch (e) {}
      try { pinkSource.stop(); } catch (e) {}
      try { brownSource.stop(); } catch (e) {}
      try { binauralOscL.stop(); } catch (e) {}
      try { binauralOscR.stop(); } catch (e) {}

      // Clean sources
      whiteSource = null;
      pinkSource = null;
      brownSource = null;
      binauralOscL = null;
      binauralOscR = null;

      if (masterGain) {
        masterGain.gain.setValueAtTime(parseFloat(masterVolSlider.value), audioCtx.currentTime);
      }
    }, 220);

    isPlaying = false;
    playBtn.classList.remove('playing');
    playText.textContent = "START ENGINE";
    
    // Replace SVG icon back to PLAY (triangle symbol)
    playIcon.innerHTML = `
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    `;
  }

  // Bind start/stop trigger
  playBtn.addEventListener('click', () => {
    if (isPlaying) {
      stopEngine();
    } else {
      startEngine();
    }
  });

  // Presets mapping handler
  const presets = {
    focus: { white: 0, pink: 0.6, brown: 0.1, binaural: 0.3 },
    sleep: { white: 0, pink: 0, brown: 0.85, binaural: 0.25 },
    rain: { white: 0.45, pink: 0.35, brown: 0.15, binaural: 0 },
    mute: { white: 0, pink: 0, brown: 0, binaural: 0 }
  };

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const choice = btn.dataset.preset;
      const values = presets[choice];

      if (values) {
        // Set input slider values
        volWhiteSlider.value = values.white;
        volPinkSlider.value = values.pink;
        volBrownSlider.value = values.brown;
        volBinauralSlider.value = values.binaural;

        // Sync values and text DOM labels
        syncAllLabels();

        // If audio engines are already active, immediately scale active gains
        if (isPlaying && audioCtx) {
          const now = audioCtx.currentTime;
          gainWhite.gain.setValueAtTime(values.white, now);
          gainPink.gain.setValueAtTime(values.pink, now);
          gainBrown.gain.setValueAtTime(values.brown, now);
          gainBinaural.gain.setValueAtTime(values.binaural, now);
        }
      }
      
      // Briefly remove active button outline highlight
      setTimeout(() => btn.classList.remove('active'), 250);
    });
  });
});
