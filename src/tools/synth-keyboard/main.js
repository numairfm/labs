import { initTheme, toggleTheme } from '../../assets/js/utils.js';

const NOTE_FREQS = {
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63,
  "F4": 349.23, "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00,
  "A#4": 466.16, "B4": 493.88, "C5": 523.25, "C#5": 554.37, "D5": 587.33,
  "D#5": 622.25, "E5": 659.25, "F5": 698.46
};

const KEY_MAP = {
  'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
  'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
  'u': 'A#4', 'j': 'B4', 'k': 'C5', 'o': 'C#5', 'l': 'D5',
  'p': 'D#5', ';': 'E5', "'": 'F5'
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Audio Context State
  let audioCtx = null;
  let masterGainNode = null;
  let activeOscillators = {}; // Maps note name to { osc, gain, triggerTime }
  let activeComputerKeys = new Set(); // To prevent key repeat triggers
  let selectedWaveform = 'sine';

  // DOM Controls
  const masterVolInput = document.getElementById('master-vol');
  const volValLabel = document.getElementById('vol-val');
  const adsrAInput = document.getElementById('adsr-a');
  const adsrAVal = document.getElementById('adsr-a-val');
  const adsrDInput = document.getElementById('adsr-d');
  const adsrDVal = document.getElementById('adsr-d-val');
  const adsrSInput = document.getElementById('adsr-s');
  const adsrSVal = document.getElementById('adsr-s-val');
  const adsrRInput = document.getElementById('adsr-r');
  const adsrRVal = document.getElementById('adsr-r-val');
  const waveformButtons = document.querySelectorAll('.waveform-btn');
  const keys = document.querySelectorAll('.key');

  // Sync Input Value Displays
  masterVolInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    volValLabel.textContent = `${Math.round(val * 100)}%`;
    if (masterGainNode) {
      masterGainNode.gain.setValueAtTime(val, audioCtx.currentTime);
    }
  });

  adsrAInput.addEventListener('input', (e) => {
    adsrAVal.textContent = `${parseFloat(e.target.value).toFixed(2)}s`;
  });

  adsrDInput.addEventListener('input', (e) => {
    adsrDVal.textContent = `${parseFloat(e.target.value).toFixed(2)}s`;
  });

  adsrSInput.addEventListener('input', (e) => {
    adsrSVal.textContent = `${Math.round(parseFloat(e.target.value) * 100)}%`;
  });

  adsrRInput.addEventListener('input', (e) => {
    adsrRVal.textContent = `${parseFloat(e.target.value).toFixed(2)}s`;
  });

  // Waveform selector buttons
  waveformButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      waveformButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedWaveform = btn.dataset.type;
    });
  });

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.setValueAtTime(parseFloat(masterVolInput.value), audioCtx.currentTime);
    masterGainNode.connect(audioCtx.destination);
  }

  // ADSR Trigger
  function startNote(note) {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const freq = NOTE_FREQS[note];
    if (!freq) return;

    const now = audioCtx.currentTime;

    // If already playing this note, stop it instantly
    if (activeOscillators[note]) {
      stopNote(note, true);
    }

    const oscNode = audioCtx.createOscillator();
    const noteGainNode = audioCtx.createGain();

    oscNode.type = selectedWaveform;
    oscNode.frequency.setValueAtTime(freq, now);

    // Get envelope settings
    const attack = parseFloat(adsrAInput.value);
    const decay = parseFloat(adsrDInput.value);
    const sustain = parseFloat(adsrSInput.value);

    // Note ADSR Attack & Decay scheduling
    noteGainNode.gain.setValueAtTime(0, now);
    noteGainNode.gain.linearRampToValueAtTime(1.0, now + attack);
    noteGainNode.gain.setValueAtTime(1.0, now + attack);
    noteGainNode.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.001), now + attack + decay);

    oscNode.connect(noteGainNode);
    noteGainNode.connect(masterGainNode);

    oscNode.start(now);

    activeOscillators[note] = {
      oscillator: oscNode,
      gainNode: noteGainNode,
      triggerTime: now
    };

    // Style active state
    const keyEl = document.querySelector(`.key[data-note="${note}"]`);
    if (keyEl) {
      keyEl.classList.add('active');
    }
  }

  function stopNote(note, forceInstant = false) {
    if (!activeOscillators[note]) return;

    const { oscillator, gainNode, triggerTime } = activeOscillators[note];
    delete activeOscillators[note];

    // Remove active styles
    const keyEl = document.querySelector(`.key[data-note="${note}"]`);
    if (keyEl) {
      keyEl.classList.remove('active');
    }

    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    if (forceInstant) {
      try {
        oscillator.stop(now);
      } catch (e) {}
      return;
    }

    const release = parseFloat(adsrRInput.value);

    // Cancel any scheduled decay envelopes
    gainNode.gain.cancelScheduledValues(now);
    
    // Set current value and decay to 0 over release time
    // Web Audio requires a non-zero value for exponential curves
    const currentGain = gainNode.gain.value;
    gainNode.gain.setValueAtTime(Math.max(currentGain, 0.001), now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + release);

    try {
      oscillator.stop(now + release + 0.1);
    } catch (e) {}
  }

  // Mouse & Touch bindings
  keys.forEach(key => {
    const note = key.dataset.note;

    const triggerPlay = (e) => {
      e.preventDefault();
      startNote(note);
    };

    const triggerStop = (e) => {
      e.preventDefault();
      stopNote(note);
    };

    key.addEventListener('mousedown', triggerPlay);
    key.addEventListener('mouseup', triggerStop);
    key.addEventListener('mouseleave', triggerStop);

    // Touch Support
    key.addEventListener('touchstart', triggerPlay, { passive: false });
    key.addEventListener('touchend', triggerStop, { passive: false });
    key.addEventListener('touchcancel', triggerStop, { passive: false });
  });

  // Computer Keyboard listeners
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return; // Ignore repeat events
    
    // Ignore key presses if typing inside text controls (none here, but safe practice)
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;

    const key = e.key.toLowerCase();
    const note = KEY_MAP[key];

    if (note && !activeComputerKeys.has(key)) {
      activeComputerKeys.add(key);
      startNote(note);
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    const note = KEY_MAP[key];

    if (note) {
      activeComputerKeys.delete(key);
      stopNote(note);
    }
  });
});
