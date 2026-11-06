const WIDTH = 400;
const HEIGHT = 400;
const SPAWN_INTERVAL = 5;

function createState() {
    return {
        player: {x: 0, y: 0, width: 28, height: 28, direction: 0},
        lives: 5,
        elapsed: 0,
        spawn: 0,
        nextId: 0,
        hits: 0,
        blocked: 0,
        monsters: [],
        traps: [],
        phase: 'playing'
    };
}

function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
        a.y < b.y + b.height && a.y + a.height > b.y;
}

function spawnObjects(state, random = Math.random) {
    for (let i = 0; i < 2; i++) {
        const x = random() * (WIDTH - 24);
        const y = random() * (HEIGHT - 24);
        const dx = state.player.x + state.player.width / 2 - x;
        const dy = state.player.y + state.player.height / 2 - y;
        const distance = Math.hypot(dx, dy) || 1;
        state.monsters.push({
            id: state.nextId++, x, y, width: 24, height: 24,
            vx: dx / distance * 62.5,
            vy: dy / distance * 62.5
        });
    }
    if (state.traps.length >= 3) state.traps.shift();
    state.traps.push({
        id: state.nextId++,
        x: random() * (WIDTH - 50),
        y: random() * (HEIGHT - 50),
        width: 50, height: 50
    });
}

function update(state, dt, keys, random = Math.random) {
    if (state.phase !== 'playing') return;
    state.elapsed += dt;
    state.spawn += dt;

    const player = state.player;
    const speed = 150;
    if (keys.has('ArrowLeft')) {
        player.x -= speed * dt;
        player.direction = 180;
    } else if (keys.has('ArrowRight')) {
        player.x += speed * dt;
        player.direction = 0;
    } else if (keys.has('ArrowUp')) {
        player.y -= speed * dt;
        player.direction = -90;
    } else if (keys.has('ArrowDown')) {
        player.y += speed * dt;
        player.direction = 90;
    }
    player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));
    player.y = Math.max(0, Math.min(HEIGHT - player.height, player.y));

    while (state.spawn >= SPAWN_INTERVAL) {
        state.spawn -= SPAWN_INTERVAL;
        spawnObjects(state, random);
    }

    state.monsters = state.monsters.filter(monster => {
        monster.x += monster.vx * dt;
        monster.y += monster.vy * dt;
        if (monster.x < -monster.width || monster.x > WIDTH || monster.y < -monster.height || monster.y > HEIGHT) return false;
        if (state.traps.some(trap => overlaps(monster, trap))) {
            state.blocked++;
            return false;
        }
        if (state.lives > 0 && overlaps(monster, player)) {
            state.lives = Math.max(0, state.lives - 1);
            state.hits++;
            return false;
        }
        return true;
    });

    if (state.lives === 0) state.phase = 'lost';
}



const $ = id => document.getElementById(id);
const keys = new Set();
const monsters = new Map();
const traps = new Map();
let selectedMap = null;
let playerName = '';
let state = null;
let lastFrame = 0;

function showScreen(id) {
    for (const screen of ['gameSelectionScreen', 'inputScreen', 'gameScreen', 'overScreen']) {
        $(screen).hidden = screen !== id;
    }
}

function formatTime(seconds) {
    const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
    return minutes + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
}

function loadMaps() {
    const maps = [
        {id: 'forest', name: 'Лес', image: 'assets/maps/forest.svg', ground: '#EEF0E3', grid: '#DDE2CF'},
        {id: 'desert', name: 'Пустыня', image: 'assets/maps/desert.svg', ground: '#F7E9DC', grid: '#EED9C5'},
        {id: 'ice', name: 'Горы', image: 'assets/maps/ice.svg', ground: '#E6EDF6', grid: '#D2DFED'}
    ];
    for (const map of maps) {
        const button = document.createElement('button');
        button.className = 'choose_map';
        button.type = 'button';
        const card = document.createElement('div');
        card.className = 'map';
        const image = document.createElement('img');
        image.src = map.image;
        image.alt = '';
        const title = document.createElement('p');
        title.textContent = map.name;
        card.append(image, title);
        button.append(card);
        button.onclick = () => {
            selectedMap = map;
            $('selectedMapName').textContent = 'Карта: ' + map.name;
            showScreen('inputScreen');
            $('playerName').focus();
        };
        $('maps').append(button);
    }
    $('loading').hidden = true;
}

function clearField() {
    for (const element of monsters.values()) element.remove();
    for (const element of traps.values()) element.remove();
    monsters.clear();
    traps.clear();
}

function startGame() {
    clearField();
    keys.clear();
    state = createState();
    lastFrame = performance.now();
    $('playerDisplay').textContent = playerName;
    $('mapDisplay').textContent = selectedMap.name;
    $('gameContainer').style.setProperty('--ground', selectedMap.ground);
    $('gameContainer').style.setProperty('--grid', selectedMap.grid);
    $('pauseScreen').hidden = true;
    $('pauseButton').disabled = false;
    showScreen('gameScreen');
    render();
    window.scrollTo(0, 0);
}

$('inputScreen').onsubmit = event => {
    event.preventDefault();
    playerName = $('playerName').value.trim();
    if (!playerName) {
        $('playerName').setCustomValidity('Введите Ваше имя.');
        $('playerName').reportValidity();
        return;
    }
    startGame();
};
$('playerName').oninput = () => $('playerName').setCustomValidity('');
$('backButton').onclick = () => showScreen('gameSelectionScreen');
$('restartButton').onclick = startGame;
$('menuButton').onclick = () => {
    state = null;
    clearField();
    showScreen('gameSelectionScreen');
};

function togglePause() {
    if (!state || !['playing', 'paused'].includes(state.phase)) return;
    state.phase = state.phase === 'playing' ? 'paused' : 'playing';
    keys.clear();
    const paused = state.phase === 'paused';
    $('pauseScreen').hidden = !paused;
    $('pauseButton').disabled = paused;
    (paused ? $('continueButton') : $('pauseButton')).focus({preventScroll: true});
    lastFrame = performance.now();
}
$('pauseButton').onclick = togglePause;
$('continueButton').onclick = togglePause;

document.addEventListener('keydown', event => {
    if (event.code === 'Escape' && !event.repeat) togglePause();
    if (event.code === 'Tab' && state?.phase === 'paused') {
        event.preventDefault();
        $('continueButton').focus();
    }
    if (event.code.startsWith('Arrow') && state && ['playing', 'paused'].includes(state.phase)) {
        event.preventDefault();
        if (state.phase === 'playing') keys.add(event.code);
    }
});
document.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => {
    keys.clear();
    if (state?.phase === 'playing') togglePause();
});

function place(element, object) {
    element.style.left = object.x / WIDTH * 100 + '%';
    element.style.top = object.y / HEIGHT * 100 + '%';
}

function renderObjects(objects, elements, className) {
    const ids = new Set(objects.map(object => object.id));
    for (const [id, element] of elements) {
        if (!ids.has(id)) {
            element.remove();
            elements.delete(id);
        }
    }
    for (const object of objects) {
        let element = elements.get(object.id);
        if (!element) {
            element = document.createElement('div');
            element.className = className;
            $('gameContainer').append(element);
            elements.set(object.id, element);
        }
        place(element, object);
    }
}

function render() {
    place($('player'), state.player);
    $('player').style.transform = 'rotate(' + state.player.direction + 'deg)';
    renderObjects(state.monsters, monsters, 'monster');
    renderObjects(state.traps, traps, 'trap');
    $('livesCounter').textContent = state.lives;
    $('elapsedTime').textContent = formatTime(state.elapsed);
    $('currentTime').textContent = new Date().toLocaleTimeString('ru-RU', {hour12: false});
}

function frame(now) {
    if (state && ['playing', 'paused'].includes(state.phase)) {
        const dt = Math.min((now - lastFrame) / 1000, .05);
        lastFrame = now;
        update(state, dt, keys);
        render();
        if (state.phase === 'lost') {
            keys.clear();
            $('finalTime').textContent = formatTime(state.elapsed);
            $('resultPlayer').textContent = 'Игрок: ' + playerName + '. Карта: ' + selectedMap.name + '.';
            $('finalHits').textContent = state.hits;
            $('finalBlocked').textContent = state.blocked;
            $('finalLives').textContent = state.lives;
            showScreen('overScreen');
            $('restartButton').focus();
        }
    }
    requestAnimationFrame(frame);
}

loadMaps();
requestAnimationFrame(frame);

