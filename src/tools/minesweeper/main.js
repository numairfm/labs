const gridElement = document.getElementById('minesweeper-grid');
const difficultySelect = document.getElementById('difficulty-select');
const resetBtn = document.getElementById('reset-btn');
const faceBtn = document.getElementById('face-btn');
const mineCounterElement = document.getElementById('mine-counter');
const timerElement = document.getElementById('timer');
const themeToggle = document.getElementById('theme-toggle');

const DIFFICULTIES = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 }
};

let currentDifficulty = 'beginner';
let grid = [];
let rows = 9;
let cols = 9;
let totalMines = 10;
let minesLeft = 10;
let isFirstClick = true;
let isGameOver = false;
let timer = null;
let seconds = 0;
let revealedCount = 0;

function init() {
    setupTheme();
    bindEvents();
    startNewGame();
}

function bindEvents() {
    difficultySelect.addEventListener('change', (e) => {
        currentDifficulty = e.target.value;
        startNewGame();
    });

    resetBtn.addEventListener('click', startNewGame);
    faceBtn.addEventListener('click', startNewGame);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcons(newTheme);
    });
}

function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);
}

function updateThemeIcons(theme) {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    if (theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

function startNewGame() {
    const config = DIFFICULTIES[currentDifficulty];
    rows = config.rows;
    cols = config.cols;
    totalMines = config.mines;
    
    isFirstClick = true;
    isGameOver = false;
    minesLeft = totalMines;
    revealedCount = 0;
    
    stopTimer();
    seconds = 0;
    updateDisplays();
    faceBtn.textContent = '🙂';
    
    createGrid();
}

function createGrid() {
    gridElement.innerHTML = '';
    gridElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid = [];
    
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.dataset.row = r;
            cellElement.dataset.col = c;
            
            cellElement.addEventListener('click', () => handleCellClick(r, c));
            cellElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleCellRightClick(r, c);
            });
            cellElement.addEventListener('mousedown', (e) => {
                if (!isGameOver && e.button === 0 && !cellElement.classList.contains('revealed') && !cellElement.classList.contains('flagged')) {
                    faceBtn.textContent = '😮';
                }
            });
            cellElement.addEventListener('mouseup', (e) => {
                if (!isGameOver && e.button === 0) {
                    faceBtn.textContent = '🙂';
                }
            });
            cellElement.addEventListener('mouseleave', (e) => {
                if (!isGameOver) {
                    faceBtn.textContent = '🙂';
                }
            });
            
            gridElement.appendChild(cellElement);
            row.push({
                r, c,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                adjacentMines: 0,
                element: cellElement
            });
        }
        grid.push(row);
    }
}

function handleCellClick(r, c) {
    if (isGameOver) return;
    const cell = grid[r][c];
    
    if (cell.isFlagged || cell.isRevealed) return;
    
    if (isFirstClick) {
        placeMines(r, c);
        calculateAdjacentMines();
        startTimer();
        isFirstClick = false;
    }
    
    if (cell.isMine) {
        gameOver(false, cell);
    } else {
        revealCell(r, c);
        checkWin();
    }
}

function handleCellRightClick(r, c) {
    if (isGameOver || isFirstClick) return;
    const cell = grid[r][c];
    
    if (cell.isRevealed) return;
    
    if (cell.isFlagged) {
        cell.isFlagged = false;
        cell.element.classList.remove('flagged');
        minesLeft++;
    } else {
        if (minesLeft > 0) {
            cell.isFlagged = true;
            cell.element.classList.add('flagged');
            minesLeft--;
        }
    }
    updateDisplays();
}

function placeMines(firstClickR, firstClickC) {
    let minesPlaced = 0;
    while (minesPlaced < totalMines) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        
        if (Math.abs(r - firstClickR) <= 1 && Math.abs(c - firstClickC) <= 1) continue;
        
        if (!grid[r][c].isMine) {
            grid[r][c].isMine = true;
            minesPlaced++;
        }
    }
}

function calculateAdjacentMines() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c].isMine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].isMine) {
                        count++;
                    }
                }
            }
            grid[r][c].adjacentMines = count;
        }
    }
}

function revealCell(r, c) {
    const cell = grid[r][c];
    if (cell.isRevealed || cell.isFlagged) return;
    
    cell.isRevealed = true;
    cell.element.classList.add('revealed');
    revealedCount++;
    
    if (cell.adjacentMines > 0) {
        cell.element.textContent = cell.adjacentMines;
        cell.element.dataset.adjacent = cell.adjacentMines;
    } else {
        // Flood fill
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    revealCell(nr, nc);
                }
            }
        }
    }
}

function checkWin() {
    if (revealedCount === rows * cols - totalMines) {
        gameOver(true);
    }
}

function gameOver(win, clickCell = null) {
    isGameOver = true;
    stopTimer();
    
    if (win) {
        faceBtn.textContent = '😎';
        minesLeft = 0;
        updateDisplays();
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                if (cell.isMine && !cell.isFlagged) {
                    cell.isFlagged = true;
                    cell.element.classList.add('flagged');
                }
            }
        }
    } else {
        faceBtn.textContent = '😵';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                if (cell.isMine) {
                    cell.element.classList.add('revealed');
                    if (!cell.isFlagged) {
                        cell.element.textContent = '💣';
                        if (clickCell && cell === clickCell) {
                            cell.element.classList.add('mine');
                        }
                    }
                } else if (cell.isFlagged) {
                    cell.element.classList.add('revealed');
                    cell.element.textContent = '❌';
                }
            }
        }
    }
}

function startTimer() {
    timer = setInterval(() => {
        if (seconds < 999) {
            seconds++;
            updateDisplays();
        }
    }, 1000);
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function updateDisplays() {
    mineCounterElement.textContent = minesLeft.toString().padStart(3, '0');
    timerElement.textContent = seconds.toString().padStart(3, '0');
}

document.addEventListener('DOMContentLoaded', init);
