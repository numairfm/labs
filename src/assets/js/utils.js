// Jukebox Common SDK Utilities

// 1. Unified Theme Management
export function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  return savedTheme;
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const target = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', target);
  localStorage.setItem('theme', target);
  return target;
}

// 2. Drag & Drop Visual Handler Wrapper
export function setupDragDrop(zoneElement, onFilesLoaded) {
  ['dragenter', 'dragover'].forEach(eventName => {
    zoneElement.addEventListener(eventName, (e) => {
      e.preventDefault();
      zoneElement.classList.add('drag-active');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    zoneElement.addEventListener(eventName, (e) => {
      e.preventDefault();
      zoneElement.classList.remove('drag-active');
    }, false);
  });

  zoneElement.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      onFilesLoaded(files);
    }
  }, false);
}

// 3. Simple Beautiful Dynamic Toast Alerts
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 9999;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const color = type === 'error' ? 'var(--accent-red)' : 'var(--accent-teal)';
  
  // Custom styled with glassmorphism to look premium
  toast.style.cssText = `
    background: var(--glass-bg);
    backdrop-filter: blur(var(--blur-amount));
    -webkit-backdrop-filter: blur(var(--blur-amount));
    border: 1px solid var(--glass-border);
    border-left: 4px solid ${color};
    color: var(--text-primary);
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: var(--shadow-main);
    font-size: 0.9rem;
    font-weight: 500;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s ease;
  `;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger micro-animation
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);

  // Automatically remove after 3.5s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
