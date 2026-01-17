<template>
  <div class="sword-game-container">
    <!-- 星空背景 -->
    <div class="space-background">
      <div class="stars"></div>
      <div class="twinkling"></div>
    </div>

    <!-- 游戏画布 -->
    <canvas ref="gameCanvas" class="game-canvas"></canvas>

    <!-- 视频检测窗口 (隐蔽式) -->
    <div class="detector-overlay" :class="{ 'active': cameraAccessible }">
      <video ref="videoElement" class="input-video" playsinline></video>
      <div class="gesture-status">
        <span class="status-label">MODE:</span>
        <span class="status-value">{{ currentMode }}</span>
      </div>
    </div>

    <!-- 顶部控制条 -->
    <div class="game-header">
      <div class="title-group">
        <h1 class="glitch" data-text="万剑归宗">万剑归宗</h1>
        <p class="subtitle">Sword Master Protocol</p>
      </div>
      <div class="control-group">
        <div class="gesture-guide">
          <div class="guide-item" :class="{ active: currentMode === 'GIANT_SWORD' }">✊ 握拳：万剑归宗</div>
          <div class="guide-item" :class="{ active: currentMode === 'SCATTER' }">✋ 掌心：剑影散屏</div>
          <div class="guide-item" :class="{ active: currentMode === 'STREAM' }">✌️ 剪刀：如水剑流</div>
          <div class="guide-item" :class="{ active: currentMode === 'SHIELD' }">� 摇滚：大球护盾</div>
          <div class="guide-item" :class="{ active: currentMode === 'FORMATION' }">👍 拇指：圆面阵法</div>
        </div>
        <button class="exit-btn" @click="goBack">TERMINATE</button>
      </div>
    </div>

    <!-- 初始化提示 -->
    <div v-if="!cameraAccessible" class="init-overlay">
      <div class="init-content">
        <h2>剑意系统待机中</h2>
        <p>需要摄像头权限以开启御剑模式</p>
        <button @click="requestCamera" class="init-btn">启动御剑感应</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

const router = useRouter();
const gameCanvas = ref(null);
const videoElement = ref(null);
const cameraAccessible = ref(false);
const currentMode = ref('SWARM'); // SWARM, SHIELD, FORMATION, SCATTER, STREAM, GIANT_SWORD

let ctx = null;
let hands = null;
let camera = null;
let swords = [];
const swordCount = 300;
let targetPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let trailPoints = []; // 用于实现轨迹
const maxTrailLen = 200; // 增加轨迹长度，实现更长的水流效果
let isHandsTogether = false;

// 剑类定义
class Sword {
  constructor(index) {
    this.index = index;
    this.reset();
  }

  reset() {
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    this.z = (Math.random() - 0.5) * 400; // 3D depth
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.angle = Math.random() * Math.PI * 2;
    this.color = this.getRandomColor();
    this.length = 25 + Math.random() * 15;
    this.width = 1.8 + Math.random() * 1.5;
    
    // Assign spherical coordinates for SHIELD mode
    const idx = Math.random();
    this.phi = Math.acos(2 * idx - 1);
    this.theta = Math.random() * Math.PI * 2;
  }

  getRandomColor() {
    // 绿色和金色为主，亮一点
    const colors = [
      '#00ff66', '#33ff00', '#ccff00', // 亮绿
      '#ffd700', '#ffea00', '#ffcc00', // 金色
      '#ffffff' // 白色高光
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  update(mode, target) {
    let tx = target.x;
    let ty = target.y;
    let tz = 0;
    let force = 0.15;

    if (mode === 'STREAM') {
      // 剑流模式：如游鱼般涌现，分批跟上，形成长长的水流轨迹
      // 所有的剑先向目标点聚集，但根据序号有不同的延迟跟随轨道
      const delay = 0.6; // 延迟系数
      const historyIndex = Math.floor(this.index * delay);
      
      // 如果轨迹还没那么长，就先聚集在目标点附近
      const point = trailPoints[trailPoints.length - 1 - historyIndex] || trailPoints[0] || target;
      
      tx = point.x + (Math.random() - 0.5) * 15;
      ty = point.y + (Math.random() - 0.5) * 15;
      
      // 增加一点抖动感，像鱼在游
      this.vx += (tx - this.x) * 0.15 + (Math.random() - 0.5) * 2;
      this.vy += (ty - this.y) * 0.15 + (Math.random() - 0.5) * 2;
      this.vx *= 0.82;
      this.vy *= 0.82;
      this.angle = Math.atan2(this.vy, this.vx);
    } else if (mode === 'GIANT_SWORD') {
      // 巨剑模式：优化连贯性，加宽剑柄
      const swordCenter = { x: target.x, y: target.y };
      const relativeIdx = this.index / swordCount;
      
      let lx, ly;
      if (relativeIdx < 0.1) { // 剑尖
        const tipIdx = relativeIdx / 0.1;
        lx = (Math.random() - 0.5) * 12 * tipIdx;
        ly = -380 - (1 - tipIdx) * 50;
      } else if (relativeIdx < 0.75) { // 剑身 (与剑格连起来)
        lx = (Math.random() - 0.5) * 55;
        ly = -380 + (relativeIdx - 0.1) * (580 / 0.65); // 延伸到 200 左右
      } else if (relativeIdx < 0.85) { // 剑格 (稍微加宽)
        lx = (Math.random() - 0.5) * 220;
        ly = 200 + (Math.random() - 0.5) * 30;
      } else { // 剑柄 (加宽且紧贴)
        lx = (Math.random() - 0.5) * 60; // 剑柄更宽
        ly = 215 + (relativeIdx - 0.85) * 200; // 紧贴剑格
      }

      tx = swordCenter.x + lx;
      ty = swordCenter.y + ly;
      this.vx = (tx - this.x) * 0.15;
      this.vy = (ty - this.y) * 0.15;
      this.vz = (0 - this.z) * 0.15;
      this.angle = -Math.PI / 2; // 垂直向上
    } else if (mode === 'SWARM') {
      const delay = 0.5;
      const historyIndex = Math.floor(this.index * delay);
      const point = trailPoints[trailPoints.length - 1 - historyIndex] || trailPoints[0] || target;
      
      tx = point.x;
      ty = point.y;
      this.vx += (tx - this.x) * force;
      this.vy += (ty - this.y) * force;
      this.vx *= 0.75;
      this.vy *= 0.75;
      this.angle = Math.atan2(this.vy, this.vx);
    } else if (mode === 'SHIELD') {
      // 自转的球形防御罩
      const radius = 420; // 调大球体，使自转更自然
      const time = performance.now() * 0.0015;
      
      const sPhi = this.phi;
      const sTheta = this.theta + time;

      tx = target.x + radius * Math.sin(sPhi) * Math.cos(sTheta);
      ty = target.y + radius * Math.sin(sPhi) * Math.sin(sTheta);
      tz = radius * Math.cos(sPhi);
      
      this.vx = (tx - this.x) * 0.15;
      this.vy = (ty - this.y) * 0.15;
      this.vz = (tz - this.z) * 0.15;
      this.angle = Math.atan2(this.y - target.y, this.x - target.x);
    } else if (mode === 'FORMATION') {
        const ring = Math.floor(this.index / 60);
        const posInRing = this.index % 60;
        const radius = (ring + 1) * 80;
        const orbitAngle = (posInRing / 60) * Math.PI * 2 + performance.now() * 0.0005 * (ring % 2 ? 1 : -1);
        
        tx = target.x + Math.cos(orbitAngle) * radius;
        ty = target.y + Math.sin(orbitAngle) * radius;
        this.vx = (tx - this.x) * 0.2;
        this.vy = (ty - this.y) * 0.2;
        this.angle = orbitAngle + Math.PI / 2;
    } else if (mode === 'SCATTER') {
      // 散开模式：满屏飞舞
      if (!this.scatterTarget) {
        this.scatterTarget = {
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vz: (Math.random() - 0.5) * 500
        };
      }
      tx = this.scatterTarget.x;
      ty = this.scatterTarget.y;
      tz = this.scatterTarget.vz;

      this.vx += (tx - this.x) * 0.05;
      this.vy += (ty - this.y) * 0.05;
      this.vz += (tz - this.z) * 0.05;
      this.vx *= 0.92;
      this.vy *= 0.92;
      this.vz *= 0.92;
      this.angle += 0.1;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
  }

  draw(ctx) {
    const perspective = 800;
    const scale = perspective / (perspective - this.z);
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(scale, scale);
    
    const alpha = Math.max(0.3, (perspective + this.z) / perspective);
    ctx.globalAlpha = alpha;

    // 增加辉光效果
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.color;

    ctx.beginPath();
    ctx.moveTo(-this.length / 2, 0);
    ctx.lineTo(this.length / 2, 0);
    ctx.lineWidth = this.width;
    ctx.strokeStyle = this.color;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 剑格
    ctx.beginPath();
    ctx.moveTo(-this.length / 4, -this.width * 2.5);
    ctx.lineTo(-this.length / 4, this.width * 2.5);
    ctx.lineWidth = this.width * 0.8;
    ctx.stroke();

    ctx.restore();
  }
}

const initSwords = () => {
  swords = [];
  for (let i = 0; i < swordCount; i++) {
    swords.push(new Sword(i));
  }
};

const drawStreamPath = () => {
    // 放弃极光轨迹，不再绘制 stroke
}

const animate = () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, gameCanvas.value.width, gameCanvas.value.height);

  swords.forEach(sword => {
    sword.update(currentMode.value, targetPos);
    sword.draw(ctx);
  });

  requestAnimationFrame(animate);
};

const onResults = (results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    
    // 坐标映射 (使用食指指尖)
    const indexTip = landmarks[8];
    const nx = (1 - indexTip.x) * window.innerWidth;
    const ny = indexTip.y * window.innerHeight;
    
    targetPos.x = nx;
    targetPos.y = ny;

    // 记录轨迹点
    trailPoints.push({ x: nx, y: ny });
    if (trailPoints.length > maxTrailLen) trailPoints.shift();

    // 双手检测
    if (results.multiHandLandmarks.length >= 2) {
        const lm2 = results.multiHandLandmarks[1];
        const dist = Math.hypot(landmarks[0].x - lm2[0].x, landmarks[0].y - lm2[0].y);
        isHandsTogether = dist < 0.15; // 双手合并
    } else {
        isHandsTogether = false;
    }

    // 手势识别
    detectGesture(landmarks);
  }
};

const detectGesture = (lm) => {
  // 鲁棒性更强的检测：计算指尖到掌根(0)的距离，与指根到掌根距离的比例
  const dist = (p1, p2) => Math.hypot(lm[p1].x - lm[p2].x, lm[p1].y - lm[p2].y);
  
  // 基准比例尺：掌根到食指根部的距离
  const baseLen = dist(0, 5); 
  
  // 判定是否伸出：指尖到掌根距离 > 指根到掌根距离的 1.2 倍
  const isExtended = (tip, root) => dist(0, tip) > dist(0, root) * 1.2;

  const indexActive = isExtended(8, 5);
  const middleActive = isExtended(12, 9);
  const ringActive = isExtended(16, 13);
  const pinkyActive = isExtended(20, 17);
  // 拇指比较特殊，判断它是否远离手掌中心
  const thumbActive = dist(4, 13) > baseLen * 1.2; 

  // 1. 摇滚手势 (� Index + Pinky) -> SHIELD (大球形防御罩)
  if (indexActive && pinkyActive && !middleActive && !ringActive) {
    currentMode.value = 'SHIELD';
  }
  // 2. 剪刀手 (✌️ Index + Middle) -> STREAM (如水剑流)
  else if (indexActive && middleActive && !ringActive && !pinkyActive) {
    currentMode.value = 'STREAM';
  }
  // 3. 大拇指 (👍 Only Thumb) -> FORMATION (圆面防御阵)
  else if (thumbActive && !indexActive && !middleActive && !ringActive && !pinkyActive) {
    currentMode.value = 'FORMATION';
  }
  // 4. 握拳 (Fist) -> GIANT_SWORD (巨剑模式)
  else if (!indexActive && !middleActive && !ringActive && !pinkyActive) {
    currentMode.value = 'GIANT_SWORD';
  } 
  // 5. 五指展开 (Palm Open) -> SCATTER (散开)
  else if (indexActive && middleActive && ringActive && pinkyActive) {
    currentMode.value = 'SCATTER';
  }
  // 6. 其他 (指挥剑流)
  else {
    currentMode.value = 'SWARM';
  }
};

const requestCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.value.srcObject = stream;
    cameraAccessible.value = true;
    
    hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    hands.onResults(onResults);

    camera = new Camera(videoElement.value, {
      onFrame: async () => {
        await hands.send({ image: videoElement.value });
      },
      width: 640,
      height: 480
    });
    camera.start();
  } catch (err) {
    console.error("Camera access failed:", err);
  }
};

const goBack = () => router.push({ name: 'GameCenter' });

onMounted(() => {
  gameCanvas.value.width = window.innerWidth;
  gameCanvas.value.height = window.innerHeight;
  ctx = gameCanvas.value.getContext('2d');
  
  initSwords();
  animate();

  window.addEventListener('resize', () => {
    gameCanvas.value.width = window.innerWidth;
    gameCanvas.value.height = window.innerHeight;
  });
});

onUnmounted(() => {
  if (camera) camera.stop();
});
</script>

<style scoped>
.sword-game-container {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: #000;
  overflow: hidden;
  z-index: 2000;
  font-family: 'Orbitron', -apple-system, sans-serif;
}

.game-canvas {
  position: absolute;
  top: 0; left: 0;
  z-index: 5;
}

/* --- 星空背景 --- */
.space-background {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle at center, #1b2735 0%, #090a0f 100%);
}

.stars {
  position: absolute;
  width: 100%; height: 100%;
  background: transparent url('https://s3-us-west-2.amazonaws.com/s.cdpn.io/123163/stars.png') repeat;
}

.twinkling {
  position: absolute;
  width: 100%; height: 100%;
  background: transparent url('https://s3-us-west-2.amazonaws.com/s.cdpn.io/123163/twinkling.png') repeat;
  animation: move-twink 200s linear infinite;
}

@keyframes move-twink {
  from { background-position: 0 0; }
  to { background-position: -10000px 5000px; }
}

/* --- UI 元素 --- */
.game-header {
  position: absolute;
  top: 0; left: 0; width: 100%;
  padding: 30px 50px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 10;
  pointer-events: none;
}

.title-group h1 {
  font-size: 3rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: 8px;
  margin: 0;
  text-shadow: 0 0 20px rgba(79, 172, 254, 0.5);
}

.subtitle {
  color: #4facfe;
  letter-spacing: 4px;
  font-size: 0.8rem;
  margin-top: 5px;
}

.control-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 20px;
  pointer-events: auto;
}

.gesture-guide {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.guide-item {
  color: #888;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.guide-item.active {
  color: #fff;
  text-shadow: 0 0 10px #4facfe;
  transform: translateX(-5px);
}

.exit-btn {
  background: transparent;
  border: 1px solid #ff5252;
  color: #ff5252;
  padding: 8px 24px;
  border-radius: 4px;
  cursor: pointer;
  transition: 0.3s;
}

.exit-btn:hover {
  background: #ff5252;
  color: #fff;
  box-shadow: 0 0 20px rgba(255, 82, 82, 0.4);
}

/* --- 摄像头小窗 --- */
.detector-overlay {
  position: absolute;
  bottom: 30px; left: 30px;
  width: 180px; height: 135px;
  background: #000;
  border: 1px solid rgba(79, 172, 254, 0.3);
  border-radius: 8px;
  overflow: hidden;
  z-index: 10;
}

.input-video {
  width: 100%; height: 100%; object-fit: cover;
  transform: scaleX(-1);
  opacity: 0.4;
}

.gesture-status {
  position: absolute;
  bottom: 0; left: 0; width: 100%;
  background: rgba(0,0,0,0.6);
  padding: 5px 10px;
  font-size: 0.7rem;
  display: flex;
  gap: 5px;
}

.status-value { color: #4facfe; font-weight: bold; }

/* --- 初始化 --- */
.init-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.init-content {
  text-align: center;
}

.init-btn {
  margin-top: 30px;
  padding: 15px 40px;
  background: #4facfe;
  border: none;
  color: #000;
  font-weight: bold;
  font-size: 1.2rem;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 0 30px rgba(79, 172, 254, 0.5);
  transition: 0.3s;
}

.init-btn:hover {
  transform: scale(1.05);
  background: #00f2fe;
}

/* Glitch Effect */
.glitch {
  position: relative;
}
.glitch::before, .glitch::after {
  content: attr(data-text);
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  opacity: 0.8;
}
.glitch::after { color: #f0f; z-index: -1; animation: glitch 0.3s infinite; }
.glitch::before { color: #0ff; z-index: -2; animation: glitch 0.3s reverse infinite; }

@keyframes glitch {
  0% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
  100% { transform: translate(0); }
}
</style>
