const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const startOverlay = document.querySelector('.start-overlay');
const gameStatus = document.querySelector('.game-status');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const livesDisplay = document.getElementById('lives');
const gameAnnouncement = document.getElementById('game-announcement');
const confettiLayer = document.querySelector('.confetti-layer');
const keys = new Set();
const gameSettings = {
    duration: 90,
    targetScore: 10,
    startingLives: 3,
    playerSpeed: 390
};
const floorImage = new Image();
floorImage.src = 'assets/Water Dash Elements.png';
const catImage = new Image();
catImage.src = 'assets/cat image.png';
const canImage = new Image();
canImage.src = 'img/water-can-transparent.png';

const player = {
    x: 65,
    y: 0,
    width: 125,
    height: 125,
    facingLeft: false
};

const game = {
    active: false,
    score: 0,
    lives: gameSettings.startingLives,
    timeLeft: gameSettings.duration,
    items: [],
    spawnElapsed: 0,
    lastFrame: null,
    animationFrame: null,
    currentFrame: 0,
    frameElapsed: 0,
    confettiTimeout: null
};

const ground = {
    y: canvas.height * 0.88
};

function setStatus(message, statusClass) {
    gameStatus.innerHTML = `<span class="status-dot"></span> ${message}`;
    gameStatus.classList.toggle('is-playing', statusClass === 'playing');
    gameStatus.classList.toggle('is-finished', statusClass === 'finished');
}

function showOverlay(kicker, title, message, buttonLabel) {
    startOverlay.querySelector('.start-kicker').textContent = kicker;
    startOverlay.querySelector('h2').textContent = title;
    startOverlay.querySelector('.start-panel p:not(.start-kicker)').textContent = message;
    startButton.textContent = buttonLabel;
    startOverlay.classList.remove('is-hidden');
}

function updateHud() {
    scoreDisplay.textContent = game.score;
    timerDisplay.textContent = formatTime(game.timeLeft);
    livesDisplay.textContent = `${'♥ '.repeat(game.lives)}${'♡ '.repeat(gameSettings.startingLives - game.lives)}`.trim();
    livesDisplay.setAttribute('aria-label', `${game.lives} ${game.lives === 1 ? 'life' : 'lives'} remaining`);
}

function formatTime(seconds) {
    const wholeSeconds = Math.ceil(seconds);
    const minutes = Math.floor(wholeSeconds / 60);
    const remainingSeconds = wholeSeconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function resetGame() {
    game.active = false;
    game.score = 0;
    game.lives = gameSettings.startingLives;
    game.timeLeft = gameSettings.duration;
    game.items = [];
    game.spawnElapsed = 0;
    game.lastFrame = null;
    game.currentFrame = 0;
    game.frameElapsed = 0;
    player.x = 65;
    keys.clear();
    if (game.animationFrame !== null) {
        cancelAnimationFrame(game.animationFrame);
        game.animationFrame = null;
    }
    if (game.confettiTimeout !== null) {
        clearTimeout(game.confettiTimeout);
        game.confettiTimeout = null;
    }
    confettiLayer.replaceChildren();
    updateHud();
    setStatus('READY TO PLAY', 'ready');
    showOverlay(
        'YOUR ADVENTURE AWAITS',
        'Ready to make a splash?',
        'Collect 10 cans in 90 seconds. Dodge dirty drops and save your 3 lives!',
        'Start Game'
    );
    drawGame();
}

function startGame() {
    if (game.active) return;
    if (gameStatus.classList.contains('is-finished')) resetGame();

    game.active = true;
    game.lastFrame = null;
    startOverlay.classList.add('is-hidden');
    setStatus('GAME IN PROGRESS', 'playing');
    gameAnnouncement.textContent = 'Game started. Collect 10 clean water cans and avoid dirty drops.';
    canvas.focus({ preventScroll: true });
    game.animationFrame = requestAnimationFrame(gameLoop);
}

function finishGame(won, message) {
    game.active = false;
    keys.clear();
    game.animationFrame = null;
    setStatus(won ? 'YOU DID IT!' : 'GAME OVER', 'finished');
    gameAnnouncement.textContent = message;
    showOverlay(
        won ? 'SPLASH-TASTIC!' : 'GIVE IT ANOTHER GO',
        won ? 'You made a splash!' : 'The dash is done!',
        message,
        'Play Again'
    );
    if (won) celebrateWin();
}

function celebrateWin() {
    const colors = ['#ffc907', '#2e9df7', '#4fcb53', '#ff902a', '#f16061'];
    confettiLayer.replaceChildren();
    for (let index = 0; index < 60; index += 1) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        piece.style.setProperty('--confetti-color', colors[index % colors.length]);
        piece.style.setProperty('--confetti-left', `${Math.random() * 100}%`);
        piece.style.setProperty('--confetti-delay', `${Math.random() * 0.8}s`);
        piece.style.setProperty('--confetti-duration', `${1.8 + Math.random() * 1.5}s`);
        confettiLayer.append(piece);
    }
    game.confettiTimeout = setTimeout(() => confettiLayer.replaceChildren(), 4000);
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8bd1cb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (floorImage.complete && floorImage.naturalWidth) {
        ctx.drawImage(floorImage, 0, 0, canvas.width, canvas.height);
        // The background image is full-screen, with its ground strip near the bottom.
        ground.y = canvas.height * 0.88;
    } else {
        ground.y = canvas.height - 62;
        ctx.fillStyle = '#ffc907';
        ctx.fillRect(0, ground.y, canvas.width, canvas.height - ground.y);
    }

    player.y = ground.y - player.height + 14;
    drawPlayer();
    game.items.forEach(drawItem);
}

function drawPlayer() {
    if (!catImage.complete || !catImage.naturalWidth) {
        ctx.fillStyle = '#17324d';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        return;
    }

    const frameWidth = catImage.naturalWidth / 3;
    const frameHeight = catImage.naturalHeight / 2;
    const column = game.currentFrame % 3;
    const row = Math.floor(game.currentFrame / 3);
    ctx.save();
    ctx.translate(player.x + (player.facingLeft ? player.width : 0), player.y);
    if (player.facingLeft) ctx.scale(-1, 1);
    ctx.drawImage(
        catImage,
        column * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight,
        0,
        0,
        player.width,
        player.height
    );
    ctx.restore();
}

function drawItem(item) {
    if (item.type === 'can') {
        if (canImage.complete && canImage.naturalWidth) {
            ctx.drawImage(canImage, item.x, item.y, item.width, item.height);
        } else {
            ctx.fillStyle = '#2e9df7';
            ctx.fillRect(item.x, item.y, item.width, item.height);
        }
        return;
    }

    const centerX = item.x + item.width / 2;
    ctx.fillStyle = '#f16061';
    ctx.beginPath();
    ctx.moveTo(centerX, item.y + item.height);
    ctx.bezierCurveTo(item.x - 2, item.y + item.height * 0.65, item.x + 3, item.y + item.height * 0.25, centerX, item.y);
    ctx.bezierCurveTo(item.x + item.width - 3, item.y + item.height * 0.25, item.x + item.width + 2, item.y + item.height * 0.65, centerX, item.y + item.height);
    ctx.fill();
    ctx.fillStyle = 'rgb(255 255 255 / 55%)';
    ctx.beginPath();
    ctx.ellipse(centerX - 8, item.y + 16, 5, 9, -0.4, 0, Math.PI * 2);
    ctx.fill();
}

function createItem() {
    const isCan = Math.random() < 0.68;
    const width = isCan ? 54 : 44;
    const height = isCan ? 68 : 54;
    game.items.push({
        type: isCan ? 'can' : 'drop',
        x: Math.random() * (canvas.width - width),
        y: -height,
        width,
        height,
        speed: 235 + Math.min(gameSettings.duration - game.timeLeft, 50) * 2.2
    });
}

function itemsOverlap(item) {
    const playerInset = 23;
    return item.x < player.x + player.width - playerInset
        && item.x + item.width > player.x + playerInset
        && item.y < player.y + player.height - 15
        && item.y + item.height > player.y + 15;
}

function updateItems(deltaTime) {
    game.items.forEach((item) => {
        item.y += item.speed * deltaTime;
        if (!item.collected && itemsOverlap(item)) {
            item.collected = true;
            if (item.type === 'can') {
                game.score += 1;
                scoreDisplay.textContent = game.score;
                scoreDisplay.classList.remove('score-pop');
                void scoreDisplay.offsetWidth;
                scoreDisplay.classList.add('score-pop');
                gameAnnouncement.textContent = `Water can collected. Score ${game.score} out of ${gameSettings.targetScore}.`;
            } else {
                game.lives -= 1;
                updateHud();
                livesDisplay.classList.remove('life-lost');
                void livesDisplay.offsetWidth;
                livesDisplay.classList.add('life-lost');
                gameAnnouncement.textContent = `Dirty drop hit. ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} remaining.`;
            }
        }
    });
    game.items = game.items.filter((item) => !item.collected && item.y < canvas.height);
}

function gameLoop(timestamp) {
    if (!game.active) return;

    const deltaTime = game.lastFrame === null
        ? 0
        : Math.min((timestamp - game.lastFrame) / 1000, 0.05);
    game.lastFrame = timestamp;
    game.timeLeft = Math.max(0, game.timeLeft - deltaTime);

    let direction = 0;
    if (keys.has('a') || keys.has('arrowleft')) direction -= 1;
    if (keys.has('d') || keys.has('arrowright')) direction += 1;
    player.x += direction * gameSettings.playerSpeed * deltaTime;
    if (direction !== 0) player.facingLeft = direction < 0;
    player.x = Math.max(0, Math.min(player.x, canvas.width - player.width));
    if (direction !== 0) {
        game.frameElapsed += deltaTime;
        if (game.frameElapsed >= 0.12) {
            game.currentFrame = (game.currentFrame + 1) % 6;
            game.frameElapsed = 0;
        }
    } else {
        game.currentFrame = 0;
        game.frameElapsed = 0;
    }

    game.spawnElapsed += deltaTime;
    if (game.spawnElapsed >= 0.82) {
        createItem();
        game.spawnElapsed = 0;
    }
    updateItems(deltaTime);
    updateHud();
    drawGame();

    if (game.score >= gameSettings.targetScore) {
        finishGame(true, `You collected ${game.score} clean water cans with ${formatTime(game.timeLeft)} left. Great job!`);
        return;
    }
    if (game.lives <= 0) {
        finishGame(false, 'You ran out of lives. Try again and dodge those dirty drops!');
        return;
    }
    if (game.timeLeft <= 0) {
        finishGame(false, `Time is up! You collected ${game.score} of ${gameSettings.targetScore} cans. Try again!`);
        return;
    }
    game.animationFrame = requestAnimationFrame(gameLoop);
}

function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    if (!game.active || !['arrowleft', 'arrowright', 'a', 'd'].includes(key)) return;
    event.preventDefault();
    keys.add(key);
}

function handleKeyUp(event) {
    keys.delete(event.key.toLowerCase());
}

function movePlayerToPointer(event) {
    if (!game.active) return;
    const bounds = canvas.getBoundingClientRect();
    const canvasX = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
    player.facingLeft = canvasX < player.x + player.width / 2;
    player.x = Math.max(0, Math.min(canvasX - player.width / 2, canvas.width - player.width));
}

startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);
window.addEventListener('keydown', handleKeyDown, true);
window.addEventListener('keyup', handleKeyUp, true);
canvas.addEventListener('pointerdown', movePlayerToPointer);
canvas.addEventListener('pointermove', (event) => {
    if (event.buttons > 0) movePlayerToPointer(event);
});
document.querySelectorAll('.move-button').forEach((button) => {
    const direction = button.dataset.direction;
    const key = direction === 'left' ? 'arrowleft' : 'arrowright';
    button.addEventListener('pointerdown', (event) => {
        if (!game.active) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        keys.add(key);
    });
    button.addEventListener('pointerup', () => keys.delete(key));
    button.addEventListener('pointercancel', () => keys.delete(key));
    button.addEventListener('lostpointercapture', () => keys.delete(key));
});

window.addEventListener('blur', () => keys.clear());
window.addEventListener('resize', drawGame);

updateHud();
drawGame();
