<template>
  <div class="bubble-game-container">
    <audio id="bgm" loop>
      <source src="https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3" type="audio/mp3">
    </audio>

    <div class="cloud c1"></div>
    <div class="cloud c2"></div>
    <div class="cloud c3"></div>

    <div id="ui-layer" v-if="gameStarted">
      <div>Score: <span id="score">0</span></div>
      <div style="font-size: 14px; color: #888;">Level: <span id="level">1</span></div>
      <button id="toggle-sound" class="sound-btn" title="开关声音">🔊</button>
    </div>

    <div id="input-display" v-if="gameStarted"></div>

    <div id="game-over" v-show="isGameOver">
      <h1 style="color: #4A90E2; margin-bottom: 5px;">✨ Game Over ✨</h1>
      <p style="color: #666; font-size: 20px; margin: 5px 0 15px 0;">Final Score: <span id="final-score" style="color: #f68084; font-weight: bold;">0</span></p>
      <div class="leaderboard-container">
        <div style="text-align: left; font-size: 14px; color: #888; margin-bottom: 8px;">🏆 TOP 3 PLAYERS</div>
        <div id="leaderboard-list"></div>
        <div id="my-rank-display" class="current-rank-info">Your Rank: # --</div>
      </div>
      <button id="restart-btn" @click="resetAndShowDifficulty">Play Again</button>
    </div>

    <!-- New Difficulty Selection Screen -->
    <div id="difficulty-screen" v-if="!gameStarted">
        <h1 style="color: #4A90E2; font-size: 48px; text-shadow: 0 5px 15px rgba(0,0,0,0.1);">Bubble Typer</h1>
        <div class="difficulty-selection">
            <div class="selector-group">
                <label for="category-select">选择词库:</label>
                <select id="category-select" v-model="selectedCategory" @change="updateLevels">
                    <option disabled value="">请选择难度</option>
                    <option v-for="cat in categories" :key="cat.file" :value="cat.file">{{ cat.name }}</option>
                </select>
            </div>
            <div class="selector-group" v-if="selectedCategory">
                <label for="level-select">选择关卡:</label>
                <select id="level-select" v-model="selectedLevel">
                    <option v-for="level in levels" :key="level.value" :value="level.value">{{ level.text }}</option>
                </select>
            </div>
        </div>
        <button class="start-btn" @click="startGame" :disabled="!selectedCategory || !selectedLevel">
            {{ isLoading ? '加载中...' : 'START GAME 🎵' }}
        </button>
    </div>

    <canvas id="gameCanvas" ref="gameCanvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const gameCanvas = ref(null);
const isGameOver = ref(false);
const gameStarted = ref(false);
const isLoading = ref(false);

// Difficulty Selection State
const categories = ref([
    { name: '1. 初中', file: '1 初中-乱序.txt' },
    { name: '2. 高中', file: '2 高中-乱序.txt' },
    { name: '3. 四级', file: '3 四级-乱序.txt' },
    { name: '4. 六级', file: '4 六级-乱序.txt' },
    { name: '5. 考研', file: '5 考研-乱序.txt' },
    { name: '6. 托福', file: '6 托福-乱序.txt' },
    { name: '7. SAT', file: '7 SAT-乱序.txt' },
]);
const selectedCategory = ref('');
const levels = ref([]);
const selectedLevel = ref(null);
const fullWordList = ref([]);
let gameWords = []; // This will hold the sliced words for the current game

let ctx;
let inputDisplay, scoreEl, levelEl, finalScoreEl, leaderboardListEl, myRankDisplayEl, bgm, soundBtn;
let width, height;
let bubbles = [];
let bullets = [];
let particles = [];
let score = 0;
let level = 1;
let currentInput = '';
let spawnRate = 2000;
let lastSpawn = 0;
let animationId;
let globalWind = 0;
let windTime = 0;
let isMuted = false;
let audioCtx;

const cannon = { x: 0, y: 0, angle: -Math.PI / 2, length: 60 };

onMounted(() => {
  initialize();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', resize);
  window.removeEventListener('keydown', handleKeyDown);
  if (bgm) {
    bgm.pause();
    bgm.src = '';
  }
   if (audioCtx) {
    audioCtx.close();
  }
});

function initialize() {
    const canvas = gameCanvas.value;
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    bgm = document.getElementById('bgm');
}

function initializeUI() {
    inputDisplay = document.getElementById('input-display');
    scoreEl = document.getElementById('score');
    levelEl = document.getElementById('level');
    finalScoreEl = document.getElementById('final-score');
    leaderboardListEl = document.getElementById('leaderboard-list');
    myRankDisplayEl = document.getElementById('my-rank-display');
    soundBtn = document.getElementById('toggle-sound');
    bgm.volume = 0.3;
    soundBtn.addEventListener('click', toggleSound);
}

// --- Difficulty Selection Logic ---
async function updateLevels() {
    if (!selectedCategory.value) return;
    isLoading.value = true;
    try {
        const response = await fetch(`/words/${selectedCategory.value}`);
        const text = await response.text();
        // Corrected parsing logic: split by line, then take the first tab-separated value.
        const words = text.split('\n')
                          .map(line => line.split('\t')[0].trim())
                          .filter(word => word.length > 0);
        fullWordList.value = words;

        levels.value = [];
        const chunkSize = 200;
        for (let i = 0; i < words.length; i += chunkSize) {
            levels.value.push({
                text: `单词 ${i + 1} - ${Math.min(i + chunkSize, words.length)}`,
                value: `${i}-${i + chunkSize}`
            });
        }
        if (levels.value.length > 0) {
            selectedLevel.value = levels.value[0].value;
        }
    } catch (error) {
        console.error("Failed to load word list:", error);
    } finally {
        isLoading.value = false;
    }
}

async function startGame() {
    if (!selectedCategory.value || !selectedLevel.value || isLoading.value) return;

    const [start, end] = selectedLevel.value.split('-').map(Number);
    gameWords = fullWordList.value.slice(start, end);

    if (gameWords.length === 0) {
        alert('选中的关卡没有单词，请重新选择。');
        return;
    }

    gameStarted.value = true;

    // We need to wait for the DOM to update before initializing UI elements
    await new Promise(resolve => setTimeout(resolve, 0));
    initializeUI();

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!isMuted) {
        bgm.play().catch(e => console.log(e));
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }
    initGame();
}

function resetAndShowDifficulty() {
    isGameOver.value = false;
    gameStarted.value = false;
    // Optional: Reset selections
    // selectedCategory.value = '';
    // selectedLevel.value = null;
    // levels.value = [];
}
// --- End of Difficulty Selection Logic ---


function playPopSound() {
    if (isMuted || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

function speakWord(text) {
    if (isMuted) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
}

function toggleSound() {
    isMuted = !isMuted;
    if (isMuted) {
        bgm.pause();
        soundBtn.textContent = '🔇';
        soundBtn.classList.add('muted');
    } else {
        if(gameStarted.value) bgm.play().catch(e => console.log(e));
        soundBtn.textContent = '🔊';
        soundBtn.classList.remove('muted');
    }
}


function resize() {
    const canvas = gameCanvas.value;
    if(!canvas) return;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    cannon.x = width / 2;
    cannon.y = height;
}

class Bubble {
    constructor() {
        this.text = gameWords[Math.floor(Math.random() * gameWords.length)]; // Use gameWords
        const baseRadius = 35;
        const charFactor = 5;
        this.radius = baseRadius + (this.text.length * charFactor) + (Math.random() * 5);
        this.x = Math.random() * (width - 2 * this.radius) + this.radius;
        this.y = -this.radius - 50;
        
        this.baseSpeed = (0.5 + Math.random() * 0.8) + (level * 0.1);
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.02 + Math.random() * 0.03;
        this.wobbleAmp = 0.5 + Math.random() * 1.5;
        
        let hue;
        const ranges = [[300, 360], [0, 40], [140, 170]];
        const range = ranges[Math.floor(Math.random() * ranges.length)];
        hue = range[0] + Math.random() * (range[1] - range[0]);

        this.mainColor = `hsla(${hue}, 85%, 65%, 0.15)`;
        this.borderColor = `hsla(${hue}, 80%, 70%, 0.6)`;
        this.glowColor = `hsla(${hue}, 90%, 80%, 0.8)`;
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        let grad = ctx.createRadialGradient(
            this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.1,
            this.x, this.y, this.radius
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(0.2, this.mainColor);
        grad.addColorStop(0.85, this.borderColor);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.glowColor;
        ctx.strokeStyle = 'rgba(255,255,255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.ellipse(this.x - this.radius*0.3, this.y - this.radius*0.3, this.radius*0.15, this.radius*0.08, Math.PI/4, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();

        ctx.font = 'bold 22px "Quicksand", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillStyle = '#2c3e50';
        
        if (currentInput && this.text.startsWith(currentInput)) {
            const matchPart = currentInput;
            const restPart = this.text.substring(currentInput.length);
            const totalW = ctx.measureText(this.text).width;
            const matchW = ctx.measureText(matchPart).width;
            const startX = this.x - totalW / 2;
            
            ctx.fillStyle = '#E91E63';
            ctx.textAlign = 'left';
            ctx.fillText(matchPart, startX, this.y);
            ctx.fillStyle = '#2c3e50';
            ctx.fillText(restPart, startX + matchW, this.y);
        } else {
            ctx.fillText(this.text, this.x, this.y);
        }
        ctx.restore();
    }

    update() {
        this.y += this.baseSpeed;
        const wobble = Math.sin(this.y * this.wobbleSpeed + this.wobblePhase) * this.wobbleAmp;
        this.x += wobble + globalWind;
        if (this.x < this.radius) this.x = this.radius;
        if (this.x > width - this.radius) this.x = width - this.radius;
    }
}

class Bullet {
    constructor(targetBubble) {
        this.x = cannon.x;
        this.y = cannon.y;
        this.target = targetBubble;
        this.speed = 15;
        this.active = true;
        this.trail = [];
        this.wordToSpeak = targetBubble.text;
    }
    update() {
        if (!this.target) { this.active = false; return; }
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < this.speed) {
            this.active = false;
            return true;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
            this.trail.push({x: this.x, y: this.y, alpha: 1});
            if (this.trail.length > 8) this.trail.shift();
        }
        return false;
    }
    draw() {
        ctx.save();
        for (let i = 0; i < this.trail.length; i++) {
            const p = this.trail[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4 * (i/8), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 235, 59, ${i/8})`;
            ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFEB3B';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'orange';
        ctx.fill();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 6 + 2;
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.015;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.gravity = 0.2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function resetGame() {
    initGame();
}

function initGame() {
    bubbles = [];
    bullets = [];
    particles = [];
    score = 0;
    level = 1;
    currentInput = '';
    inputDisplay.innerText = '';
    scoreEl.innerText = '0';
    levelEl.innerText = '1';
    isGameOver.value = false;
    spawnRate = 2000;
    lastSpawn = performance.now();
    cancelAnimationFrame(animationId);
    loop(performance.now());
}

function updateLeaderboard(finalScore) {
    const STORAGE_KEY = 'bubble_typer_scores';
    let history = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    
    const currentEntry = {
        score: finalScore,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
    };
    history.push(currentEntry);

    history.sort((a, b) => b.score - a.score);
    history = history.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

    const myRankIndex = history.findIndex(item => item.timestamp === currentEntry.timestamp);
    const myRank = myRankIndex + 1;

    const top3 = history.slice(0, 3);
    let html = '';
    
    for (let i = 0; i < 3; i++) {
        const item = top3[i];
        let rankClass = `rank-${i+1}`;
        let icon = i === 0 ? '🥇' : (i === 1 ? '🥈' : '🥉');
        
        if (item) {
            html += `
            <div class="rank-item ${rankClass}">
                <span><span class="rank-icon">${icon}</span> ${item.score} pts</span>
                <span style="font-size:12px; opacity:0.6;">${item.date}</span>
            </div>`;
        } else {
            html += `
            <div class="rank-item" style="opacity:0.3;">
                <span><span class="rank-icon">${icon}</span> ---</span>
            </div>`;
        }
    }
    leaderboardListEl.innerHTML = html;

    let rankText = `Your Rank: #${myRank}`;
    if (myRank === 1) rankText = `🎉 NEW RECORD! Rank: #1 🎉`;
    else if (myRank <= 3) rankText = `👏 Amazing! Rank: #${myRank}`;
    
    myRankDisplayEl.innerText = rankText;
}

function showGameOverScreen() {
    isGameOver.value = true;
    finalScoreEl.innerText = score;
    bgm.pause();
    updateLeaderboard(score);
}


function handleKeyDown(e) {
    if (isGameOver.value || !gameStarted.value) return;

    if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
        currentInput += e.key.toLowerCase();
        inputDisplay.style.transform = "translateX(-50%) scale(1.1)";
        setTimeout(()=> inputDisplay.style.transform = "translateX(-50%) scale(1)", 100);
    } else if (e.key === 'Backspace') {
        currentInput = currentInput.slice(0, -1);
    }
    inputDisplay.innerText = currentInput.toUpperCase();
    checkInput();
}

function checkInput() {
    const matchIndex = bubbles.findIndex(b => b.text === currentInput);
    if (matchIndex !== -1) {
        const target = bubbles[matchIndex];
        bullets.push(new Bullet(target));
        const dx = target.x - cannon.x;
        const dy = target.y - cannon.y;
        cannon.angle = Math.atan2(dy, dx);
        
        currentInput = '';
        inputDisplay.innerText = '';
        bubbles[matchIndex].text = "";
    } else {
        const hasPartialMatch = bubbles.some(b => b.text.startsWith(currentInput));
        if (!hasPartialMatch && currentInput.length > 0) {
            inputDisplay.style.borderColor = '#ff6b6b';
            inputDisplay.style.color = '#ff6b6b';
            setTimeout(() => {
                inputDisplay.style.borderColor = '#fff';
                inputDisplay.style.color = '#2c3e50';
            }, 200);
            currentInput = '';
            inputDisplay.innerText = '';
        }
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function drawCannon() {
    ctx.save();
    ctx.translate(cannon.x, cannon.y);
    ctx.rotate(cannon.angle);
    ctx.fillStyle = '#607D8B';
    ctx.beginPath();
    ctx.roundRect(0, -12, cannon.length, 24, 8);
    ctx.fill();
    ctx.fillStyle = '#90A4AE';
    ctx.fillRect(10, -8, 40, 6);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cannon.x, cannon.y, 35, Math.PI, 0);
    ctx.fillStyle = '#455A64';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cannon.x, cannon.y, 15, Math.PI, 0);
    ctx.fillStyle = '#B0BEC5';
    ctx.fill();
}

function loop(timestamp) {
    if (isGameOver.value) return;
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    windTime += 0.005;
    globalWind = Math.sin(windTime) * 0.5;

    if (timestamp - lastSpawn > spawnRate) {
        bubbles.push(new Bubble());
        lastSpawn = timestamp;
        if (spawnRate > 800) spawnRate -= 15;
    }

    for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.update();
        b.draw();
        if (b.y > height - 60 && b.text !== "") {
            showGameOverScreen();
            return;
        }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const hit = b.update();
        b.draw();
        if (hit) {
            const index = bubbles.indexOf(b.target);
            if (index !== -1) {
                createExplosion(bubbles[index].x, bubbles[index].y, '#fff');
                const wordToSpeak = b.wordToSpeak;
                bubbles.splice(index, 1);
                score += 10;
                scoreEl.innerText = score;
                if (score > 0 && score % 100 === 0) {
                    level++;
                    levelEl.innerText = level;
                }
                
                playPopSound();
                if (wordToSpeak) {
                   speakWord(wordToSpeak);
                }
            }
            bullets.splice(i, 1);
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(i, 1);
    }

    drawCannon();
    animationId = requestAnimationFrame(loop);
}

</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700&display=swap');

.bubble-game-container {
    margin: 0;
    overflow: hidden;
    background: linear-gradient(180deg, #a1c4fd 0%, #c2e9fb 100%);
    font-family: 'Quicksand', sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    user-select: none;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
}

.cloud { position: absolute; background: rgba(255, 255, 255, 0.6); border-radius: 50px; animation: floatCloud linear infinite; z-index: 0; }
.cloud::after, .cloud::before { content: ''; position: absolute; background: inherit; border-radius: 50%; }
.c1 { width: 120px; height: 40px; top: 10%; left: -150px; animation-duration: 25s; }
.c1::after { width: 50px; height: 50px; top: -25px; left: 15px; }
.c1::before { width: 40px; height: 40px; top: -15px; left: 50px; }
.c2 { width: 100px; height: 35px; top: 30%; left: -120px; animation-duration: 35s; animation-delay: 5s; opacity: 0.5; }
.c2::after { width: 40px; height: 40px; top: -20px; left: 10px; }
.c3 { width: 150px; height: 50px; top: 60%; left: -200px; animation-duration: 40s; animation-delay: 2s; opacity: 0.7; }
.c3::after { width: 60px; height: 60px; top: -30px; left: 20px; }
.c3::before { width: 50px; height: 50px; top: -20px; left: 60px; }
@keyframes floatCloud { from { transform: translateX(-200px); } to { transform: translateX(120vw); } }

#gameCanvas { display: block; position: relative; z-index: 1; }

#ui-layer {
    position: absolute; top: 20px; left: 20px; z-index: 10;
    color: #4A90E2; font-size: 20px; font-weight: 700;
    background: rgba(255, 255, 255, 0.8); padding: 10px 20px;
    border-radius: 15px; box-shadow: 0 4px 15px rgba(161, 196, 253, 0.4);
    backdrop-filter: blur(5px); display: flex; align-items: center; gap: 20px;
}

.sound-btn {
    background: none; border: none; cursor: pointer; font-size: 24px;
    padding: 0; opacity: 0.7; transition: transform 0.2s, opacity 0.2s;
}
.sound-btn:hover { opacity: 1; transform: scale(1.1); }
.sound-btn.muted { opacity: 0.4; filter: grayscale(100%); }

#input-display {
    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 10;
    font-size: 36px; color: #2c3e50; background: rgba(255, 255, 255, 0.9);
    padding: 12px 40px; border-radius: 50px; font-weight: 700; letter-spacing: 3px;
    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15); border: 2px solid #fff;
    min-width: 100px; text-align: center; height: 45px; line-height: 45px; transition: all 0.2s;
}

#game-over {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 20;
    background: rgba(255, 255, 255, 0.95); padding: 40px; border-radius: 30px;
    text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.15);
    min-width: 300px;
    animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes popIn { from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }

.leaderboard-container {
    margin: 20px 0;
    background: rgba(161, 196, 253, 0.1);
    border-radius: 15px;
    padding: 15px;
    border: 1px solid rgba(161, 196, 253, 0.3);
}
.rank-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 0; border-bottom: 1px dashed rgba(0,0,0,0.1);
    font-size: 16px; color: #555;
}
.rank-item:last-child { border-bottom: none; }
.rank-icon { margin-right: 8px; font-size: 18px; display: inline-block; width: 24px; }
.rank-1 { color: #f1c40f; font-weight: bold; font-size: 18px; }
.rank-2 { color: #95a5a6; font-weight: bold; }
.rank-3 { color: #cd7f32; font-weight: bold; }

.current-rank-info {
    margin-top: 15px;
    font-size: 16px;
    color: #4A90E2;
    font-weight: bold;
    background: #eef5ff;
    padding: 8px;
    border-radius: 10px;
}

#restart-btn {
    background: linear-gradient(45deg, #a18cd1 0%, #fbc2eb 100%); color: white; border: none;
    padding: 12px 30px; font-size: 18px; border-radius: 50px; cursor: pointer;
    font-family: 'Quicksand', sans-serif; font-weight: bold; margin-top: 10px;
    box-shadow: 0 5px 15px rgba(161, 140, 209, 0.4); transition: transform 0.1s;
}
#restart-btn:hover { transform: scale(1.05); }

#difficulty-screen {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(255,255,255,0.4); backdrop-filter: blur(10px);
    z-index: 30; display: flex; justify-content: center; align-items: center; flex-direction: column;
    gap: 2rem;
}

.difficulty-selection {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.7);
    padding: 2rem;
    border-radius: 20px;
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
}

.selector-group {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.selector-group label {
    font-weight: 600;
    color: #4A90E2;
}

.selector-group select {
    padding: 10px;
    border-radius: 10px;
    border: 1px solid #a1c4fd; /* Lighter blue border */
    background-color: #f0f8ff; /* Very light blue background */
    font-family: 'Quicksand', sans-serif;
    min-width: 250px;
    font-size: 16px;
    color: #4A90E2; /* Same blue as the title */
    font-weight: 600; /* Bolder text */
}

.start-btn {
    padding: 15px 40px; font-size: 24px; background: #4A90E2; color: white;
    border: none; border-radius: 50px; cursor: pointer;
    box-shadow: 0 10px 20px rgba(74, 144, 226, 0.3);
    font-family: 'Quicksand', sans-serif; font-weight: bold;
    animation: pulse 2s infinite;
}
.start-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
    animation: none;
}
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
</style>