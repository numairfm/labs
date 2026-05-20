import { initTheme, toggleTheme } from '../../assets/js/utils.js';
initTheme();

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScore = document.getElementById('final-score');
const bestScore = document.getElementById('best-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');

// Game Constants
const GRAVITY = 0.5;
const JUMP_IMPULSE = -8;
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 120; // Frames
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const BIRD_RADIUS = 15;

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let frames = 0;
let score = 0;
let highScore = localStorage.getItem('flappyHighScore') || 0;

// Entities
let bird = {
    x: 150,
    y: canvas.height / 2,
    velocity: 0,
    color: '#ffcc00',
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, BIRD_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Eye
        ctx.beginPath();
        ctx.arc(this.x + 5, this.y - 5, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 6, this.y - 5, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        
        // Wing
        ctx.beginPath();
        ctx.ellipse(this.x - 5, this.y, 8, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffaa00';
        ctx.fill();
        ctx.stroke();
    },
    update() {
        this.velocity += GRAVITY;
        this.y += this.velocity;
        
        // Floor collision
        if (this.y + BIRD_RADIUS >= canvas.height) {
            this.y = canvas.height - BIRD_RADIUS;
            gameOver();
        }
        
        // Ceiling collision
        if (this.y - BIRD_RADIUS <= 0) {
            this.y = BIRD_RADIUS;
            this.velocity = 0;
        }
    },
    jump() {
        this.velocity = JUMP_IMPULSE;
    }
};

let pipes = [];

function createPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - minHeight - PIPE_GAP;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
    
    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        passed: false
    });
}

function updatePipes() {
    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        p.x -= PIPE_SPEED;
        
        // Collision Detection
        // Top pipe
        if (bird.x + BIRD_RADIUS > p.x && bird.x - BIRD_RADIUS < p.x + PIPE_WIDTH && 
            bird.y - BIRD_RADIUS < p.topHeight) {
            gameOver();
        }
        
        // Bottom pipe
        if (bird.x + BIRD_RADIUS > p.x && bird.x - BIRD_RADIUS < p.x + PIPE_WIDTH && 
            bird.y + BIRD_RADIUS > p.topHeight + PIPE_GAP) {
            gameOver();
        }
        
        // Score update
        if (p.x + PIPE_WIDTH < bird.x && !p.passed) {
            score++;
            p.passed = true;
            scoreDisplay.innerText = score;
        }
        
        // Remove off-screen pipes
        if (p.x + PIPE_WIDTH < 0) {
            pipes.shift();
            i--;
        }
    }
}

function drawPipes() {
    ctx.fillStyle = '#2ecc71';
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 4;
    
    pipes.forEach(p => {
        // Top pipe
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        
        // Top pipe cap
        ctx.fillRect(p.x - 4, p.topHeight - 20, PIPE_WIDTH + 8, 20);
        ctx.strokeRect(p.x - 4, p.topHeight - 20, PIPE_WIDTH + 8, 20);
        
        // Bottom pipe
        const bottomY = p.topHeight + PIPE_GAP;
        const bottomHeight = canvas.height - bottomY;
        ctx.fillRect(p.x, bottomY, PIPE_WIDTH, bottomHeight);
        ctx.strokeRect(p.x, bottomY, PIPE_WIDTH, bottomHeight);
        
        // Bottom pipe cap
        ctx.fillRect(p.x - 4, bottomY, PIPE_WIDTH + 8, 20);
        ctx.strokeRect(p.x - 4, bottomY, PIPE_WIDTH + 8, 20);
    });
}

function resetGame() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    frames = 0;
    scoreDisplay.innerText = score;
    scoreDisplay.style.display = 'block';
    gameState = 'PLAYING';
    
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    
    gameLoop();
}

function gameOver() {
    gameState = 'GAMEOVER';
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
    }
    
    finalScore.innerText = score;
    bestScore.innerText = highScore;
    scoreDisplay.style.display = 'none';
    gameOverScreen.classList.add('active');
}

function gameLoop() {
    if (gameState !== 'PLAYING') return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    bird.update();
    bird.draw();
    
    if (frames % PIPE_SPAWN_RATE === 0) {
        createPipe();
    }
    
    updatePipes();
    drawPipes();
    
    frames++;
    requestAnimationFrame(gameLoop);
}

// Initial draw
ctx.clearRect(0, 0, canvas.width, canvas.height);
bird.draw();

// Event Listeners
function handleJump(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (e.cancelable) e.preventDefault();
    
    if (gameState === 'PLAYING') {
        bird.jump();
    } else if (gameState === 'START' || gameState === 'GAMEOVER') {
        if (gameState === 'START' && e.target === startBtn) return;
        if (gameState === 'GAMEOVER' && e.target === restartBtn) return;
        resetGame();
        bird.jump();
    }
}

window.addEventListener('keydown', handleJump);
canvas.addEventListener('mousedown', handleJump);
canvas.addEventListener('touchstart', handleJump, { passive: false });

// Make window-wide tapping (outside buttons/headers) trigger a jump on touch devices
window.addEventListener('touchstart', (e) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.flappy-header')) return;
    handleJump(e);
}, { passive: false });

startBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', resetGame);

// Theme Toggle
themeToggle.addEventListener('click', toggleTheme);


