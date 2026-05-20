import { initTheme, toggleTheme } from '../../assets/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  
  const editorUI = document.getElementById('editor-ui');
  const btnToggleMode = document.getElementById('btn-toggle-mode');
  const toolBtns = document.querySelectorAll('.tool-btn');
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const fileImport = document.getElementById('file-import');
  const crashOverlay = document.getElementById('crash-overlay');

  // --- ENGINE CONSTANTS & STATE ---
  const GRID_SIZE = 40;
  const WAVE_SPEED_X = 400; // pixels per second
  const WAVE_SPEED_Y = 400; // diagonal means Y speed = X speed
  const FORGIVENESS_MARGIN = 6; // Hitbox reduction for forgiving gameplay

  let mode = 'edit'; // 'edit' or 'play'
  let state = 'playing'; // 'playing' or 'crashed'
  
  let camera = { x: 0, y: 0 };
  let player = {
    x: 200,
    y: 0,
    size: 16, // Visual size of wave triangle
    isHolding: false,
    trail: []
  };

  let levelData = [];
  let currentTool = 'block';
  let isDragging = false;
  let lastDrawCell = { x: -1, y: -1 };

  let lastTime = 0;
  let animationFrameId;

  // --- RESIZE HANDLING ---
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (mode === 'edit') {
      // Center camera vertically on resize
      camera.y = -canvas.height / 2;
    }
  }
  window.addEventListener('resize', resize);
  resize();

  // --- UI EVENT LISTENERS ---
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
    });
  });

  btnToggleMode.addEventListener('click', () => {
    if (mode === 'edit') {
      // Switch to Play
      mode = 'play';
      state = 'playing';
      btnToggleMode.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg> STOP PLAYING';
      btnToggleMode.classList.replace('primary', 'outline');
      editorUI.classList.add('hidden'); // Hide editor tools during play
      
      // Setup Player Start
      player.x = 200;
      player.y = canvas.height / 2;
      player.isHolding = false;
      player.trail = [{x: player.x, y: player.y}];
      camera.x = 0;
      camera.y = 0; // Lock camera
      crashOverlay.style.display = 'none';
      
    } else {
      // Switch to Edit
      mode = 'edit';
      btnToggleMode.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> PLAY LEVEL';
      btnToggleMode.classList.replace('outline', 'primary');
      editorUI.classList.remove('hidden');
      crashOverlay.style.display = 'none';
      
      // Reset Camera for Edit
      camera.x = 0;
      camera.y = -canvas.height / 2;
    }
  });

  // Export / Import JSON
  btnExport.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(levelData));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "level.json";
    a.click();
  });

  btnImport.addEventListener('click', () => fileImport.click());
  fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          levelData = JSON.parse(evt.target.result);
        } catch (err) {
          alert("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    }
  });

  // --- INPUT HANDLING ---
  
  // Track panning in edit mode
  let panStart = { x: 0, y: 0, camX: 0, camY: 0 };
  let isPanning = false;

  canvas.addEventListener('pointerdown', (e) => {
    if (mode === 'play') {
      if (state === 'crashed') {
        // Restart level
        state = 'playing';
        player.x = 200;
        player.y = canvas.height / 2;
        player.trail = [{x: player.x, y: player.y}];
        camera.x = 0;
        crashOverlay.style.display = 'none';
      } else {
        player.isHolding = true;
      }
    } else {
      // Edit Mode
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) { // Middle click or Shift+Left to pan
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY, camX: camera.x, camY: camera.y };
      } else if (e.button === 0) {
        isDragging = true;
        handleEditorAction(e.clientX, e.clientY);
      }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (mode === 'edit') {
      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        camera.x = panStart.camX - dx;
        camera.y = panStart.camY - dy;
      } else if (isDragging) {
        handleEditorAction(e.clientX, e.clientY);
      }
    }
  });

  window.addEventListener('pointerup', () => {
    player.isHolding = false;
    isDragging = false;
    isPanning = false;
    lastDrawCell = { x: -1, y: -1 };
  });

  // Keyboard input for Play mode
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && mode === 'play') {
      e.preventDefault();
      if (state === 'crashed') {
        // Restart level
        state = 'playing';
        player.x = 200;
        player.y = canvas.height / 2;
        player.trail = [{x: player.x, y: player.y}];
        camera.x = 0;
        crashOverlay.style.display = 'none';
      } else {
        player.isHolding = true;
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') player.isHolding = false;
  });

  // --- EDITOR LOGIC ---
  function handleEditorAction(clientX, clientY) {
    // Convert screen coordinates to world coordinates
    const worldX = clientX + camera.x;
    const worldY = clientY + camera.y;

    // Convert to grid cell
    const cellX = Math.floor(worldX / GRID_SIZE);
    const cellY = Math.floor(worldY / GRID_SIZE);

    if (cellX === lastDrawCell.x && cellY === lastDrawCell.y) return; // Prevent duplicate work
    lastDrawCell = { x: cellX, y: cellY };

    // Remove existing object at this cell
    levelData = levelData.filter(obj => !(obj.x === cellX && obj.y === cellY));

    // Place new object if not eraser
    if (currentTool !== 'eraser') {
      levelData.push({
        type: currentTool,
        x: cellX,
        y: cellY
      });
    }
  }

  // --- PHYSICS ENGINE ---

  // Check if a point is inside a triangle (A, B, C)
  function ptInTriangle(p, p0, p1, p2) {
    const A = 1/2 * (-p1.y * p2.x + p0.y * (-p1.x + p2.x) + p0.x * (p1.y - p2.y) + p1.x * p2.y);
    const sign = A < 0 ? -1 : 1;
    const s = (p0.y * p2.x - p0.x * p2.y + (p2.y - p0.y) * p.x + (p0.x - p2.x) * p.y) * sign;
    const t = (p0.x * p1.y - p0.y * p1.x + (p0.y - p1.y) * p.x + (p1.x - p0.x) * p.y) * sign;
    return s > 0 && t > 0 && (s + t) < 2 * A * sign;
  }

  function checkCollisions() {
    // Player world boundaries
    const halfSize = player.size / 2;
    // We apply forgiveness margin to the player size for AABB vs AABB checks
    const px = player.x;
    const py = player.y;
    const pm = FORGIVENESS_MARGIN; 
    
    // Player AABB with margin
    const pBox = {
      left: px - halfSize + pm,
      right: px + halfSize - pm,
      top: py - halfSize + pm,
      bottom: py + halfSize - pm
    };

    // Check floor/ceiling crash
    if (py > canvas.height || py < 0) return true;

    for (let obj of levelData) {
      // Calculate object world position
      const ox = obj.x * GRID_SIZE;
      const oy = obj.y * GRID_SIZE;
      
      // Skip if completely out of player X range
      if (ox > px + 100 || ox + GRID_SIZE < px - 100) continue;

      if (obj.type === 'block') {
        const oBox = {
          left: ox + pm,
          right: ox + GRID_SIZE - pm,
          top: oy + pm,
          bottom: oy + GRID_SIZE - pm
        };
        // AABB check
        if (pBox.left < oBox.right && pBox.right > oBox.left && pBox.top < oBox.bottom && pBox.bottom > oBox.top) {
          return true;
        }
      } 
      else if (obj.type.startsWith('spike')) {
        // Build spike triangle
        let p0, p1, p2;
        const gm = pm; // Forgiving margin for spike
        if (obj.type === 'spike-up') {
          p0 = { x: ox + GRID_SIZE/2, y: oy + gm }; // Tip
          p1 = { x: ox + gm, y: oy + GRID_SIZE - gm }; // Bottom left
          p2 = { x: ox + GRID_SIZE - gm, y: oy + GRID_SIZE - gm }; // Bottom right
        } else if (obj.type === 'spike-down') {
          p0 = { x: ox + GRID_SIZE/2, y: oy + GRID_SIZE - gm };
          p1 = { x: ox + gm, y: oy + gm };
          p2 = { x: ox + GRID_SIZE - gm, y: oy + gm };
        } else if (obj.type === 'spike-left') {
          p0 = { x: ox + gm, y: oy + GRID_SIZE/2 };
          p1 = { x: ox + GRID_SIZE - gm, y: oy + gm };
          p2 = { x: ox + GRID_SIZE - gm, y: oy + GRID_SIZE - gm };
        } else if (obj.type === 'spike-right') {
          p0 = { x: ox + GRID_SIZE - gm, y: oy + GRID_SIZE/2 };
          p1 = { x: ox + gm, y: oy + gm };
          p2 = { x: ox + gm, y: oy + GRID_SIZE - gm };
        }

        // Simplistic check: Check if player center is in triangle (very forgiving), 
        // and check if player AABB corners are in triangle.
        const corners = [
          {x: pBox.left, y: pBox.top},
          {x: pBox.right, y: pBox.top},
          {x: pBox.left, y: pBox.bottom},
          {x: pBox.right, y: pBox.bottom},
          {x: px, y: py}
        ];
        
        for (let corner of corners) {
          if (ptInTriangle(corner, p0, p1, p2)) return true;
        }
      }
    }
    return false;
  }

  // --- RENDERING ENGINE ---
  function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const startX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE;
    
    ctx.beginPath();
    // Vertical lines
    for (let x = startX; x < camera.x + canvas.width; x += GRID_SIZE) {
      ctx.moveTo(x - camera.x, 0);
      ctx.lineTo(x - camera.x, canvas.height);
    }
    // Horizontal lines
    for (let y = startY; y < camera.y + canvas.height; y += GRID_SIZE) {
      ctx.moveTo(0, y - camera.y);
      ctx.lineTo(canvas.width, y - camera.y);
    }
    ctx.stroke();

    // Center line highlight
    if (mode === 'edit') {
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -camera.y);
      ctx.lineTo(canvas.width, -camera.y);
      ctx.stroke();
    }
  }

  function drawLevel() {
    for (let obj of levelData) {
      const screenX = (obj.x * GRID_SIZE) - camera.x;
      const screenY = (obj.y * GRID_SIZE) - camera.y;

      // Frustum culling
      if (screenX + GRID_SIZE < 0 || screenX > canvas.width) continue;
      if (screenY + GRID_SIZE < 0 || screenY > canvas.height) continue;

      if (obj.type === 'block') {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 2;
        ctx.fillRect(screenX, screenY, GRID_SIZE, GRID_SIZE);
        ctx.strokeRect(screenX, screenY, GRID_SIZE, GRID_SIZE);
      } 
      else if (obj.type.startsWith('spike')) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (obj.type === 'spike-up') {
          ctx.moveTo(screenX + GRID_SIZE/2, screenY);
          ctx.lineTo(screenX, screenY + GRID_SIZE);
          ctx.lineTo(screenX + GRID_SIZE, screenY + GRID_SIZE);
        } else if (obj.type === 'spike-down') {
          ctx.moveTo(screenX + GRID_SIZE/2, screenY + GRID_SIZE);
          ctx.lineTo(screenX, screenY);
          ctx.lineTo(screenX + GRID_SIZE, screenY);
        } else if (obj.type === 'spike-left') {
          ctx.moveTo(screenX, screenY + GRID_SIZE/2);
          ctx.lineTo(screenX + GRID_SIZE, screenY);
          ctx.lineTo(screenX + GRID_SIZE, screenY + GRID_SIZE);
        } else if (obj.type === 'spike-right') {
          ctx.moveTo(screenX + GRID_SIZE, screenY + GRID_SIZE/2);
          ctx.lineTo(screenX, screenY);
          ctx.lineTo(screenX, screenY + GRID_SIZE);
        }
        ctx.fill();
        ctx.closePath();
      }
    }
  }

  function drawPlayer() {
    // Draw trail
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < player.trail.length; i++) {
      const screenX = player.trail[i].x - camera.x;
      const screenY = player.trail[i].y - camera.y;
      if (i === 0) ctx.moveTo(screenX, screenY);
      else ctx.lineTo(screenX, screenY);
    }
    ctx.stroke();

    // Draw player Wave (triangle facing direction of movement)
    const screenPx = player.x - camera.x;
    const screenPy = player.y - camera.y;

    ctx.save();
    ctx.translate(screenPx, screenPy);
    // Pitch visually matches direction (45 deg = PI/4)
    const angle = player.isHolding ? -Math.PI/4 : Math.PI/4;
    ctx.rotate(angle);
    
    ctx.fillStyle = '#6496ff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const s = player.size;
    ctx.moveTo(s, 0);
    ctx.lineTo(-s, -s);
    ctx.lineTo(-s, s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }

  // --- MAIN LOOP ---
  function loop(time) {
    if (!lastTime) lastTime = time;
    let dt = (time - lastTime) / 1000;
    // Cap dt to prevent massive jumps if tab is backgrounded
    if (dt > 0.1) dt = 0.1; 
    lastTime = time;

    // UPDATE
    if (mode === 'play' && state === 'playing') {
      // Move player and camera forward
      const dx = WAVE_SPEED_X * dt;
      player.x += dx;
      camera.x += dx; // Lock camera to player X
      
      // Move player Y (diagonal)
      if (player.isHolding) {
        player.y -= WAVE_SPEED_Y * dt;
      } else {
        player.y += WAVE_SPEED_Y * dt;
      }

      // Record trail (keep last 50 points)
      player.trail.push({x: player.x, y: player.y});
      if (player.trail.length > 50) player.trail.shift();

      // Check Physics
      if (checkCollisions()) {
        state = 'crashed';
        crashOverlay.style.display = 'flex';
      }
    }

    // DRAW
    // Clear screen
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (mode === 'edit') {
      drawGrid();
    }
    
    drawLevel();
    
    if (mode === 'play') {
      drawPlayer();
    }

    animationFrameId = requestAnimationFrame(loop);
  }

  // Start engine
  animationFrameId = requestAnimationFrame(loop);
});
