<template>
  <div class="games-page">
    
    <div class="bg-blob blob-top-left"></div>
    <div class="bg-blob blob-bottom-right"></div>

    <div class="page-content">
      <h1>轻松娱乐</h1>
      <div class="games-grid">
        
        <div class="game-card bubble-card" @click="navigateToGame('BubbleGame')">
          <div class="bg-decoration"></div>
          <div class="content-wrapper">
            <div class="game-icon">🫧</div>
            <h2>气泡打字</h2>
            <p>击碎气泡，练习单词</p>
          </div>
        </div>

        <div class="game-card card-card disabled" @click="showComingSoon">
          <div class="bg-decoration"></div>
          <div class="content-wrapper">
            <div class="game-icon">🃏</div>
            <h2>卡牌对战</h2>
            <p>策略与运气的结合</p>
          </div>
          <div class="lock-overlay">🔒</div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';

const router = useRouter();
const toast = useToast();

const navigateToGame = (gameName) => {
  router.push({ name: gameName });
};

const showComingSoon = () => {
  toast.info('“卡牌游戏” 正在火速开发中，敬请期待！');
};
</script>

<style scoped>
/* === 1. 页面整体背景 === */
.games-page {
  position: relative;
  min-height: 100vh; /* 撑满屏幕 */
  padding: 40px;
  text-align: center;
  overflow: hidden; /* 防止背景光斑溢出出现滚动条 */
  
  /* 基础背景色：极淡的灰白，护眼 */
  background-color: #f8f9fc;
  
  /* 基础纹理：淡灰色点阵，增加细节感 */
  background-image: radial-gradient(#e3e6ee 2px, transparent 2px);
  background-size: 30px 30px;
}

/* === 2. 氛围光斑 (Atmosphere Blobs) === */
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px); /* 强力高斯模糊，制造柔光效果 */
  opacity: 0.6;
  z-index: 0; /* 放在最底层 */
  animation: floatBlobs 10s infinite alternate ease-in-out;
}

/* 左上角：蓝色光斑 (呼应气泡游戏) */
.blob-top-left {
  top: -100px;
  left: -100px;
  width: 500px;
  height: 500px;
  background: rgba(79, 172, 254, 0.2); /* 淡淡的蓝 */
}

/* 右下角：紫色光斑 (呼应卡牌游戏) */
.blob-bottom-right {
  bottom: -100px;
  right: -100px;
  width: 600px;
  height: 600px;
  background: rgba(118, 75, 162, 0.2); /* 淡淡的紫 */
  animation-delay: -5s; /* 错开动画时间 */
}

/* 光斑漂浮动画 */
@keyframes floatBlobs {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, 50px) scale(1.1); }
}

/* === 3. 内容层级控制 === */
.page-content {
  position: relative;
  z-index: 1; /* 保证内容在光斑之上 */
}

/* 标题样式微调 */
h1 {
  font-size: 2.5rem;
  margin-bottom: 50px;
  font-weight: 800;
  background: linear-gradient(45deg, #2b5876, #4e4376); /* 深蓝紫渐变，对比度更高 */
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 2px;
  /* 加一点投影让字飘起来 */
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 40px;
  max-width: 900px;
  margin: 0 auto;
}

/* === 以下为卡片原有样式 (未变动) === */
.game-card {
  position: relative;
  height: 220px;
  border-radius: 24px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: none;
}

.game-card:hover {
  transform: translateY(-10px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.content-wrapper {
  position: relative;
  z-index: 2;
  color: white;
}

.game-icon {
  font-size: 4rem;
  margin-bottom: 15px;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
  transition: transform 0.3s ease;
}

.game-card:hover .game-icon {
  transform: scale(1.1) rotate(5deg);
}

h2 {
  font-size: 1.8rem;
  margin-bottom: 8px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: 500;
}

/* 气泡卡片 */
.bubble-card {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
.bubble-card .bg-decoration {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 150px;
  height: 150px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  z-index: 1;
}
.bubble-card .bg-decoration::before {
  content: '';
  position: absolute;
  bottom: -50px;
  left: -100px;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
}

/* 卡牌卡片 */
.card-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.card-card .bg-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 180px;
  height: 180px;
  border: 20px solid rgba(255, 255, 255, 0.05);
  z-index: 1;
}

.game-card.disabled {
  cursor: not-allowed;
  filter: grayscale(60%) opacity(0.8); 
}
.game-card.disabled:hover {
  transform: none;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}
.lock-overlay {
  position: absolute;
  top: 15px;
  right: 15px;
  font-size: 1.5rem;
  opacity: 0.6;
  z-index: 3;
}

/* === 暗黑模式适配 (如果您的项目有 .dark 类) === */
.dark .games-page {
  background-color: #1a1a2e; /* 深蓝黑底 */
  background-image: radial-gradient(#2d2d44 2px, transparent 2px);
}
.dark .blob-top-left {
  background: rgba(79, 172, 254, 0.1);
}
.dark .blob-bottom-right {
  background: rgba(118, 75, 162, 0.1);
}
.dark h1 {
  background: linear-gradient(45deg, #fff, #a18cd1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>