import { initTheme, toggleTheme } from './assets/js/utils.js';
import toolsRegistry from './assets/js/manifest.json';

// High-fidelity neo-brutalist SVG symbols matching the boutique styling (2.5px strokes, square caps)
const SVG_ICONS = {
  'image-compressor': `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
      <rect x="3" y="3" width="18" height="18"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  `,
  'unit-converter': `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
      <polyline points="17 4 22 9 17 14"></polyline>
      <path d="M22 9H2"></path>
      <polyline points="7 20 2 15 7 10"></polyline>
      <path d="M2 15H22"></path>
    </svg>
  `,
  'drum-pad': `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
    </svg>
  `,
  'synth-keyboard': `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
      <rect x="3" y="3" width="18" height="18"></rect>
      <path d="M9 3v18M15 3v18"></path>
      <path d="M8 3v10h2V3M14 3v10h2V3"></path>
    </svg>
  `,
  'ambient-noise': `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    </svg>
  `,
  'pomodoro': `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
      <line x1="12" y1="2" x2="12" y2="4"></line>
    </svg>
  `,
  'qr-encoder': `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
      <rect x="14" y="14" width="3" height="3"></rect>
      <rect x="18" y="18" width="3" height="3"></rect>
      <rect x="14" y="18" width="3" height="3"></rect>
      <rect x="18" y="14" width="3" height="3"></rect>
    </svg>
  `,
  'default': `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
      <rect x="3" y="3" width="18" height="18"></rect>
      <line x1="9" y1="9" x2="15" y2="15"></line>
      <line x1="15" y1="9" x2="9" y2="15"></line>
    </svg>
  `
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme Setup
  initTheme();
  
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }

  const searchBar = document.getElementById('search-bar');
  const toolsGrid = document.getElementById('tools-grid');
  const chipsContainer = document.getElementById('filter-chips');
  const chips = chipsContainer ? chipsContainer.querySelectorAll('.chip') : [];
  
  let currentCategory = 'All';
  let searchQuery = '';

  // Helper for assigning premium category badges
  function getBadgeClass(category) {
    switch (category) {
      case 'Media':
        return 'badge-blue';
      case 'Utilities':
        return 'badge-teal';
      default:
        return 'badge-red';
    }
  }

  // Get hardcoded SVG symbol block based on tool ID
  function getToolIconSvg(toolId) {
    return SVG_ICONS[toolId] || SVG_ICONS['default'];
  }

  // 2. Render Cards Loop
  function renderTools() {
    if (!toolsGrid) return;
    toolsGrid.innerHTML = '';
    
    const filtered = toolsRegistry.filter(tool => {
      const matchesCategory = currentCategory === 'All' || tool.category === currentCategory;
      const matchesSearch = 
        tool.name.toLowerCase().includes(searchQuery) ||
        tool.description.toLowerCase().includes(searchQuery) ||
        (tool.tags && tool.tags.some(tag => tag.toLowerCase().includes(searchQuery)));
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      toolsGrid.innerHTML = `
        <div class="empty-state">
          <p>No tools match the query.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(tool => {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = `./tools/${tool.id}/index.html`;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span class="badge ${getBadgeClass(tool.category)}">${tool.category}</span>
          <span style="color: var(--text-secondary); display: inline-flex; align-items: center;">
            ${getToolIconSvg(tool.id)}
          </span>
        </div>
        <h3>${tool.name}</h3>
        <p>${tool.description}</p>
      `;
      toolsGrid.appendChild(card);
    });
  }

  // 3. Bind Search Listener
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderTools();
    });
  }

  // 4. Bind Category Filtering Chips
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.dataset.category || 'All';
      renderTools();
    });
  });

  // 5. Initial Draw
  renderTools();
});
