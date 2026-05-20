import { initTheme, toggleTheme } from '../../assets/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Audio Context State
  let audioCtx = null;
  let masterGain = null;

  // Timer Configuration State (in minutes)
  let workDuration = 25;
  let shortDuration = 5;
  let longDuration = 15;

  let currentMode = 'work'; // work, short, long
  let isRunning = false;
  let timeLeft = workDuration * 60; // in seconds
  let totalDuration = workDuration * 60;
  let timerInterval = null;

  // Dial Circumference
  const radius = 88;
  const circumference = 2 * Math.PI * radius;

  // DOM Elements
  const progressRing = document.getElementById('progress-ring');
  const timerTimeLabel = document.getElementById('timer-time');
  const timerNameLabel = document.getElementById('timer-label');
  const btnToggle = document.getElementById('btn-toggle');
  const toggleText = document.getElementById('toggle-text');
  const btnReset = document.getElementById('btn-reset');
  const tickToggle = document.getElementById('tick-toggle');

  const inputWork = document.getElementById('input-work');
  const workValLabel = document.getElementById('work-val');
  const inputShort = document.getElementById('input-short');
  const shortValLabel = document.getElementById('short-val');
  const inputLong = document.getElementById('input-long');
  const longValLabel = document.getElementById('long-val');

  const modeButtons = document.querySelectorAll('.mode-btn');

  // SVG Progress Ring Init
  if (progressRing) {
    progressRing.style.strokeDasharray = circumference;
    progressRing.style.strokeDashoffset = 0;
  }

  // Audio Init
  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.6, audioCtx.currentTime); // moderate default volume
    masterGain.connect(audioCtx.destination);
  }

  // Sound Synth: Crisp Tactile Clock Tick (10ms decay)
  function playTickSound() {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const time = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2500, time); // crisp high pitch

    gainNode.gain.setValueAtTime(0.015, time); // soft quiet tick
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.008);

    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.start(time);
    osc.stop(time + 0.01);
  }

  // Sound Synth: Vintage Electric Buzzer Alarm (modulated square waves)
  function playBuzzerSound() {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const alarmGain = audioCtx.createGain();
    alarmGain.connect(masterGain);

    alarmGain.gain.setValueAtTime(0, now);
    alarmGain.gain.linearRampToValueAtTime(0.35, now + 0.04);
    alarmGain.gain.setValueAtTime(0.35, now + 0.04);
    alarmGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(290, now);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(293, now); // detune slightly for a rough vintage vibrato

    // LFO to create rapid electrical vibrations (15Hz pitch modulation)
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 15;
    lfoGain.gain.value = 35;

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    osc1.connect(alarmGain);
    osc2.connect(alarmGain);

    lfo.start(now);
    osc1.start(now);
    osc2.start(now);

    lfo.stop(now + 1.25);
    osc1.stop(now + 1.25);
    osc2.stop(now + 1.25);
  }

  // Formatting helper
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Update countdown clock visual layout
  function updateUI() {
    timerTimeLabel.textContent = formatTime(timeLeft);
    
    if (progressRing && totalDuration > 0) {
      const progress = timeLeft / totalDuration;
      const offset = circumference - (progress * circumference);
      progressRing.style.strokeDashoffset = offset;
    }
  }

  // Switch modes
  function setMode(mode) {
    stopTimer();
    currentMode = mode;
    
    // Manage tab highlight
    modeButtons.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (mode === 'work') {
      timerNameLabel.textContent = 'FOCUS SESSION';
      timeLeft = workDuration * 60;
    } else if (mode === 'short') {
      timerNameLabel.textContent = 'SHORT BREAK';
      timeLeft = shortDuration * 60;
    } else if (mode === 'long') {
      timerNameLabel.textContent = 'LONG BREAK';
      timeLeft = longDuration * 60;
    }

    totalDuration = timeLeft;
    updateUI();
  }

  // Start timer loop
  function startTimer() {
    initAudio();
    if (timerInterval) return;

    isRunning = true;
    toggleText.textContent = 'PAUSE';
    btnToggle.classList.add('active');
    
    // Play button SVG toggle to pause symbol (two rectangles)
    btnToggle.querySelector('svg').innerHTML = `
      <rect x="6" y="4" width="4" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"></rect>
      <rect x="14" y="4" width="4" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"></rect>
    `;

    timerInterval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updateUI();
        
        // Play click if selected
        if (tickToggle.checked) {
          playTickSound();
        }
      } else {
        // Countdown reached zero!
        stopTimer();
        playBuzzerSound();
        
        // Switch modes automatically
        if (currentMode === 'work') {
          setMode('short');
        } else {
          setMode('work');
        }
      }
    }, 1000);
  }

  // Pause timer loop
  function stopTimer() {
    isRunning = false;
    toggleText.textContent = 'START';
    btnToggle.classList.remove('active');

    // Play button SVG toggle back to play triangle symbol
    btnToggle.querySelector('svg').innerHTML = `
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    `;

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Bind Start/Pause
  btnToggle.addEventListener('click', () => {
    if (isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  // Bind Reset
  btnReset.addEventListener('click', () => {
    setMode(currentMode);
  });

  // Bind Mode selectors
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
    });
  });

  // Config Sliders Live Sync
  inputWork.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    workDuration = val;
    workValLabel.textContent = `${val} min`;
    if (!isRunning && currentMode === 'work') {
      timeLeft = val * 60;
      totalDuration = val * 60;
      updateUI();
    }
  });

  inputShort.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    shortDuration = val;
    shortValLabel.textContent = `${val} min`;
    if (!isRunning && currentMode === 'short') {
      timeLeft = val * 60;
      totalDuration = val * 60;
      updateUI();
    }
  });

  inputLong.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    longDuration = val;
    longValLabel.textContent = `${val} min`;
    if (!isRunning && currentMode === 'long') {
      timeLeft = val * 60;
      totalDuration = val * 60;
      updateUI();
    }
  });
});
