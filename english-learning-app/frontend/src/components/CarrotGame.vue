<template>
  <div class="carrot-game-container" :class="{ 'dark-mode': true }" @mousedown="startMouseSlash" @mousemove="moveMouseSlash" @mouseup="endMouseSlash" @touchstart="startTouchSlash" @touchmove="moveTouchSlash" @touchend="endMouseSlash">
    <!-- 宇宙星空背景 -->
    <div class="space-background">
      <div class="stars"></div>
      <div class="twinkling"></div>
      <div class="nebula"></div>
    </div>

    <!-- 顶部状态栏 -->
    <div class="game-header">
      <div class="stats-group">
        <div class="stat-item score">
          <span class="label">ENERGY</span>
          <span class="value">{{ score }}</span>
        </div>
        <div class="stat-item timer">
          <span class="label">STABILITY</span>
          <div class="progress-container">
            <div class="progress-bar" :style="{ width: (gameTime / 60) * 100 + '%' }"></div>
          </div>
        </div>
      </div>
      <button class="cyber-exit" @click="goBack">TERMINATE</button>
    </div>

    <!-- 视频检测小窗 (科技感边框) -->
    <div class="cyber-detector" v-show="cameraAccessible" :class="{ 'active': cameraAccessible }">
      <video ref="videoElement" class="input-video" playsinline></video>
      <canvas ref="canvasElement" class="output-canvas"></canvas>
      <div class="scan-line"></div>
      <div class="corner t-l"></div><div class="corner t-r"></div>
      <div class="corner b-l"></div><div class="corner b-r"></div>
    </div>

    <!-- 游戏主阶段 -->
    <div class="game-main">
      <!-- 准备阶段 -->
      <div v-if="gameState === 'ready'" class="ready-center">
        <div class="glitch-title" data-text="CARROT SLASH">CARROT SLASH</div>
        <div class="cyber-p">NEURAL LINK INITIALIZED // SELECT PROTOCOL</div>
        
        <div class="mode-grid">
          <div @click="startLevel" class="cyber-card-mode chinese">
            <div class="glow"></div>
            <span class="icon">🏮</span>
            <h3>DATA SYNC</h3>
            <p>SLICE THE CORRECT TARGET</p>
          </div>
        </div>

        <button @click="toggleCamera" class="init-btn">{{ cameraAccessible ? 'DISCONNECT SENSOR' : 'CONNECT SENSOR' }}</button>
        <p class="sensor-info">TIP: You can also use your mouse to slash!</p>
      </div>

      <!-- 游戏中 -->
      <div v-if="gameState === 'playing'" class="playing-field">
        <!-- 题目区域 -->
        <div class="mission-brief">
          <div class="mission-text glitch" :data-text="currentQuestion.chinese">{{ currentQuestion.chinese }}</div>
        </div>

        <!-- 只有 2 个卡片，一大一小布局或左右布局 -->
        <div class="dual-cards">
          <div 
            v-for="(option, index) in currentOptions" 
            :key="index"
            class="cyber-slice-card"
            :class="{ 
              'slashed': slashedIndex === index,
              'hit-correct': resultFlash === 'correct' && slashedIndex === index,
              'hit-wrong': resultFlash === 'wrong' && slashedIndex === index
            }"
            :ref="el => { if (el) cardRefs[index] = el }"
          >
            <div class="card-inner">
              <span class="word-text">{{ option.word }}</span>
            </div>
            <!-- 切开后的线条装饰 -->
            <div class="slash-line" v-if="slashedIndex === index"></div>
          </div>
        </div>

        <!-- 当前划动的视觉效果 (Trail) -->
        <canvas ref="trailCanvas" class="trail-canvas"></canvas>
      </div>

      <!-- 结算阶段 -->
      <div v-if="gameState === 'result'" class="result-center">
        <div class="result-box">
          <h2 class="cyber-h2">CORE STABILIZED</h2>
          <div class="final-score">{{ score }}</div>
          <div class="btn-group">
            <button @click="gameState = 'ready'" class="cyber-btn primary">REBOOT</button>
            <button @click="goBack" class="cyber-btn">EXIT</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部指令 -->
    <div class="cyber-footer" v-if="gameState === 'playing'">
      <span>SYSTEM STATUS: <span class="blink">SCANNING_GESTURE...</span></span>
    </div>

    <!-- 全局提示 (正确/错误) -->
    <transition name="fade">
        <div v-if="feedbackText" class="global-feedback" :class="feedbackType">
            <div class="feedback-inner">
                {{ feedbackText }}
                <div class="ripple" v-if="feedbackType === 'success'"></div>
            </div>
        </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

const router = useRouter();

// 核心状态
const gameState = ref('ready');
const score = ref(0);
const gameTime = ref(60);
const cameraAccessible = ref(false);

// 题目
const currentQuestion = ref({ word: '', chinese: '' });
const currentOptions = ref([]);
const fullWordList = ref([]);
const cardRefs = ref([]);

// 反馈
const slashedIndex = ref(-1);
const resultFlash = ref(null);
const feedbackText = ref('');
const feedbackType = ref('');

// 追踪
const videoElement = ref(null);
const canvasElement = ref(null);
const trailCanvas = ref(null);
const pathPoints = ref([]); // 记录划动点

let hands = null;
let camera = null;
let gameTimerInterval = null;
let isMouseSlashed = false;

// 1. 初始化
const initHands = () => {
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });

  hands.onResults(onResults);

  if (videoElement.value) {
    camera = new Camera(videoElement.value, {
      onFrame: async () => {
        if (cameraAccessible.value) {
            await hands.send({ image: videoElement.value });
        }
      },
      width: 640,
      height: 480
    });
  }
};

const toggleCamera = async () => {
    if (cameraAccessible.value) {
        cameraAccessible.value = false;
        pathPoints.value = [];
    } else {
        try {
            await camera.start();
            cameraAccessible.value = true;
        } catch (err) {
            alert("SENSOR UNAVAILABLE: ACCESS DENIED");
        }
    }
};

// 2. 核心：划动检测 (Slash Detection)
function onResults(results) {
  if (gameState.value !== 'playing') return;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    const indexFinger = landmarks[8]; // 使用食指尖
    
    const x = (1 - indexFinger.x) * window.innerWidth;
    const y = indexFinger.y * window.innerHeight;
    
    updateSlash(x, y);
  } else {
    // pathPoints.value = [];
  }
}

// 鼠标/触摸支持
function startMouseSlash(e) {
    if (gameState.value !== 'playing') return;
    isMouseSlashed = true;
    updateSlash(e.clientX, e.clientY);
}

function moveMouseSlash(e) {
    if (isMouseSlashed) {
        updateSlash(e.clientX, e.clientY);
    }
}

function startTouchSlash(e) {
    if (gameState.value !== 'playing') return;
    isMouseSlashed = true;
    const touch = e.touches[0];
    updateSlash(touch.clientX, touch.clientY);
}

function moveTouchSlash(e) {
    if (isMouseSlashed) {
        const touch = e.touches[0];
        updateSlash(touch.clientX, touch.clientY);
    }
}

function endMouseSlash() {
    isMouseSlashed = false;
}

function updateSlash(x, y) {
    const newPoint = { x, y, time: performance.now() };
    pathPoints.value.push(newPoint);
    
    if (pathPoints.value.length > 15) pathPoints.value.shift();

    drawTrail();
    checkSlashCollision(pathPoints.value);
}

// 检查是否划过卡片
function checkSlashCollision(points) {
  if (points.length < 2 || gameState.value !== 'playing' || slashedIndex.value !== -1) return;

  const lastPoint = points[points.length - 1];
  const prevPoint = points[points.length - 2];

  const dist = Math.hypot(lastPoint.x - prevPoint.x, lastPoint.y - prevPoint.y);
  if (dist < 5) return; 

  cardRefs.value.forEach((el, index) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    
    // 增加一点容错范围
    const buffer = 10;
    if (lastPoint.x >= rect.left - buffer && lastPoint.x <= rect.right + buffer && 
        lastPoint.y >= rect.top - buffer && lastPoint.y <= rect.bottom + buffer) {
      triggerHit(index);
    }
  });
}

// 3. 触发命中
function triggerHit(index) {
  slashedIndex.value = index;
  const word = currentOptions.value[index].word;
  
  if (word === currentQuestion.word) {
    score.value += 10;
    resultFlash.value = 'correct';
    showFeedback('+10 ENERGY', 'success');
    setTimeout(nextQuestion, 600);
  } else {
    // 选错不计分，显示错误效果
    resultFlash.value = 'wrong';
    showFeedback('CORRUPTION DETECTED', 'error');
    setTimeout(() => {
      slashedIndex.value = -1;
      resultFlash.value = null;
      // 错误之后也进入下一题，或者让用户重试？
      // 根据用户要求：切错了，不积分，并出现一个错误的效果。然后下一题
      nextQuestion();
    }, 800);
  }
}

// 4. 视觉效果：划痕绘制 (Blade Trail)
function drawTrail() {
  if (!trailCanvas.value) return;
  const ctx = trailCanvas.value.getContext('2d');
  trailCanvas.value.width = window.innerWidth;
  trailCanvas.value.height = window.innerHeight;
  
  if (pathPoints.value.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(pathPoints.value[0].x, pathPoints.value[0].y);
  
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#4facfe';

  for (let i = 1; i < pathPoints.value.length; i++) {
    const p = pathPoints.value[i];
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  // 自动清除旧的线
  setTimeout(() => {
      if (pathPoints.value.length > 0) {
          // pathPoints.value.shift();
          // drawTrail();
      }
  }, 100);
}

// 5. 业务逻辑
const startLevel = async () => {
  score.value = 0;
  gameTime.value = 60;
  gameState.value = 'playing';
  
  if (fullWordList.value.length === 0) await fetchWords();
  
  nextQuestion();
  startTimer();
};

const fetchWords = async () => {
    try {
        // 尝试从 API 获取单词，如果失败则回退
        const response = await fetch('/api/allWords');
        if (response.ok) {
            fullWordList.value = await response.json();
        } else {
             // 回退到静态文件
            const staticRes = await fetch('/words/1 初中-乱序.txt');
            const text = await staticRes.text();
            fullWordList.value = text.split('\n')
                .map(line => {
                    const parts = line.split('\t');
                    return { word: parts[0]?.trim(), chinese: parts[1]?.trim() || '' };
                })
                .filter(item => item.word && item.word.length > 0);
        }
    } catch (e) {
        console.error("WORDS_FETCH_FAILED", e);
    }
};

const nextQuestion = () => {
  slashedIndex.value = -1;
  resultFlash.value = null;
  pathPoints.value = [];
  
  const idx = Math.floor(Math.random() * fullWordList.value.length);
  currentQuestion.value = fullWordList.value[idx];
  
  // 生成干扰项：找一个接近的单词（比如长度相近或随机）
  let decoy;
  const similarWords = fullWordList.value.filter(item => 
    item.word !== currentQuestion.value.word && 
    Math.abs(item.word.length - currentQuestion.value.word.length) <= 1
  );
  
  if (similarWords.length > 0) {
    decoy = similarWords[Math.floor(Math.random() * similarWords.length)];
  } else {
    decoy = fullWordList.value[Math.floor(Math.random() * fullWordList.value.length)];
  }

  let options = [
    { ...currentQuestion.value },
    { ...decoy }
  ];
  
  currentOptions.value = options.sort(() => Math.random() - 0.5);
};

const startTimer = () => {
  clearInterval(gameTimerInterval);
  gameTimerInterval = setInterval(() => {
    gameTime.value--;
    if (gameTime.value <= 0) endGame();
  }, 1000);
};

const endGame = () => {
  clearInterval(gameTimerInterval);
  gameState.value = 'result';
};

const goBack = () => router.push({ name: 'GameCenter' });

const showFeedback = (text, type) => {
  feedbackText.value = text;
  feedbackType.value = type;
  setTimeout(() => { feedbackText.value = ''; }, 1200);
};

onMounted(() => initHands());
onUnmounted(() => {
  if (camera) camera.stop().catch(() => {});
  clearInterval(gameTimerInterval);
});

</script>

<style scoped>
/* === 1. Cosmic Background === */
.carrot-game-container {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: #000;
  color: #fff;
  z-index: 1500;
  overflow: hidden;
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  user-select: none;
  touch-action: none;
}

.space-background {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
  z-index: 0;
}

.stars {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: transparent url('https://s3-us-west-2.amazonaws.com/s.cdpn.io/123163/stars.png') repeat;
}

.twinkling {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: transparent url('https://s3-us-west-2.amazonaws.com/s.cdpn.io/123163/twinkling.png') repeat;
  animation: move-twink-back 200s linear infinite;
}

@keyframes move-twink-back {
  from { background-position: 0 0; }
  to { background-position: -10000px 5000px; }
}

/* === 2. Header Status === */
.game-header {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  padding: 20px 40px;
}

.stats-group { display: flex; gap: 40px; }
.stat-item {
  display: flex; flex-direction: column; gap: 5px;
}
.stat-item .label { font-size: 0.7rem; color: #4facfe; letter-spacing: 2px; }
.stat-item .value { font-size: 2rem; font-weight: 900; color: #fff; text-shadow: 0 0 10px #4facfe; }

.progress-container { width: 150px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 5px; }
.progress-bar { height: 100%; background: linear-gradient(90deg, #4facfe, #00f2fe); border-radius: 3px; transition: width 0.3s; }

.cyber-exit {
  background: transparent; border: 1px solid #ff5252; color: #ff5252;
  padding: 8px 15px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;
  transition: all 0.3s;
}
.cyber-exit:hover { background: #ff5252; color: #fff; box-shadow: 0 0 15px rgba(255,82,82,0.5); }

/* === 3. Cyber Detector Mini-view === */
.cyber-detector {
  position: fixed; bottom: 20px; right: 20px;
  width: 160px; height: 120px;
  border: 1px solid rgba(79, 172, 254, 0.3);
  background: #000; z-index: 100;
  border-radius: 10px; overflow: hidden;
}

.input-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); opacity: 0.5; }
.output-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: scaleX(-1); }

/* === 4. Dual Cards Stage === */
.game-main {
  position: relative; z-index: 5;
  height: calc(100vh - 100px);
  display: flex; justify-content: center; align-items: center;
}

.dual-cards {
  display: flex;
  flex-direction: row;
  gap: 30px;
  width: 95%;
  max-width: 1000px;
  justify-content: center;
}

.cyber-slice-card {
  position: relative;
  flex: 1;
  min-width: 200px;
  height: 200px;
  background: rgba(255,255,255,0.03);
  border: 2px solid rgba(79, 172, 254, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.card-inner { z-index: 2; position: relative; text-align: center; padding: 10px; }
.word-text { font-size: 2.2rem; font-weight: 900; color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.3); word-break: break-word; }

/* 切开动画 */
.cyber-slice-card.slashed {
  border-color: #fff;
  transform: scale(1.05);
}
.cyber-slice-card.slashed .card-inner {
  animation: slice-split 0.6s forwards;
}

@keyframes slice-split {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: translateY(-30px) rotate(-5deg) scale(1.1); opacity: 0; }
}

.slash-line {
  position: absolute; width: 150%; height: 6px;
  background: #fff; box-shadow: 0 0 20px #fff;
  transform: rotate(-10deg);
  z-index: 5;
  animation: slash-flash 0.4s forwards;
}
@keyframes slash-flash {
  0% { transform: translateX(-100%) rotate(-10deg); opacity: 1; }
  100% { transform: translateX(100%) rotate(-10deg); opacity: 0; }
}

.hit-correct { background: rgba(76, 175, 80, 0.3); border-color: #4caf50; box-shadow: 0 0 30px rgba(76, 175, 80, 0.5); }
.hit-wrong { background: rgba(255, 82, 82, 0.3); border-color: #ff5252; box-shadow: 0 0 30px rgba(255, 82, 82, 0.5); }

/* === 5. Trail Effect === */
.trail-canvas {
  position: fixed; top: 0; left: 0; pointer-events: none; z-index: 2000;
}

/* === 6. Mission Brief === */
.playing-field {
  display: flex; flex-direction: column; align-items: center; gap: 60px; width: 100%;
}
.mission-brief { text-align: center; }
.mission-text { font-size: 4rem; font-weight: 900; color: #f39c12; text-shadow: 0 0 20px rgba(243, 156, 18, 0.4); }

/* === 7. Result Box === */
.result-box {
  background: rgba(255,255,255,0.05); padding: 50px; border-radius: 30px;
  border: 1px solid rgba(79, 172, 254, 0.3); text-align: center;
  backdrop-filter: blur(20px);
}
.final-score { font-size: 7rem; font-weight: 900; color: #fff; text-shadow: 0 0 30px #4facfe; margin: 20px 0; }

.cyber-btn {
  padding: 12px 30px; background: transparent; border: 1px solid #4facfe;
  color: #4facfe; font-weight: bold; cursor: pointer; transition: 0.3s; margin: 0 10px;
  border-radius: 8px;
}
.cyber-btn.primary { background: #4facfe; color: #000; }
.cyber-btn:hover { box-shadow: 0 0 20px #4facfe; transform: translateY(-2px); }

/* === 8. Start Screen === */
.ready-center { text-align: center; }
.glitch-title {
  font-size: 5rem; font-weight: 900; position: relative; color: #fff; letter-spacing: 5px; margin-bottom: 20px;
}
.cyber-p { color: #a0aec0; letter-spacing: 2px; font-size: 0.9rem; }

.mode-grid { display: flex; justify-content: center; margin-top: 40px; }
.cyber-card-mode {
  width: 240px; height: 280px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; transition: 0.4s; position: relative; overflow: hidden;
}
.cyber-card-mode:hover { transform: translateY(-10px); border-color: #4facfe; background: rgba(79, 172, 254, 0.1); }
.cyber-card-mode .icon { font-size: 3.5rem; margin-bottom: 15px; }

.init-btn { margin-top: 40px; padding: 15px 40px; background: transparent; border: 2px solid #4facfe; color: #4facfe; font-weight: 900; cursor: pointer; border-radius: 50px; transition: all 0.3s; }
.init-btn:hover { background: #4facfe; color: #000; box-shadow: 0 0 20px #4facfe; }

.sensor-info { margin-top: 20px; font-size: 0.8rem; color: #718096; }

/* === Feedback === */
.global-feedback {
    position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%);
    z-index: 3000; pointer-events: none;
}
.feedback-inner {
    font-size: 3rem; font-weight: 900; text-transform: uppercase;
    animation: feedback-pop 0.6s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.success .feedback-inner { color: #4caf50; text-shadow: 0 0 20px rgba(76, 175, 80, 0.6); }
.error .feedback-inner { color: #ff5252; text-shadow: 0 0 20px rgba(255, 82, 82, 0.6); }

@keyframes feedback-pop {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 0; }
}

.blink { animation: blinker 1s linear infinite; }
@keyframes blinker { 50% { opacity: 0; } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
