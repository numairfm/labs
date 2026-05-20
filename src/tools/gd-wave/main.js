import { initTheme, toggleTheme } from '../../assets/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  
  const playUI = document.getElementById('play-ui');
  const btnToggleHitboxes = document.getElementById('btn-toggle-hitboxes');
  const btnReturnEditor = document.getElementById('btn-return-editor');

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
  const FORGIVENESS_MARGIN = 6; // Hitbox reduction for forgiving gameplay
  const CEILING_Y = 0;
  const FLOOR_Y = 15 * GRID_SIZE; // 600px

  let mode = 'edit'; // 'edit' or 'play'
  let state = 'playing'; // 'playing' or 'crashed'
  let showHitboxes = false;
  
  let camera = { x: 0, y: 0 };
  let player = {
    x: 200,
    y: FLOOR_Y / 2,
    size: 16, // Visual size of wave triangle
    isHolding: false,
    isMini: false,
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
      camera.y = -(canvas.height / 2 - FLOOR_Y/2);
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

  btnToggleHitboxes.addEventListener('click', () => {
    showHitboxes = !showHitboxes;
    btnToggleHitboxes.classList.toggle('primary');
    btnToggleHitboxes.classList.toggle('outline');
  });

  function startPlayMode() {
    mode = 'play';
    state = 'playing';
    editorUI.classList.add('hidden');
    playUI.style.display = 'flex';
    
    player.x = 200;
    player.y = FLOOR_Y / 2;
    player.isHolding = false;
    player.isMini = false;
    player.trail = [{x: player.x, y: player.y}];
    camera.x = 0;
    camera.y = 0; // Lock camera to borders
    crashOverlay.style.display = 'none';
  }

  function startEditMode() {
    mode = 'edit';
    editorUI.classList.remove('hidden');
    playUI.style.display = 'none';
    crashOverlay.style.display = 'none';
    
    // Reset Camera for Edit
    camera.x = 0;
    camera.y = -(canvas.height / 2 - FLOOR_Y/2);
  }

  btnToggleMode.addEventListener('click', startPlayMode);
  btnReturnEditor.addEventListener('click', startEditMode);

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
  
  let panStart = { x: 0, y: 0, camX: 0, camY: 0 };
  let isPanning = false;

  canvas.addEventListener('pointerdown', (e) => {
    if (mode === 'play') {
      if (state === 'crashed') {
        startPlayMode(); // restart
      } else {
        player.isHolding = true;
      }
    } else {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) { 
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

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && mode === 'play') {
      e.preventDefault();
      if (state === 'crashed') {
        startPlayMode();
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
    const worldX = clientX + camera.x;
    const worldY = clientY + camera.y;

    const cellX = Math.floor(worldX / GRID_SIZE);
    const cellY = Math.floor(worldY / GRID_SIZE);

    if (cellX === lastDrawCell.x && cellY === lastDrawCell.y) return; 
    lastDrawCell = { x: cellX, y: cellY };

    // Remove existing
    levelData = levelData.filter(obj => !(obj.x === cellX && obj.y === cellY));

    if (currentTool !== 'eraser') {
      levelData.push({
        type: currentTool,
        x: cellX,
        y: cellY
      });
    }
  }

  // --- PHYSICS ENGINE ---

  function ptInTriangle(p, p0, p1, p2) {
    const A = 1/2 * (-p1.y * p2.x + p0.y * (-p1.x + p2.x) + p0.x * (p1.y - p2.y) + p1.x * p2.y);
    const sign = A < 0 ? -1 : 1;
    const s = (p0.y * p2.x - p0.x * p2.y + (p2.y - p0.y) * p.x + (p0.x - p2.x) * p.y) * sign;
    const t = (p0.x * p1.y - p0.y * p1.x + (p0.y - p1.y) * p.x + (p1.x - p0.x) * p.y) * sign;
    return s > 0 && t > 0 && (s + t) < 2 * A * sign;
  }

  // Exposed for rendering hitboxes
  let currentHitboxes = [];

  function checkCollisions() {
    currentHitboxes = [];
    player.size = player.isMini ? 8 : 16;
    const halfSize = player.size / 2;
    const px = player.x;
    const py = player.y;
    const pm = FORGIVENESS_MARGIN; 
    
    const pBox = {
      left: px - halfSize + pm,
      right: px + halfSize - pm,
      top: py - halfSize + pm,
      bottom: py + halfSize - pm
    };

    currentHitboxes.push({ type: 'aabb', box: pBox, color: 'lime' });

    let isCrashed = false;

    // Apply borders
    if (player.y <= CEILING_Y) {
      player.y = CEILING_Y;
      player.trail[player.trail.length - 1].y = CEILING_Y;
    }
    if (player.y >= FLOOR_Y) {
      player.y = FLOOR_Y;
      player.trail[player.trail.length - 1].y = FLOOR_Y;
    }

    for (let obj of levelData) {
      const ox = obj.x * GRID_SIZE;
      const oy = obj.y * GRID_SIZE;
      
      if (ox > px + 100 || ox + GRID_SIZE * 2 < px - 100) continue;

      if (obj.type === 'portal-normal' || obj.type === 'portal-mini') {
        const pRect = { left: ox + 14, right: ox + 26, top: oy, bottom: oy + GRID_SIZE };
        if (pBox.left < pRect.right && pBox.right > pRect.left && pBox.top < pRect.bottom && pBox.bottom > pRect.top) {
          if (obj.type === 'portal-normal') player.isMini = false;
          if (obj.type === 'portal-mini') player.isMini = true;
        }
        currentHitboxes.push({ type: 'aabb', box: pRect, color: 'purple' });
        continue;
      }

      const gm = pm; // Forgiving margin

      if (obj.type === 'block') {
        const oBox = {
          left: ox + gm,
          right: ox + GRID_SIZE - gm,
          top: oy + gm,
          bottom: oy + GRID_SIZE - gm
        };
        currentHitboxes.push({ type: 'aabb', box: oBox, color: 'red' });
        if (pBox.left < oBox.right && pBox.right > oBox.left && pBox.top < oBox.bottom && pBox.bottom > oBox.top) {
          isCrashed = true;
        }
      } 
      else if (obj.type.startsWith('spike')) {
        let p0, p1, p2;
        if (obj.type === 'spike-up') {
          p0 = { x: ox + GRID_SIZE/2, y: oy + gm }; 
          p1 = { x: ox + gm, y: oy + GRID_SIZE - gm }; 
          p2 = { x: ox + GRID_SIZE - gm, y: oy + GRID_SIZE - gm }; 
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
        currentHitboxes.push({ type: 'triangle', p0, p1, p2, color: 'red' });
        const corners = [{x: pBox.left, y: pBox.top}, {x: pBox.right, y: pBox.top}, {x: pBox.left, y: pBox.bottom}, {x: pBox.right, y: pBox.bottom}, {x: px, y: py}];
        for (let c of corners) if (ptInTriangle(c, p0, p1, p2)) isCrashed = true;
      }
      else if (obj.type.startsWith('slope')) {
        let p0, p1, p2;
        if (obj.type === 'slope-bl') { p0 = {x: ox+gm, y: oy+GRID_SIZE-gm}; p1 = {x: ox+GRID_SIZE-gm, y: oy+GRID_SIZE-gm}; p2 = {x: ox+gm, y: oy+gm}; }
        else if (obj.type === 'slope-br') { p0 = {x: ox+GRID_SIZE-gm, y: oy+GRID_SIZE-gm}; p1 = {x: ox+gm, y: oy+GRID_SIZE-gm}; p2 = {x: ox+GRID_SIZE-gm, y: oy+gm}; }
        else if (obj.type === 'slope-tl') { p0 = {x: ox+gm, y: oy+gm}; p1 = {x: ox+GRID_SIZE-gm, y: oy+gm}; p2 = {x: ox+gm, y: oy+GRID_SIZE-gm}; }
        else if (obj.type === 'slope-tr') { p0 = {x: ox+GRID_SIZE-gm, y: oy+gm}; p1 = {x: ox+gm, y: oy+gm}; p2 = {x: ox+GRID_SIZE-gm, y: oy+GRID_SIZE-gm}; }
        currentHitboxes.push({ type: 'triangle', p0, p1, p2, color: 'red' });
        const corners = [{x: pBox.left, y: pBox.top}, {x: pBox.right, y: pBox.top}, {x: pBox.left, y: pBox.bottom}, {x: pBox.right, y: pBox.bottom}, {x: px, y: py}];
        for (let c of corners) if (ptInTriangle(c, p0, p1, p2)) isCrashed = true;
      }
      else if (obj.type.startsWith('steep')) {
        let p0, p1, p2;
        if (obj.type === 'steep-bl') { p0 = {x: ox+gm, y: oy+(GRID_SIZE*2)-gm}; p1 = {x: ox+GRID_SIZE-gm, y: oy+(GRID_SIZE*2)-gm}; p2 = {x: ox+gm, y: oy+gm}; }
        else if (obj.type === 'steep-br') { p0 = {x: ox+GRID_SIZE-gm, y: oy+(GRID_SIZE*2)-gm}; p1 = {x: ox+gm, y: oy+(GRID_SIZE*2)-gm}; p2 = {x: ox+GRID_SIZE-gm, y: oy+gm}; }
        else if (obj.type === 'steep-tl') { p0 = {x: ox+gm, y: oy-GRID_SIZE+gm}; p1 = {x: ox+GRID_SIZE-gm, y: oy-GRID_SIZE+gm}; p2 = {x: ox+gm, y: oy+GRID_SIZE-gm}; }
        else if (obj.type === 'steep-tr') { p0 = {x: ox+GRID_SIZE-gm, y: oy-GRID_SIZE+gm}; p1 = {x: ox+gm, y: oy-GRID_SIZE+gm}; p2 = {x: ox+GRID_SIZE-gm, y: oy+GRID_SIZE-gm}; }
        currentHitboxes.push({ type: 'triangle', p0, p1, p2, color: 'red' });
        const corners = [{x: pBox.left, y: pBox.top}, {x: pBox.right, y: pBox.top}, {x: pBox.left, y: pBox.bottom}, {x: pBox.right, y: pBox.bottom}, {x: px, y: py}];
        for (let c of corners) if (ptInTriangle(c, p0, p1, p2)) isCrashed = true;
      }
    }
    return isCrashed;
  }

  // --- RENDERING ENGINE ---
  function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const startX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE;
    
    ctx.beginPath();
    for (let x = startX; x < camera.x + canvas.width; x += GRID_SIZE) {
      ctx.moveTo(x - camera.x, 0);
      ctx.lineTo(x - camera.x, canvas.height);
    }
    for (let y = startY; y < camera.y + canvas.height; y += GRID_SIZE) {
      ctx.moveTo(0, y - camera.y);
      ctx.lineTo(canvas.width, y - camera.y);
    }
    ctx.stroke();
  }

  function drawLevel() {
    // Draw Borders
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, canvas.width, CEILING_Y - camera.y); // Ceiling
    ctx.fillRect(0, FLOOR_Y - camera.y, canvas.width, canvas.height - (FLOOR_Y - camera.y)); // Floor
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CEILING_Y - camera.y); ctx.lineTo(canvas.width, CEILING_Y - camera.y);
    ctx.moveTo(0, FLOOR_Y - camera.y); ctx.lineTo(canvas.width, FLOOR_Y - camera.y);
    ctx.stroke();

    for (let obj of levelData) {
      const screenX = (obj.x * GRID_SIZE) - camera.x;
      const screenY = (obj.y * GRID_SIZE) - camera.y;

      if (screenX + GRID_SIZE * 2 < 0 || screenX > canvas.width) continue;
      if (screenY + GRID_SIZE * 2 < 0 || screenY > canvas.height) continue;

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
        if (obj.type === 'spike-up') { ctx.moveTo(screenX + GRID_SIZE/2, screenY); ctx.lineTo(screenX, screenY + GRID_SIZE); ctx.lineTo(screenX + GRID_SIZE, screenY + GRID_SIZE); } 
        else if (obj.type === 'spike-down') { ctx.moveTo(screenX + GRID_SIZE/2, screenY + GRID_SIZE); ctx.lineTo(screenX, screenY); ctx.lineTo(screenX + GRID_SIZE, screenY); } 
        else if (obj.type === 'spike-left') { ctx.moveTo(screenX, screenY + GRID_SIZE/2); ctx.lineTo(screenX + GRID_SIZE, screenY); ctx.lineTo(screenX + GRID_SIZE, screenY + GRID_SIZE); } 
        else if (obj.type === 'spike-right') { ctx.moveTo(screenX + GRID_SIZE, screenY + GRID_SIZE/2); ctx.lineTo(screenX, screenY); ctx.lineTo(screenX, screenY + GRID_SIZE); }
        ctx.fill(); ctx.closePath();
      }
      else if (obj.type.startsWith('slope')) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (obj.type === 'slope-bl') { ctx.moveTo(screenX, screenY + GRID_SIZE); ctx.lineTo(screenX + GRID_SIZE, screenY + GRID_SIZE); ctx.lineTo(screenX, screenY); }
        else if (obj.type === 'slope-br') { ctx.moveTo(screenX + GRID_SIZE, screenY + GRID_SIZE); ctx.lineTo(screenX, screenY + GRID_SIZE); ctx.lineTo(screenX + GRID_SIZE, screenY); }
        else if (obj.type === 'slope-tl') { ctx.moveTo(screenX, screenY); ctx.lineTo(screenX + GRID_SIZE, screenY); ctx.lineTo(screenX, screenY + GRID_SIZE); }
        else if (obj.type === 'slope-tr') { ctx.moveTo(screenX + GRID_SIZE, screenY); ctx.lineTo(screenX, screenY); ctx.lineTo(screenX + GRID_SIZE, screenY + GRID_SIZE); }
        ctx.fill(); ctx.closePath();
      }
      else if (obj.type.startsWith('steep')) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (obj.type === 'steep-bl') { ctx.moveTo(screenX, screenY + GRID_SIZE*2); ctx.lineTo(screenX + GRID_SIZE, screenY + GRID_SIZE*2); ctx.lineTo(screenX, screenY); }
        else if (obj.type === 'steep-br') { ctx.moveTo(screenX + GRID_SIZE, screenY + GRID_SIZE*2); ctx.lineTo(screenX, screenY + GRID_SIZE*2); ctx.lineTo(screenX + GRID_SIZE, screenY); }
        else if (obj.type === 'steep-tl') { ctx.moveTo(screenX, screenY - GRID_SIZE); ctx.lineTo(screenX + GRID_SIZE, screenY - GRID_SIZE); ctx.lineTo(screenX, screenY + GRID_SIZE); }
        else if (obj.type === 'steep-tr') { ctx.moveTo(screenX + GRID_SIZE, screenY - GRID_SIZE); ctx.lineTo(screenX, screenY - GRID_SIZE); ctx.lineTo(screenX + GRID_SIZE, screenY + GRID_SIZE); }
        ctx.fill(); ctx.closePath();
      }
      else if (obj.type.startsWith('portal')) {
        ctx.strokeStyle = obj.type === 'portal-mini' ? '#c084fc' : '#4ade80';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(screenX + GRID_SIZE/2, screenY + GRID_SIZE/2, 12, GRID_SIZE/2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawPlayer() {
    ctx.strokeStyle = player.isMini ? 'rgba(192, 132, 252, 0.6)' : 'rgba(100, 150, 255, 0.6)';
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

    const screenPx = player.x - camera.x;
    const screenPy = player.y - camera.y;

    ctx.save();
    ctx.translate(screenPx, screenPy);
    
    // Pitch is steeper if mini wave (approx 63.4 degrees) vs 45 degrees
    const pitch = player.isMini ? 1.107 : Math.PI/4; 
    const angle = player.isHolding ? -pitch : pitch;
    ctx.rotate(angle);
    
    ctx.fillStyle = player.isMini ? '#c084fc' : '#6496ff';
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

  function drawDebugHitboxes() {
    ctx.lineWidth = 2;
    for (let hb of currentHitboxes) {
      ctx.strokeStyle = hb.color;
      ctx.beginPath();
      if (hb.type === 'aabb') {
        ctx.rect(hb.box.left - camera.x, hb.box.top - camera.y, hb.box.right - hb.box.left, hb.box.bottom - hb.box.top);
      } else if (hb.type === 'triangle') {
        ctx.moveTo(hb.p0.x - camera.x, hb.p0.y - camera.y);
        ctx.lineTo(hb.p1.x - camera.x, hb.p1.y - camera.y);
        ctx.lineTo(hb.p2.x - camera.x, hb.p2.y - camera.y);
        ctx.closePath();
      }
      ctx.stroke();
    }
  }

  // --- MAIN LOOP ---
  function loop(time) {
    if (!lastTime) lastTime = time;
    let dt = (time - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; 
    lastTime = time;

    // UPDATE
    if (mode === 'play' && state === 'playing') {
      const dx = WAVE_SPEED_X * dt;
      player.x += dx;
      camera.x += dx; 
      
      const speedY = player.isMini ? WAVE_SPEED_X * 2 : WAVE_SPEED_X;
      if (player.isHolding) {
        player.y -= speedY * dt;
      } else {
        player.y += speedY * dt;
      }

      player.trail.push({x: player.x, y: player.y});
      if (player.trail.length > 50) player.trail.shift();

      if (checkCollisions()) {
        state = 'crashed';
        crashOverlay.style.display = 'flex';
      }
    }

    // DRAW
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (mode === 'edit') {
      drawGrid();
    }
    
    drawLevel();
    
    if (mode === 'play') {
      drawPlayer();
      if (showHitboxes) drawDebugHitboxes();
    }

    animationFrameId = requestAnimationFrame(loop);
  }

  animationFrameId = requestAnimationFrame(loop);
});
