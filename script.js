// Game constants
let GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 400,
    BIRD_SIZE: 20,
    BIRD_X: 100,
    GRAVITY: 0.25,
    FLAP_STRENGTH: -6,
    PIPE_WIDTH: 60,
    PIPE_GAP: 140,
    PIPE_SPEED: 1.5,
    PIPE_SPAWN_RATE: 150, // frames between pipe spawns
};

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let bestScore = localStorage.getItem('flappyBirdBest') || 0;
let frameCount = 0;

// Game objects
let bird = {
    x: GAME_CONFIG.BIRD_X,
    y: GAME_CONFIG.CANVAS_HEIGHT / 2,
    velocity: 0,
    size: GAME_CONFIG.BIRD_SIZE
};

let pipes = [];
let particles = [];

// DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreDisplay = document.getElementById('scoreDisplay');
const currentScoreEl = document.getElementById('currentScore');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const restartBtn = document.getElementById('restartBtn');
const mobileControls = document.getElementById('mobileControls');
const flapBtn = document.getElementById('flapBtn');

// Set canvas size for responsive design
function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const rect = container.getBoundingClientRect();
    
    if (window.innerWidth <= 480) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        GAME_CONFIG.CANVAS_WIDTH = canvas.width;
        GAME_CONFIG.CANVAS_HEIGHT = canvas.height;
        // Adjust physics for mobile screens - make it even easier
        GAME_CONFIG.GRAVITY = 0.2;
        GAME_CONFIG.FLAP_STRENGTH = -5;
        GAME_CONFIG.PIPE_GAP = 160;
        GAME_CONFIG.PIPE_SPEED = 1.2;
        mobileControls.classList.remove('hidden');
    } else {
        canvas.width = 800;
        canvas.height = 400;
        GAME_CONFIG.CANVAS_WIDTH = 800;
        GAME_CONFIG.CANVAS_HEIGHT = 400;
        // Reset physics for desktop - easier settings
        GAME_CONFIG.GRAVITY = 0.25;
        GAME_CONFIG.FLAP_STRENGTH = -6;
        GAME_CONFIG.PIPE_GAP = 140;
        GAME_CONFIG.PIPE_SPEED = 1.5;
        mobileControls.classList.add('hidden');
    }
    
    // Reset bird position
    bird.y = GAME_CONFIG.CANVAS_HEIGHT / 2;
    bird.velocity = 0; // Reset velocity when resizing
}

// Initialize game
function init() {
    resizeCanvas();
    bestScoreEl.textContent = bestScore;
    
    // Add event listeners
    document.addEventListener('keydown', handleKeyPress);
    canvas.addEventListener('click', handleClick);
    flapBtn.addEventListener('click', handleClick);
    restartBtn.addEventListener('click', restartGame);
    window.addEventListener('resize', resizeCanvas);
    
    // Start game loop
    gameLoop();
}

// Handle input
function handleKeyPress(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
    }
}

function handleClick(e) {
    e.preventDefault();
    handleInput();
}

function handleInput() {
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'playing') {
        flap();
    }
}

// Game functions
function startGame() {
    gameState = 'playing';
    score = 0;
    frameCount = 0;
    pipes = [];
    particles = [];
    
    // Reset bird
    bird.y = GAME_CONFIG.CANVAS_HEIGHT / 2;
    bird.velocity = 0;
    
    // Add a grace period before first pipe appears
    frameCount = -60; // Delay first pipe by 1 second (60 frames)
    
    // Hide start screen, show score
    startScreen.classList.add('hidden');
    scoreDisplay.classList.remove('hidden');
    updateScore();
}

function flap() {
    bird.velocity = GAME_CONFIG.FLAP_STRENGTH;
    
    // Create particles for flap effect
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: bird.x + bird.size / 2,
            y: bird.y + bird.size / 2,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 1,
            life: 25,
            maxLife: 25
        });
    }
    
    // Play sound effect (if audio is added later)
    playSound('flap');
}

function restartGame() {
    gameState = 'start';
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    scoreDisplay.classList.add('hidden');
}

function gameOver() {
    gameState = 'gameOver';
    
    // Update best score
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('flappyBirdBest', bestScore);
        bestScoreEl.textContent = bestScore;
    }
    
    // Show game over screen
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
    scoreDisplay.classList.add('hidden');
    
    // Play sound effect
    playSound('gameOver');
}

function updateScore() {
    currentScoreEl.textContent = score;
}

// Game logic
function updateBird() {
    if (gameState !== 'playing') return;
    
    // Apply gravity
    bird.velocity += GAME_CONFIG.GRAVITY;
    
    // Add velocity damping to prevent excessive falling speed
    const maxFallSpeed = 5;
    if (bird.velocity > maxFallSpeed) {
        bird.velocity = maxFallSpeed;
    }
    
    // Add upward velocity limit too
    const maxUpSpeed = -6;
    if (bird.velocity < maxUpSpeed) {
        bird.velocity = maxUpSpeed;
    }
    
    // Update bird position
    bird.y += bird.velocity;
    
    // Check ground collision (account for ground height)
    const groundY = GAME_CONFIG.CANVAS_HEIGHT - 30;
    if (bird.y + bird.size >= groundY) {
        bird.y = groundY - bird.size;
        bird.velocity = 0; // Reset velocity on ground hit
        gameOver();
    }
    
    // Check ceiling collision
    if (bird.y <= 0) {
        bird.y = 0;
        bird.velocity = 0;
    }
}

function updatePipes() {
    if (gameState !== 'playing') return;
    
    // Spawn new pipes (only after grace period)
    if (frameCount > 0 && frameCount % GAME_CONFIG.PIPE_SPAWN_RATE === 0) {
        // Make gaps more centered and avoid extreme positions
        const minGapY = 80;
        const maxGapY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PIPE_GAP - 80;
        const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
        
        pipes.push({
            x: GAME_CONFIG.CANVAS_WIDTH,
            topHeight: gapY,
            bottomY: gapY + GAME_CONFIG.PIPE_GAP,
            scored: false
        });
    }
    
    // Update pipe positions
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= GAME_CONFIG.PIPE_SPEED;
        
        // Check scoring
        if (!pipe.scored && pipe.x + GAME_CONFIG.PIPE_WIDTH < bird.x) {
            pipe.scored = true;
            score++;
            updateScore();
            playSound('score');
        }
        
        // Remove off-screen pipes
        if (pipe.x + GAME_CONFIG.PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
        
        // Check collision
        if (checkPipeCollision(pipe)) {
            gameOver();
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function checkPipeCollision(pipe) {
    // Add collision tolerance to make the game more forgiving
    const tolerance = 3;
    
    // Bird boundaries with tolerance
    const birdLeft = bird.x + tolerance;
    const birdRight = bird.x + bird.size - tolerance;
    const birdTop = bird.y + tolerance;
    const birdBottom = bird.y + bird.size - tolerance;
    
    // Pipe boundaries
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + GAME_CONFIG.PIPE_WIDTH;
    
    // Check if bird is within pipe's x range
    if (birdRight > pipeLeft && birdLeft < pipeRight) {
        // Check collision with top or bottom pipe (with tolerance)
        if (birdTop < pipe.topHeight - tolerance || birdBottom > pipe.bottomY + tolerance) {
            return true;
        }
    }
    
    return false;
}

// Rendering
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.3, '#98D8E8');
    gradient.addColorStop(0.7, '#90EE90');
    gradient.addColorStop(1, '#32CD32');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    
    // Draw ground texture
    drawGround();
    
    // Draw clouds (simple background elements)
    drawClouds();
    
    // Draw pipes
    drawPipes();
    
    // Draw bird
    drawBird();
    
    // Draw particles
    drawParticles();
}

function drawBird() {
    ctx.save();
    
    // Move to bird position
    ctx.translate(bird.x + bird.size / 2, bird.y + bird.size / 2);
    
    // Rotate based on velocity for realistic movement
    const rotation = Math.min(Math.max(bird.velocity * 0.08, -0.5), 0.5);
    ctx.rotate(rotation);
    
    // Draw bird shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(2, 2, bird.size / 2, bird.size / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bird body (ellipse for more natural look)
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bird.size / 2);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.7, '#FFA500');
    gradient.addColorStop(1, '#FF8C00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.size / 2, bird.size / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bird border
    ctx.strokeStyle = '#FF6347';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.size / 2, bird.size / 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw wing
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.ellipse(-bird.size / 6, -bird.size / 8, bird.size / 3, bird.size / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FF6347';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw eye background (white)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(bird.size / 6, -bird.size / 6, bird.size / 5, bird.size / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eye border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw pupil
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.ellipse(bird.size / 4, -bird.size / 6, bird.size / 8, bird.size / 7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eye highlight
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(bird.size / 3.5, -bird.size / 5, bird.size / 15, bird.size / 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw beak
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.moveTo(bird.size / 2, -bird.size / 8);
    ctx.lineTo(bird.size / 2 + 10, 0);
    ctx.lineTo(bird.size / 2, bird.size / 8);
    ctx.closePath();
    ctx.fill();
    
    // Draw beak border
    ctx.strokeStyle = '#DC143C';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
}

function drawPipes() {
    pipes.forEach(pipe => {
        // Create pipe gradient
        const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + GAME_CONFIG.PIPE_WIDTH, 0);
        pipeGradient.addColorStop(0, '#228B22');
        pipeGradient.addColorStop(0.3, '#32CD32');
        pipeGradient.addColorStop(0.7, '#228B22');
        pipeGradient.addColorStop(1, '#006400');
        
        // Top pipe body
        ctx.fillStyle = pipeGradient;
        ctx.fillRect(pipe.x, 0, GAME_CONFIG.PIPE_WIDTH, pipe.topHeight);
        
        // Top pipe cap
        const capGradient = ctx.createLinearGradient(pipe.x - 5, 0, pipe.x + GAME_CONFIG.PIPE_WIDTH + 5, 0);
        capGradient.addColorStop(0, '#32CD32');
        capGradient.addColorStop(0.5, '#90EE90');
        capGradient.addColorStop(1, '#228B22');
        ctx.fillStyle = capGradient;
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 25, GAME_CONFIG.PIPE_WIDTH + 10, 25);
        
        // Bottom pipe body
        ctx.fillStyle = pipeGradient;
        ctx.fillRect(pipe.x, pipe.bottomY, GAME_CONFIG.PIPE_WIDTH, GAME_CONFIG.CANVAS_HEIGHT - pipe.bottomY);
        
        // Bottom pipe cap
        ctx.fillStyle = capGradient;
        ctx.fillRect(pipe.x - 5, pipe.bottomY, GAME_CONFIG.PIPE_WIDTH + 10, 25);
        
        // Pipe borders and details
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 3;
        
        // Top pipe border
        ctx.strokeRect(pipe.x, 0, GAME_CONFIG.PIPE_WIDTH, pipe.topHeight);
        ctx.strokeRect(pipe.x - 5, pipe.topHeight - 25, GAME_CONFIG.PIPE_WIDTH + 10, 25);
        
        // Bottom pipe border
        ctx.strokeRect(pipe.x, pipe.bottomY, GAME_CONFIG.PIPE_WIDTH, GAME_CONFIG.CANVAS_HEIGHT - pipe.bottomY);
        ctx.strokeRect(pipe.x - 5, pipe.bottomY, GAME_CONFIG.PIPE_WIDTH + 10, 25);
        
        // Add vertical lines for texture
        ctx.strokeStyle = '#90EE90';
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
            const lineX = pipe.x + (GAME_CONFIG.PIPE_WIDTH / 3) * i;
            // Top pipe lines
            ctx.beginPath();
            ctx.moveTo(lineX, 0);
            ctx.lineTo(lineX, pipe.topHeight);
            ctx.stroke();
            
            // Bottom pipe lines
            ctx.beginPath();
            ctx.moveTo(lineX, pipe.bottomY);
            ctx.lineTo(lineX, GAME_CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
        }
    });
}

function drawParticles() {
    particles.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        
        // Create sparkle effect
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(frameCount * 0.1);
        
        // Draw star-shaped particle
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            const x = Math.cos(angle) * 3;
            const y = Math.sin(angle) * 3;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    });
}

function drawGround() {
    const groundHeight = 30;
    const groundY = GAME_CONFIG.CANVAS_HEIGHT - groundHeight;
    
    // Ground gradient
    const groundGradient = ctx.createLinearGradient(0, groundY, 0, GAME_CONFIG.CANVAS_HEIGHT);
    groundGradient.addColorStop(0, '#8B4513');
    groundGradient.addColorStop(0.5, '#A0522D');
    groundGradient.addColorStop(1, '#654321');
    
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundY, GAME_CONFIG.CANVAS_WIDTH, groundHeight);
    
    // Ground border
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, groundY);
    ctx.stroke();
    
    // Add grass texture
    ctx.fillStyle = '#228B22';
    for (let x = 0; x < GAME_CONFIG.CANVAS_WIDTH; x += 10) {
        const grassHeight = Math.random() * 5 + 3;
        ctx.fillRect(x, groundY - grassHeight, 2, grassHeight);
    }
}

function drawClouds() {
    // Simple cloud decoration with more cartoon style
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    
    // Cloud 1
    const cloud1X = (frameCount * 0.3) % (GAME_CONFIG.CANVAS_WIDTH + 150) - 150;
    drawCloud(cloud1X, 60, 35);
    
    // Cloud 2
    const cloud2X = (frameCount * 0.2 + 200) % (GAME_CONFIG.CANVAS_WIDTH + 150) - 150;
    drawCloud(cloud2X, 100, 25);
    
    // Cloud 3
    const cloud3X = (frameCount * 0.15 + 400) % (GAME_CONFIG.CANVAS_WIDTH + 150) - 150;
    drawCloud(cloud3X, 80, 30);
    
    // Cloud 4 (background layer)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const cloud4X = (frameCount * 0.1 + 300) % (GAME_CONFIG.CANVAS_WIDTH + 150) - 150;
    drawCloud(cloud4X, 120, 40);
}

function drawCloud(x, y, size) {
    ctx.save();
    
    // Add cloud shadow
    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.5 + 2, y + 2, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size + 2, y + 2, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.2 + 2, y - size * 0.3 + 2, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8 + 2, y - size * 0.3 + 2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Main cloud
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.5, y, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.2, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Cloud highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.beginPath();
    ctx.arc(x + size * 0.3, y - size * 0.2, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Audio functions (placeholder for future sound implementation)
function playSound(soundType) {
    // Placeholder for sound effects
    // You can add Web Audio API or HTML5 audio here
    console.log(`Playing sound: ${soundType}`);
}

// Game loop
function gameLoop() {
    frameCount++;
    
    // Update game objects
    updateBird();
    updatePipes();
    updateParticles();
    
    // Render everything
    render();
    
    // Continue loop
    requestAnimationFrame(gameLoop);
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', init);

// Prevent space bar from scrolling page
document.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
        e.preventDefault();
    }
});

// Touch events for mobile
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    handleInput();
});

// Disable context menu on canvas
canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});
