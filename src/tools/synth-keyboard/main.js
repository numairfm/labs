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
  let selectedWaveform = 'piano';

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

    // If already playing this note, let it naturally decay in the background to avoid pops and overlap beautifully
    if (activeOscillators[note]) {
      stopNote(note, false);
    }

    const noteGainNode = audioCtx.createGain();
    let oscs = [];

    if (selectedWaveform === 'piano') {
      // High-Fidelity physical modeling of acoustic piano string
      // Blend Triangle fundamental with lower-volume Sine harmonics for a rich timbre
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const osc3 = audioCtx.createOscillator();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 3, now);

      const osc1Gain = audioCtx.createGain();
      const osc2Gain = audioCtx.createGain();
      const osc3Gain = audioCtx.createGain();

      osc1Gain.gain.setValueAtTime(0.6, now);
      osc2Gain.gain.setValueAtTime(0.25, now);
      osc3Gain.gain.setValueAtTime(0.15, now);

      osc1.connect(osc1Gain);
      osc2.connect(osc2Gain);
      osc3.connect(osc3Gain);

      osc1Gain.connect(noteGainNode);
      osc2Gain.connect(noteGainNode);
      osc3Gain.connect(noteGainNode);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);

      oscs = [osc1, osc2, osc3];

      // Piano String Envelope: Instant hammer strike (0.005s) followed by natural slow string decay over 3.5 seconds
      noteGainNode.gain.setValueAtTime(0, now);
      noteGainNode.gain.linearRampToValueAtTime(1.0, now + 0.005);
      noteGainNode.gain.exponentialRampToValueAtTime(0.005, now + 3.5);
    } else {
      // Standard Synthesizer waveforms
      const oscNode = audioCtx.createOscillator();
      oscNode.type = selectedWaveform;
      oscNode.frequency.setValueAtTime(freq, now);

      // Get envelope settings
      const attack = parseFloat(adsrAInput.value);
      const decay = parseFloat(adsrDInput.value);
      const sustain = parseFloat(adsrSInput.value);

      // Standard synth ADSR Attack & Decay scheduling
      noteGainNode.gain.setValueAtTime(0, now);
      noteGainNode.gain.linearRampToValueAtTime(1.0, now + attack);
      noteGainNode.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.001), now + attack + decay);

      oscNode.connect(noteGainNode);
      oscNode.start(now);

      oscs = [oscNode];
    }

    noteGainNode.connect(masterGainNode);

    activeOscillators[note] = {
      oscillators: oscs,
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

    const { oscillators, gainNode, triggerTime } = activeOscillators[note];
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
        oscillators.forEach(osc => osc.stop(now));
      } catch (e) {}
      return;
    }

    const release = (selectedWaveform === 'piano') ? 0.25 : parseFloat(adsrRInput.value);

    // Cancel any scheduled decay envelopes
    gainNode.gain.cancelScheduledValues(now);
    
    // Set current value and decay to 0 over release time
    // Web Audio requires a non-zero value for exponential curves
    const currentGain = gainNode.gain.value;
    gainNode.gain.setValueAtTime(Math.max(currentGain, 0.001), now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + release);

    try {
      oscillators.forEach(osc => osc.stop(now + release + 0.1));
    } catch (e) {}
  }

  // Unified Pointer Event Engine (Touch, Mouse, Pen)
  let activePointerNotes = {}; // Tracks active notes per pointer ID

  keys.forEach(key => {
    const note = key.dataset.note;

    const play = () => {
      startNote(note);
    };

    const stop = () => {
      stopNote(note);
    };

    key.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // Handle left click / touch primary triggers
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      if (!activePointerNotes[e.pointerId]) {
        activePointerNotes[e.pointerId] = new Set();
      }
      activePointerNotes[e.pointerId].add(note);
      play();
    });

    key.addEventListener('pointerenter', (e) => {
      e.preventDefault();
      // Support glissando sliding across keyboard keys with mouse left button pressed
      if (e.pointerType === 'mouse' && e.buttons === 1) {
        if (!activePointerNotes[e.pointerId]) {
          activePointerNotes[e.pointerId] = new Set();
        }
        if (!activePointerNotes[e.pointerId].has(note)) {
          activePointerNotes[e.pointerId].add(note);
          play();
        }
      }
    });

    key.addEventListener('pointerleave', (e) => {
      e.preventDefault();
      if (activePointerNotes[e.pointerId] && activePointerNotes[e.pointerId].has(note)) {
        activePointerNotes[e.pointerId].delete(note);
        stop();
      }
    });

    key.addEventListener('pointerup', (e) => {
      e.preventDefault();
      if (activePointerNotes[e.pointerId] && activePointerNotes[e.pointerId].has(note)) {
        activePointerNotes[e.pointerId].delete(note);
        stop();
      }
    });

    key.addEventListener('pointercancel', (e) => {
      e.preventDefault();
      if (activePointerNotes[e.pointerId] && activePointerNotes[e.pointerId].has(note)) {
        activePointerNotes[e.pointerId].delete(note);
        stop();
      }
    });
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
