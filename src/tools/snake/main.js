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
  const lengthEl = document.getElementById('snake-length');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-msg');

  // ── Config ──────────────────────────────────────────
  const CELL = 20;
  const COLS = 25;
  const ROWS = 25;
  const CANVAS_SIZE = CELL * COLS;
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  // Colors
  const COLORS = {
    bg: '#0a0a0f',
    grid: 'rgba(74,222,128,0.04)',
    snakeHead: '#4ade80',
    snakeBody: '#22c55e',
    snakeTail: '#166534',
    food: '#f97316',
    foodGlow: 'rgba(249,115,22,0.6)',
    text: '#4ade80',
  };

  // ── State ────────────────────────────────────────────
  let snake, dir, nextDirQueue, food, score, best, gameRunning, animId, lastTime, elapsed;

  best = parseInt(localStorage.getItem('snake-best') || '0');
  bestEl.textContent = best;

  function resetState() {
    const startX = Math.floor(COLS / 2);
    const startY = Math.floor(ROWS / 2);
    snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    dir = { x: 1, y: 0 };
    nextDirQueue = [];
    score = 0;
    elapsed = 0;
    lastTime = null;
    scoreEl.textContent = '0';
    lengthEl.textContent = snake.length;
    spawnFood();
  }

  function spawnFood() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    food = pos;
  }

  // ── Input: queued direction to prevent instant-reverse death ──
  const TICK_MS = 100; // 10 updates/sec

  window.addEventListener('keydown', (e) => {
    const map = {
      ArrowUp:    { x: 0, y: -1 },
      ArrowDown:  { x: 0, y:  1 },
      ArrowLeft:  { x: -1, y: 0 },
      ArrowRight: { x:  1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y:  1 },
      a: { x: -1, y: 0 },
      d: { x:  1, y: 0 },
      W: { x: 0, y: -1 },
      S: { x: 0, y:  1 },
      A: { x: -1, y: 0 },
      D: { x:  1, y: 0 },
    };
    const newDir = map[e.key];
    if (!newDir) return;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();

    // Add to queue, max 2 buffered inputs
    if (nextDirQueue.length < 2) {
      nextDirQueue.push(newDir);
    }
  });

  // ── Update ───────────────────────────────────────────
  function update() {
    // Process direction queue — validate against current direction to prevent 180 reversal
    while (nextDirQueue.length > 0) {
      const candidate = nextDirQueue.shift();
      // Reject if it's directly opposite to current direction
      if (candidate.x !== -dir.x || candidate.y !== -dir.y) {
        dir = candidate;
        break;
      }
    }

    const head = snake[0];
    const newHead = { x: head.x + dir.x, y: head.y + dir.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      return gameOver();
    }

    // Self collision (ignore the tail which will be removed)
    for (let i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === newHead.x && snake[i].y === newHead.y) return gameOver();
    }

    snake.unshift(newHead);

    // Food eaten?
    if (newHead.x === food.x && newHead.y === food.y) {
      score += 10;
      scoreEl.textContent = score;
      lengthEl.textContent = snake.length;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        localStorage.setItem('snake-best', best);
      }
      spawnFood();
    } else {
      snake.pop();
    }
  }

  // ── Draw ─────────────────────────────────────────────
  function draw() {
    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid dots
    ctx.fillStyle = COLORS.grid;
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        ctx.beginPath();
        ctx.arc(x * CELL + CELL/2, y * CELL + CELL/2, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Food with glow
    ctx.save();
    ctx.shadowColor = COLORS.foodGlow;
    ctx.shadowBlur = 16;
    ctx.fillStyle = COLORS.food;
    ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
    ctx.restore();

    // Snake
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const t = i / snake.length;
      // Gradient from head (bright) to tail (dark)
      if (i === 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(74,222,128,0.8)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = COLORS.snakeHead;
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
        ctx.restore();
        // Eyes
        const eyeOffset = dir.y !== 0 ? [CELL * 0.3, CELL * 0.65] : [CELL * 0.3, CELL * 0.65];
        const eyeY = seg.y * CELL;
        const eyeX = seg.x * CELL;
        ctx.fillStyle = '#000';
        if (dir.x === 1)       { ctx.fillRect(eyeX+CELL-5, eyeY+4,  3, 3); ctx.fillRect(eyeX+CELL-5, eyeY+CELL-7, 3, 3); }
        else if (dir.x === -1) { ctx.fillRect(eyeX+2,      eyeY+4,  3, 3); ctx.fillRect(eyeX+2, eyeY+CELL-7, 3, 3); }
        else if (dir.y === -1) { ctx.fillRect(eyeX+4, eyeY+2,        3, 3); ctx.fillRect(eyeX+CELL-7, eyeY+2, 3, 3); }
        else                   { ctx.fillRect(eyeX+4, eyeY+CELL-5,   3, 3); ctx.fillRect(eyeX+CELL-7, eyeY+CELL-5, 3, 3); }
      } else {
        const g = Math.floor(80 + (1 - t) * 97);
        ctx.fillStyle = `rgb(20, ${g}, 52)`;
        ctx.fillRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4);
      }
    }
  }

  // ── Game Loop ────────────────────────────────────────
  function loop(ts) {
    if (!gameRunning) return;
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;
    elapsed += dt;

    if (elapsed >= TICK_MS) {
      elapsed -= TICK_MS;
      update();
    }

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
    overlayTitle.textContent = 'GAME OVER';
    overlayMsg.textContent = `Score: ${score}`;
    startBtn.textContent = 'PLAY AGAIN';
    overlay.classList.remove('hidden');
  }

  startBtn.addEventListener('click', startGame);

  // Also allow Space/Enter to start
  window.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !gameRunning) {
      e.preventDefault();
      startGame();
    }
  });

  // Initial draw
  draw();
});
