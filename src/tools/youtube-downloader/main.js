// YouTube MP3/MP4 Downloader - JUKEBOX
// Connects client-side to Cobalt API with customizable mirror backup support

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const themeBtn = document.getElementById('theme-btn');
  const urlInput = document.getElementById('url-input');
  const btnPaste = document.getElementById('btn-paste');
  const fmtAudio = document.getElementById('fmt-audio');
  const fmtVideo = document.getElementById('fmt-video');
  const qualityContainer = document.getElementById('quality-selector-container');
  const qualitySelect = document.getElementById('quality-select');
  const btnDownload = document.getElementById('btn-download');
  
  const btnToggleSettings = document.getElementById('btn-toggle-settings');
  const settingsPanel = document.getElementById('settings-panel');
  const apiInstanceInput = document.getElementById('api-instance');
  
  const terminalLogs = document.getElementById('terminal-logs');
  const terminalProgress = document.getElementById('terminal-progress');
  const downloadProgressFill = document.getElementById('download-progress-fill');

  // App state
  let downloadFormat = 'audio'; // 'audio' or 'video'
  let settingsOpen = false;

  // Load saved API endpoint from localStorage
  const savedInstance = localStorage.getItem('cobalt_instance');
  if (savedInstance) {
    apiInstanceInput.value = savedInstance;
  }

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
      log('[CLIPBOARD] Pasted link successfully.', 'muted');
    } catch (err) {
      log('[CLIPBOARD] Permission denied. Please paste manually.', 'warning');
    }
  });

  // Format toggles
  fmtAudio.addEventListener('click', () => {
    fmtAudio.classList.add('active');
    fmtVideo.classList.remove('active');
    qualityContainer.style.display = 'none';
    downloadFormat = 'audio';
  });

  fmtVideo.addEventListener('click', () => {
    fmtVideo.classList.add('active');
    fmtAudio.classList.remove('active');
    qualityContainer.style.display = 'block';
    downloadFormat = 'video';
  });

  // Settings Accordion
  btnToggleSettings.addEventListener('click', () => {
    settingsOpen = !settingsOpen;
    settingsPanel.style.display = settingsOpen ? 'block' : 'none';
    btnToggleSettings.querySelector('svg').style.transform = settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  });

  // Terminal logging utility
  function log(text, type = '') {
    const line = document.createElement('div');
    line.className = `log-line ${type ? 'text-' + type : ''}`;
    
    // Add timestamp
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    line.textContent = `[${timeStr}] ${text}`;
    
    terminalLogs.appendChild(line);
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
  }

  function clearLogs() {
    terminalLogs.innerHTML = '';
  }

  const COBALT_MIRRORS = [
    'https://api.cobalt.tools',
    'https://cobalt.api.ryz.cx',
    'https://cobalt-api.kwiateknadziany.pl',
    'https://cobalt.api.g45.su'
  ];

  // API Call - Cobalt Integration
  btnDownload.addEventListener('click', async () => {
    const rawUrl = urlInput.value.trim();
    
    if (!rawUrl) {
      log('[ERROR] Input field is empty. Please enter a valid link.', 'error');
      return;
    }

    // Disable button to prevent double submits
    btnDownload.classList.add('disabled');
    btnDownload.disabled = true;
    clearLogs();
    
    terminalProgress.style.display = 'block';
    downloadProgressFill.style.width = '10%';

    log('[SYSTEM] Starting media fetch operations...', 'muted');
    log(`[INFO] URL Target: ${rawUrl}`);
    log(`[INFO] Format Requested: ${downloadFormat === 'audio' ? 'MP3 Audio' : 'MP4 Video (' + qualitySelect.value + 'p)'}`);

    const isAudioOnly = downloadFormat === 'audio';
    const payload = {
      url: rawUrl,
      videoQuality: qualitySelect.value,
      audioFormat: 'mp3',
      isAudioOnly: isAudioOnly,
      filenamePattern: 'classic'
    };

    let success = false;
    const customOverride = apiInstanceInput.value.trim();
    const mirrorsToTry = customOverride ? [customOverride] : COBALT_MIRRORS;
    
    log(`[SYSTEM] Node pool loaded with ${mirrorsToTry.length} mirror(s).`, 'muted');

    for (let i = 0; i < mirrorsToTry.length; i++) {
      const currentMirror = mirrorsToTry[i];
      log(`[SYSTEM] [Attempt ${i + 1}/${mirrorsToTry.length}] Accessing converter node: ${currentMirror}...`, 'muted');
      downloadProgressFill.style.width = `${20 + i * 15}%`;

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
          throw new Error(`HTTP Error status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'error') {
          log(`[WARNING] Mirror returned error: ${data.text || 'Conversion failed'}. Rotating...`, 'warning');
          continue;
        }

        if (data.status === 'success' || data.status === 'stream' || data.status === 'redirect') {
          const dlUrl = data.url;
          log('[SUCCESS] Conversion completed successfully!', 'success');
          log(`[SUCCESS] Downloader Payload Stream: ${dlUrl.substring(0, 60)}...`, 'success');
          log('[SYSTEM] Opening file in browser to begin download...', 'muted');
          
          downloadProgressFill.style.width = '100%';
          
          // Trigger browser download by opening the stream link
          const a = document.createElement('a');
          a.href = dlUrl;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Smart learn successful mirror
          if (!customOverride) {
            localStorage.setItem('cobalt_instance', currentMirror);
          }
          
          success = true;
          break; // Exit the retry loop
        } else if (data.url) {
          log('[SUCCESS] Extracted file stream from fallback data format.', 'success');
          window.open(data.url, '_blank');
          if (!customOverride) {
            localStorage.setItem('cobalt_instance', currentMirror);
          }
          success = true;
          break;
        }
      } catch (err) {
        log(`[WARNING] Node connection failed: ${currentMirror}. Error: ${err.message || err}`, 'warning');
      }
    }

    if (!success) {
      log('[ERROR] All available converter nodes in the mirror pool failed.', 'error');
      log('[TIP] Enter a custom API endpoint in Advanced Settings or check your connection.', 'muted');
      downloadProgressFill.style.width = '0%';
    }

    // Re-enable trigger
    btnDownload.classList.remove('disabled');
    btnDownload.disabled = false;
  });
});
