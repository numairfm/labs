// Jukebox Common SDK Utilities

// 1. Unified Theme Management with Exception Safeguards
export function initTheme() {
  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch (e) {
    console.warn('Failed to access localStorage for theme retrieval:', e);
  }
  document.documentElement.setAttribute('data-theme', savedTheme);
  return savedTheme;
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const target = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', target);
  try {
    localStorage.setItem('theme', target);
  } catch (e) {
    console.warn('Failed to write to localStorage for theme update:', e);
  }
  return target;
}

// 2. Drag & Drop Visual Handler Wrapper (Flicker-Free Counter closure)
export function setupDragDrop(zoneElement, onFilesLoaded) {
  let dragCounter = 0;

  zoneElement.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    zoneElement.classList.add('drag-active');
  }, false);

  zoneElement.addEventListener('dragover', (e) => {
    e.preventDefault();
  }, false);

  zoneElement.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      zoneElement.classList.remove('drag-active');
    }
  }, false);

  zoneElement.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    zoneElement.classList.remove('drag-active');
    
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      onFilesLoaded(dt.files);
    }
  }, false);
}

// 3. Simple Beautiful Dynamic Toast Alerts (a11y-compliant & self-contained fallback styles)
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

  // Cap visible toasts to prevent vertical clutter & memory load
  if (container.children.length >= 5) {
    const oldest = container.children[0];
    oldest.style.opacity = '0';
    oldest.style.transform = 'translateY(-10px)';
    setTimeout(() => oldest.remove(), 300);
  }

  const toast = document.createElement('div');
  const color = type === 'error' ? 'var(--accent-red, #ef4444)' : 'var(--accent-teal, #0d9488)';
  
  // Accessibility (a11y) markup
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  // Styled with premium Glassmorphism + safe visual fallback properties
  toast.style.cssText = `
    background: var(--glass-bg, rgba(255, 255, 255, 0.95));
    backdrop-filter: blur(var(--blur-amount, 12px));
    -webkit-backdrop-filter: blur(var(--blur-amount, 12px));
    border: 1px solid var(--glass-border, rgba(0, 0, 0, 0.08));
    border-left: 4px solid ${color};
    color: var(--text-primary, #111827);
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: var(--shadow-main, 0 4px 20px rgba(0, 0, 0, 0.08));
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
