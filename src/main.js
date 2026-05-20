import { initTheme, toggleTheme } from './assets/js/utils.js';
import toolsRegistry from './assets/js/manifest.json';

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
          <p>No tools matched your query.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(tool => {
      const card = document.createElement('a');
      card.className = 'card card-glass';
      card.href = `./tools/${tool.id}/index.html`;

      // Visual layout matching premium glassmorphic cards
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span class="badge ${getBadgeClass(tool.category)}">${tool.category}</span>
          <span style="font-size: 1.25rem;">${tool.icon || '🛠️'}</span>
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
