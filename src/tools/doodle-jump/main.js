import { initTheme, toggleTheme } from '../../assets/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('start-btn');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best-score');
  const overlayInner = overlay.querySelector('.overlay-inner h2');
  const overlayMsg = overlay.querySelector('.overlay-inner p');

  // ── Config ──────────────────────────────────────────
  const W = 360;
  const H = 600;
  canvas.width = W;
  canvas.height = H;

  const GRAVITY = 0.35;
  const JUMP_VEL = -11;
  const MOVE_SPEED = 4.5;
  const PLATFORM_W = 64;
  const PLATFORM_H = 10;
  const PLAYER_W = 36;
  const PLAYER_H = 28;
  const PLATFORM_SPACING_Y = 90; // average vertical gap between platforms

  // ── State ────────────────────────────────────────────
  let player, platforms, cameraY, score, best, gameRunning, animId, keys;
  best = parseInt(localStorage.getItem('doodle-best') || '0');
  bestEl.textContent = best;

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function colors() {
    return isDark()
      ? {
          bg: '#12122a',
          gridLine: 'rgba(80,80,160,0.15)',
          platform: '#5050a0',
          platformEdge: '#3030a0',
          playerBody: '#70e0a0',
          playerEye: '#001a00',
          playerMouth: '#003000',
          score: '#c0c0ff',
          text: '#8080b0',
        }
      : {
          bg: '#faf6ee',
          gridLine: 'rgba(160,120,64,0.15)',
          platform: '#5a9040',
          platformEdge: '#3a6020',
          playerBody: '#70d060',
          playerEye: '#001000',
          playerMouth: '#002000',
          score: '#3a2010',
          text: '#806040',
        };
  }

  function generatePlatforms(fromY, toY) {
    const plats = [];
    // Starter platform directly under player
    if (fromY === 0) {
      plats.push({ x: W / 2 - PLATFORM_W / 2, y: H * 0.7 });
    }
    let y = fromY === 0 ? H * 0.7 - PLATFORM_SPACING_Y : fromY;
    while (y > toY - PLATFORM_SPACING_Y) {
      const x = Math.random() * (W - PLATFORM_W);
      plats.push({ x, y });
      y -= PLATFORM_SPACING_Y + Math.random() * 30 - 15;
    }
    return plats;
  }

  function resetState() {
    cameraY = 0;
    score = 0;
    keys = {};

    platforms = generatePlatforms(0, -H * 2);

    // Place player on the first platform
    const startPlat = platforms[0];
    player = {
      x: startPlat.x + PLATFORM_W / 2 - PLAYER_W / 2,
      y: startPlat.y - PLAYER_H,
      vx: 0,
      vy: JUMP_VEL,
      facingRight: true,
      jumping: false,
    };
  }

  // ── Input ─────────────────────────────────────────────
  window.addEventListener('keydown', e => { keys[e.key] = true; });
  window.addEventListener('keyup',   e => { keys[e.key] = false; });

  const leftGlow = document.getElementById('left-tap-glow');
  const rightGlow = document.getElementById('right-tap-glow');
  
  function handleScreenTouchStart(e) {
    if (e.target.closest('button') || e.target.closest('a')) return;
    e.preventDefault();
    
    // Clear movement keys initially
    keys['ArrowLeft'] = false;
    keys['ArrowRight'] = false;
    if (leftGlow) leftGlow.classList.remove('active');
    if (rightGlow) rightGlow.classList.remove('active');

    // Check multiple touches for simultaneous triggers
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const screenWidth = window.innerWidth;
      
      if (touch.clientX < screenWidth / 2) {
        keys['ArrowLeft'] = true;
        if (leftGlow) leftGlow.classList.add('active');
      } else {
        keys['ArrowRight'] = true;
        if (rightGlow) rightGlow.classList.add('active');
      }
    }
  }
  
  function handleScreenTouchEnd(e) {
    e.preventDefault();
    keys['ArrowLeft'] = false;
    keys['ArrowRight'] = false;
    if (leftGlow) leftGlow.classList.remove('active');
    if (rightGlow) rightGlow.classList.remove('active');
    
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.clientX < window.innerWidth / 2) {
        keys['ArrowLeft'] = true;
        if (leftGlow) leftGlow.classList.add('active');
      } else {
        keys['ArrowRight'] = true;
        if (rightGlow) rightGlow.classList.add('active');
      }
    }
  }
  
  window.addEventListener('touchstart', handleScreenTouchStart, { passive: false });
  window.addEventListener('touchend', handleScreenTouchEnd, { passive: false });
  window.addEventListener('touchcancel', handleScreenTouchEnd, { passive: false });

  // Mouse emulation for desktop testing of split zones
  window.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    if (e.clientX < window.innerWidth / 2) {
      keys['ArrowLeft'] = true;
      if (leftGlow) leftGlow.classList.add('active');
    } else {
      keys['ArrowRight'] = true;
      if (rightGlow) rightGlow.classList.add('active');
    }
  });

  window.addEventListener('mouseup', () => {
    keys['ArrowLeft'] = false;
    keys['ArrowRight'] = false;
    if (leftGlow) leftGlow.classList.remove('active');
    if (rightGlow) rightGlow.classList.remove('active');
  });


  // ── Update ────────────────────────────────────────────
  function update() {
    // Horizontal movement
    let moveX = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A'])  moveX = -MOVE_SPEED;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) moveX =  MOVE_SPEED;
    player.vx = moveX;
    if (moveX > 0) player.facingRight = true;
    if (moveX < 0) player.facingRight = false;

    // Apply gravity
    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    // Screen wrapping
    if (player.x + PLAYER_W < 0)  player.x = W;
    if (player.x > W)              player.x = -PLAYER_W;

    // Platform collision (only when falling)
    if (player.vy > 0) {
      for (const plat of platforms) {
        const platScreenY = plat.y - cameraY;
        const playerBottom = player.y + PLAYER_H - cameraY;
        const playerLeft = player.x;
        const playerRight = player.x + PLAYER_W;

        const prevBottom = playerBottom - player.vy;
        if (
          prevBottom <= platScreenY &&
          playerBottom >= platScreenY &&
          playerRight > plat.x + 4 &&
          playerLeft  < plat.x + PLATFORM_W - 4
        ) {
          player.vy = JUMP_VEL;
          player.y = plat.y - PLAYER_H;
        }
      }
    }

    // Camera: scroll up as player rises (camera Y = world Y of screen top)
    // camera only moves up (never back down)
    const playerScreenY = player.y - cameraY;
    if (playerScreenY < H * 0.4) {
      const shift = H * 0.4 - playerScreenY;
      cameraY -= shift;
      score = Math.max(score, Math.round(-cameraY / 10));
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        localStorage.setItem('doodle-best', best);
      }
    }

    // Generate more platforms above
    const topPlatY = platforms[platforms.length - 1]?.y ?? 0;
    if (topPlatY > cameraY - H) {
      const newPlats = generatePlatforms(topPlatY, cameraY - H);
      platforms.push(...newPlats);
    }

    // Remove platforms well below the camera
    platforms = platforms.filter(p => p.y < cameraY + H + 100);

    // Game over: player fell below screen
    if (player.y - cameraY > H + 50) {
      gameOver();
    }
  }

  // ── Draw ──────────────────────────────────────────────
  function draw() {
    const c = colors();

    // Background
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    // Notebook grid lines
    ctx.strokeStyle = c.gridLine;
    ctx.lineWidth = 1;
    const gridSize = 30;
    const gridOffsetY = ((-cameraY) % gridSize + gridSize) % gridSize;
    for (let y = gridOffsetY - gridSize; y < H + gridSize; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Platforms
    for (const plat of platforms) {
      const sy = plat.y - cameraY;
      if (sy < -PLATFORM_H || sy > H + PLATFORM_H) continue;

      // Sketchy platform look
      ctx.fillStyle = c.platform;
      ctx.fillRect(plat.x, sy, PLATFORM_W, PLATFORM_H);
      ctx.fillStyle = c.platformEdge;
      ctx.fillRect(plat.x, sy, PLATFORM_W, 3); // top edge highlight
      // Wavy sketch lines
      ctx.strokeStyle = c.platformEdge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plat.x + 4, sy + 6);
      for (let wx = plat.x + 4; wx < plat.x + PLATFORM_W - 4; wx += 8) {
        ctx.lineTo(wx + 4, sy + 4);
        ctx.lineTo(wx + 8, sy + 7);
      }
      ctx.stroke();
    }

    // Player (Doodler frog-like character)
    const px = player.x;
    const py = player.y - cameraY;

    // Body
    ctx.fillStyle = c.playerBody;
    ctx.beginPath();
    ctx.ellipse(px + PLAYER_W/2, py + PLAYER_H/2 + 2, PLAYER_W/2 - 2, PLAYER_H/2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeDir = player.facingRight ? 1 : -1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px + PLAYER_W/2 + eyeDir * 8, py + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.playerEye;
    ctx.beginPath();
    ctx.arc(px + PLAYER_W/2 + eyeDir * 9, py + 8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = c.playerMouth;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const mouthX = px + PLAYER_W/2 + eyeDir * 4;
    ctx.arc(mouthX, py + 17, 4, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Legs
    ctx.fillStyle = c.playerBody;
    ctx.fillRect(px + 4,  py + PLAYER_H - 4, 10, 6);
    ctx.fillRect(px + PLAYER_W - 14, py + PLAYER_H - 4, 10, 6);
  }

  // ── Loop ─────────────────────────────────────────────
  function loop() {
    if (!gameRunning) return;
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  function startGame() {
    resetState();
    overlay.classList.add('hidden');
    gameRunning = true;
    animId = requestAnimationFrame(loop);
  }

  function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animId);
    overlayInner.textContent = 'GAME OVER';
    overlayMsg.textContent = `Height: ${score}`;
    startBtn.textContent = 'PLAY AGAIN';
    overlay.classList.remove('hidden');
    draw();
  }

  startBtn.addEventListener('click', startGame);
  window.addEventListener('keydown', e => {
    if ((e.key === ' ' || e.key === 'Enter') && !gameRunning) {
      e.preventDefault();
      startGame();
    }
  });

  draw();
});
