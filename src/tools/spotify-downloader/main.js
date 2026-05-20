// Spotify to MP3 Downloader - JUKEBOX
// Interacts with Cobalt API to download Spotify links, with interactive turntable visual feedback

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const themeBtn = document.getElementById('theme-btn');
  const urlInput = document.getElementById('url-input');
  const btnPaste = document.getElementById('btn-paste');
  const btnDownload = document.getElementById('btn-download');
  
  const btnToggleSettings = document.getElementById('btn-toggle-settings');
  const settingsPanel = document.getElementById('settings-panel');
  const apiInstanceInput = document.getElementById('api-instance');
  
  // Audio Visual Elements
  const vinylDisc = document.getElementById('vinyl-disc');
  const tonearm = document.getElementById('tonearm');
  const statusPulse = document.getElementById('status-pulse');
  const statusLabel = document.getElementById('status-label');
  const lcdScreen = document.getElementById('lcd-screen');
  const eqBars = document.querySelectorAll('.eq-bar');
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('download-progress-fill');

  // App State
  let settingsOpen = false;

  // Load saved API endpoint from localStorage (shared with YouTube Downloader)
  const savedInstance = localStorage.getItem('cobalt_instance') || 'https://api.cobalt.tools';
  apiInstanceInput.value = savedInstance;

  // Theme support
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  }
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Paste Action
  btnPaste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      urlInput.value = text;
      lcdLog('[CLIPBOARD] Link pasted.', 'muted');
    } catch (err) {
      lcdLog('[CLIPBOARD] Paste failed. Paste manually.', 'error');
    }
  });

  // Settings Accordion
  btnToggleSettings.addEventListener('click', () => {
    settingsOpen = !settingsOpen;
    settingsPanel.style.display = settingsOpen ? 'block' : 'none';
    btnToggleSettings.querySelector('svg').style.transform = settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  });

  // LCD logger
  function lcdLog(text, type = '') {
    const line = document.createElement('div');
    line.className = `lcd-row ${type ? 'text-' + type : ''}`;
    line.textContent = `> ${text}`;
    lcdScreen.appendChild(line);
    lcdScreen.scrollTop = lcdScreen.scrollHeight;
  }

  function clearLcd() {
    lcdScreen.innerHTML = '';
  }

  // Animation controllers
  function startPlayback() {
    vinylDisc.classList.add('spinning');
    tonearm.classList.add('playing');
    statusPulse.classList.add('active');
    statusLabel.classList.add('active');
    statusLabel.textContent = 'DECK CONVERTING';
    
    eqBars.forEach(bar => {
      bar.classList.add('active');
      // Assign random animations speeds dynamically for natural look
      bar.style.animationDelay = `${Math.random() * 0.5}s`;
    });
  }

  function stopPlayback(isSuccess = false) {
    vinylDisc.classList.remove('spinning');
    tonearm.classList.remove('playing');
    statusPulse.classList.remove('active');
    statusLabel.classList.remove('active');
    statusLabel.textContent = isSuccess ? 'DECK COMPLETE' : 'DECK IDLE';
    
    eqBars.forEach(bar => {
      bar.classList.remove('active');
    });
  }

  const COBALT_MIRRORS = [
    'https://api.cobalt.tools',
    'https://cobalt.api.ryz.cx',
    'https://cobalt-api.kwiateknadziany.pl',
    'https://cobalt.api.g45.su'
  ];

  // Action Download Spotify track
  btnDownload.addEventListener('click', async () => {
    const trackUrl = urlInput.value.trim();
    
    if (!trackUrl) {
      lcdLog('ERROR: Input link is empty.', 'error');
      return;
    }

    // Lock button
    btnDownload.classList.add('disabled');
    btnDownload.disabled = true;
    
    clearLcd();
    progressContainer.style.opacity = '1';
    progressFill.style.width = '10%';
    
    // Animate turntable deck
    startPlayback();

    lcdLog('DECK STATUS: WARMING UP...', 'muted');
    lcdLog('MOUNTING VINYL PLATTER...', 'muted');
    lcdLog(`URL TARGET: ${trackUrl}`);
    
    const payload = {
      url: trackUrl,
      audioFormat: 'mp3',
      isAudioOnly: true,
      filenamePattern: 'classic'
    };

    let success = false;
    const customOverride = apiInstanceInput.value.trim();
    const mirrorsToTry = customOverride ? [customOverride] : COBALT_MIRRORS;
    
    lcdLog(`NODE DECK LOADED: ${mirrorsToTry.length} MIRROR(S)`, 'muted');

    for (let i = 0; i < mirrorsToTry.length; i++) {
      const currentMirror = mirrorsToTry[i];
      lcdLog(`NODE ${i + 1}/${mirrorsToTry.length}: ${currentMirror.substring(8, 25)}...`, 'muted');
      progressFill.style.width = `${20 + i * 15}%`;

      try {
        const response = await fetch(`${currentMirror}/api/json`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'error') {
          lcdLog('NODE TEMP ERROR. ROTATING DECK...', 'error');
          continue;
        }

        if (data.status === 'success' || data.status === 'stream' || data.status === 'redirect') {
          const streamUrl = data.url;
          lcdLog('SUCCESS: Track parsed perfectly!', 'success');
          lcdLog(`STREAM CONVERTED: ${streamUrl.substring(0, 50)}...`, 'success');
          lcdLog('INITIATING FILE DISPATCH...', 'muted');
          
          progressFill.style.width = '100%';
          stopPlayback(true);
          
          // Trigger browser download by clicking anchor
          const a = document.createElement('a');
          a.href = streamUrl;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // Smart learn successful mirror
          if (!customOverride) {
            localStorage.setItem('cobalt_instance', currentMirror);
          }
          
          success = true;
          break;
        } else if (data.url) {
          lcdLog('SUCCESS: Direct stream url extracted.', 'success');
          window.open(data.url, '_blank');
          stopPlayback(true);
          if (!customOverride) {
            localStorage.setItem('cobalt_instance', currentMirror);
          }
          success = true;
          break;
        }
      } catch (err) {
        lcdLog('NODE OFFLINE. ROTATING MIRROR...', 'error');
      }
    }

    if (!success) {
      lcdLog('DECK CRITICAL: All mirrors failed.', 'error');
      stopPlayback(false);
      progressFill.style.width = '0%';
    }

    // Re-enable
    btnDownload.classList.remove('disabled');
    btnDownload.disabled = false;
  });
});
