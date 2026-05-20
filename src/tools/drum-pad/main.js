import { initTheme, toggleTheme } from '../../assets/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }

  const pads = document.querySelectorAll('.pad');
  const masterVolSlider = document.getElementById('master-vol');
  const volVal = document.getElementById('vol-val');
  const kitBtns = document.querySelectorAll('.kit-btn');

  let audioCtx = null;
  let masterGain = null;
  let selectedKit = 'acoustic';

  kitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      kitBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedKit = btn.dataset.kit;
    });
  });

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(parseFloat(masterVolSlider.value), audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }

  if (masterVolSlider) {
    masterVolSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      volVal.textContent = `${Math.round(val * 100)}%`;
      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(val, audioCtx.currentTime);
      }
    });
  }

  // --- AUDIO SYNTHESIS ENGINES --- //

  // Shared generic noise buffer generator
  function createNoiseBuffer(durationSecs) {
    const bufferSize = audioCtx.sampleRate * durationSecs;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function playKick(time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    if (selectedKit === 'acoustic') {
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.start(time);
      osc.stop(time + 0.16);
    } else { // 808 Synth
      osc.frequency.setValueAtTime(75, time);
      osc.frequency.exponentialRampToValueAtTime(20, time + 0.35);
      gain.gain.setValueAtTime(1.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
      osc.start(time);
      osc.stop(time + 0.36);
    }
  }

  function playSnare(time) {
    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = createNoiseBuffer(0.2);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = selectedKit === 'acoustic' ? 1000 : 2000;
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(selectedKit === 'acoustic' ? 0.8 : 1.0, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);

    // Snap component
    const snapOsc = audioCtx.createOscillator();
    const snapGain = audioCtx.createGain();
    snapOsc.type = selectedKit === 'acoustic' ? 'triangle' : 'sine';
    snapOsc.frequency.setValueAtTime(180, time);
    if (selectedKit === 'synth') {
      snapOsc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
    }
    snapGain.gain.setValueAtTime(0.5, time);
    snapGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    
    snapOsc.connect(snapGain);
    snapGain.connect(masterGain);

    noiseNode.start(time);
    noiseNode.stop(time + 0.21);
    snapOsc.start(time);
    snapOsc.stop(time + 0.11);
  }

  let activeOpenHat = null; // Track open hat for choking

  function playClosedHat(time) {
    // Choke open hat if it's playing
    if (activeOpenHat && activeOpenHat.gainNode) {
      activeOpenHat.gainNode.gain.cancelScheduledValues(time);
      activeOpenHat.gainNode.gain.setValueAtTime(activeOpenHat.gainNode.gain.value, time);
      activeOpenHat.gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
      activeOpenHat = null;
    }

    if (selectedKit === 'acoustic') {
      const source = audioCtx.createBufferSource();
      source.buffer = createNoiseBuffer(0.05);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 7500;
      filter.Q.value = 5;
      
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      source.start(time);
      source.stop(time + 0.06);
    } else { // 808 Synth Hat
      const osc = audioCtx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(4000, time);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.06);
    }
  }

  function playOpenHat(time) {
    const gain = audioCtx.createGain();
    gain.connect(masterGain);

    if (selectedKit === 'acoustic') {
      const source = audioCtx.createBufferSource();
      source.buffer = createNoiseBuffer(0.4);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 7500;
      filter.Q.value = 3;
      
      gain.gain.setValueAtTime(0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      source.connect(filter);
      filter.connect(gain);
      source.start(time);
      source.stop(time + 0.45);
    } else { // 808 Synth Open Hat
      const osc = audioCtx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(4000, time);
      
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + 0.45);
    }

    activeOpenHat = { gainNode: gain, triggerTime: time };
  }

  function playTom(time, type) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    let startFreq, endFreq;
    if (type === 'high') {
      startFreq = selectedKit === 'acoustic' ? 180 : 300;
      endFreq = selectedKit === 'acoustic' ? 80 : 150;
    } else { // low
      startFreq = selectedKit === 'acoustic' ? 120 : 200;
      endFreq = selectedKit === 'acoustic' ? 50 : 80;
    }

    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.25);
    
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.start(time);
    osc.stop(time + 0.26);
  }

  function playCowbell(time) {
    const gain = audioCtx.createGain();
    gain.connect(masterGain);

    if (selectedKit === 'acoustic') {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      osc1.frequency.setValueAtTime(800, time);
      osc2.frequency.setValueAtTime(540, time);
      
      gain.gain.setValueAtTime(0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      
      osc1.connect(gain);
      osc2.connect(gain);
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.15);
      osc2.stop(time + 0.15);
    } else { // 808 Cowbell
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      osc1.type = 'square';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(540, time);
      osc2.frequency.setValueAtTime(800, time);
      
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      
      osc1.connect(gain);
      osc2.connect(gain);
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.25);
      osc2.stop(time + 0.25);
    }
  }

  function playCrash(time) {
    if (selectedKit === 'acoustic') {
      const source = audioCtx.createBufferSource();
      source.buffer = createNoiseBuffer(0.7);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2500;
      
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);
      
      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      source.start(time);
      source.stop(time + 0.75);
    } else { // 808 Ride
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(3000, time);
      
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
      
      osc.frequency.setValueAtTime(1000, time);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.85);
    }
  }

  function triggerPad(padName) {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;
    switch(padName) {
      case 'kick': playKick(now); break;
      case 'snare': playSnare(now); break;
      case 'closedhat': playClosedHat(now); break;
      case 'openhat': playOpenHat(now); break;
      case 'hightom': playTom(now, 'high'); break;
      case 'lowtom': playTom(now, 'low'); break;
      case 'cowbell': playCowbell(now); break;
      case 'crash': playCrash(now); break;
    }
  }

  // Visual Recoil
  function animateStrike(el) {
    if (!el) return;
    el.classList.remove('active');
    void el.offsetWidth; // Force CSS repaint reflow
    el.classList.add('active');
    setTimeout(() => {
      el.classList.remove('active');
    }, 100); // Quick reset for rapid consecutive hits
  }

  // Unified Pointer Event Engine (Touch, Mouse, Pen)
  let activePointers = new Set();
  
  pads.forEach(pad => {
    const padName = pad.dataset.pad;

    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      activePointers.add(e.pointerId);
      triggerPad(padName);
      animateStrike(pad);
      pad.setPointerCapture(e.pointerId);
    });

    pad.addEventListener('pointerenter', (e) => {
      e.preventDefault();
      // Support glissando sliding across pads with mouse left button or touch pressed
      if ((e.pointerType === 'mouse' && e.buttons === 1) || (e.pointerType === 'touch' && activePointers.has(e.pointerId))) {
        triggerPad(padName);
        animateStrike(pad);
      }
    });

    pad.addEventListener('pointerup', (e) => {
      e.preventDefault();
      activePointers.delete(e.pointerId);
      pad.releasePointerCapture(e.pointerId);
    });

    pad.addEventListener('pointercancel', (e) => {
      e.preventDefault();
      activePointers.delete(e.pointerId);
      pad.releasePointerCapture(e.pointerId);
    });
    
    pad.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  // Keyboard mapping
  const keyMap = {
    'q': 'kick', 'w': 'snare', 'e': 'closedhat', 'r': 'openhat',
    'a': 'hightom', 's': 'lowtom', 'd': 'cowbell', 'f': 'crash'
  };

  const activeKeys = new Set();

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.target.tagName === 'INPUT') return;
    
    const key = e.key.toLowerCase();
    if (keyMap[key] && !activeKeys.has(key)) {
      e.preventDefault();
      activeKeys.add(key);
      const padName = keyMap[key];
      const pad = document.querySelector(`.pad[data-pad="${padName}"]`);
      if (pad) {
        triggerPad(padName);
        animateStrike(pad);
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (activeKeys.has(key)) {
      activeKeys.delete(key);
    }
  });
});
