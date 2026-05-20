import { initTheme, toggleTheme, showToast } from '../../assets/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }

  const pads = document.querySelectorAll('.drum-item');
  const masterVolSlider = document.getElementById('master-vol');

  let audioCtx = null;
  let masterGain = null;

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(parseFloat(masterVolSlider.value), audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }

  if (masterVolSlider) {
    masterVolSlider.addEventListener('input', (e) => {
      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(parseFloat(e.target.value), audioCtx.currentTime);
      }
    });
  }

  // Synth Engines
  function playKick(time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  function playSnare(time) {
    const bufferSize = audioCtx.sampleRate * 0.2; // 0.2 seconds
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    // Snap component (short low pitch sweep)
    const snapOsc = audioCtx.createOscillator();
    const snapGain = audioCtx.createGain();
    snapOsc.frequency.setValueAtTime(180, time);
    snapGain.gain.setValueAtTime(0.5, time);
    snapGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    
    snapOsc.connect(snapGain);
    snapGain.connect(masterGain);

    noiseNode.start(time);
    noiseNode.stop(time + 0.21);
    snapOsc.start(time);
    snapOsc.stop(time + 0.06);
  }

  function playHiHat(time) {
    const bufferSize = audioCtx.sampleRate * 0.05; // 0.05s
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 7500;
    filter.Q.value = 5;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    source.start(time);
    source.stop(time + 0.06);
  }

  function playClap(time) {
    // 3 overlapping micro noise bursts
    for (let i = 0; i < 3; i++) {
      const triggerTime = time + (i * 0.015);
      const bufferSize = audioCtx.sampleRate * 0.06;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1500;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.4 - (i * 0.1), triggerTime);
      gain.gain.exponentialRampToValueAtTime(0.01, triggerTime + 0.05);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start(triggerTime);
      source.stop(triggerTime + 0.06);
    }
  }

  function playTom(time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(75, time + 0.25);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.start(time);
    osc.stop(time + 0.26);
  }

  function playPluck(time) {
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, time); // A4 note

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(150, time + 0.1);

    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  function playSub(time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    osc.frequency.setValueAtTime(70, time);
    osc.frequency.exponentialRampToValueAtTime(20, time + 0.35);

    gain.gain.setValueAtTime(1.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.start(time);
    osc.stop(time + 0.36);
  }

  function playCrash(time) {
    const bufferSize = audioCtx.sampleRate * 0.7;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2500;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    source.start(time);
    source.stop(time + 0.7);
  }

  function triggerPad(sound) {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;
    switch(sound) {
      case 'kick': playKick(now); break;
      case 'snare': playSnare(now); break;
      case 'hihat': playHiHat(now); break;
      case 'clap': playClap(now); break;
      case 'tom': playTom(now); break;
      case 'pluck': playPluck(now); break;
      case 'sub': playSub(now); break;
      case 'noise': playCrash(now); break;
    }
  }

  // Trigger kinetic strike animation with immediate restart reflow
  function animateStrike(el) {
    if (!el) return;
    el.classList.remove('active');
    void el.offsetWidth; // Force CSS repaint reflow
    el.classList.add('active');
  }

  // Connect clicks
  pads.forEach(pad => {
    pad.addEventListener('click', (e) => {
      e.preventDefault();
      const sound = pad.dataset.sound;
      triggerPad(sound);
      animateStrike(pad);
    });

    // Cleanup active class when kinetic animation runs to completion
    pad.addEventListener('animationend', () => {
      pad.classList.remove('active');
    });
  });

  // Keyboard mapping (QWER and ASDF)
  const keyMap = {
    'q': 'kick', 'w': 'snare', 'e': 'hihat', 'r': 'clap',
    'a': 'tom', 's': 'pluck', 'd': 'sub', 'f': 'noise'
  };

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keyMap[key]) {
      e.preventDefault();
      const sound = keyMap[key];
      const pad = document.querySelector(`.drum-item[data-sound="${sound}"]`);
      if (pad) {
        triggerPad(sound);
        animateStrike(pad);
      }
    }
  });
});
