<template>
  <div class="game-center-container" :class="{ 'dark-mode': userStore.theme === 'dark' }">
    <div class="header">
      <h1>🎮 游戏中心 Game Center</h1>
      <p>学习之余，来一把轻松的小游戏吧！</p>
    </div>

    <div class="game-cards">
      <!-- 气泡作战 Card -->
      <div class="game-card bubble-card" @click="playGame('BubbleGame')">
        <div class="card-icon">🫧</div>
        <div class="card-content">
          <h3>气泡作战</h3>
          <p>消除飞舞的气泡，挑战你的反应速度与词汇量。</p>
          <button class="play-btn">立即开始</button>
        </div>
      </div>

      <!-- 
      <div class="game-card carrot-card" @click="playGame('CarrotGame')">
        <div class="card-icon">🥕</div>
        <div class="card-content">
          <h3>萝卜纸巾</h3>
          <p>切掉正确的单词卡片，在指尖滑动中巩固记忆。</p>
          <button class="play-btn">立即开始</button>
        </div>
      </div>

      
      <div class="game-card sword-card" @click="playGame('SwordGame')">
        <div class="card-icon">⚔️</div>
        <div class="card-content">
          <h3>王剑归宗</h3>
          <p>手控剑流，心随意动。通过手势指挥万千剑影。</p>
          <button class="play-btn">进入协议</button>
        </div>
      </div>
      -->
    </div>

    <div class="back-home" @click="router.push('/')">
      <span>⬅️ 返回首页</span>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { userStore } from '../store/user.js';

const router = useRouter();

const playGame = (gameName) => {
  router.push({ name: gameName });
};
</script>

<style scoped>
.game-center-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f4f8 0%, #d7e3ec 100%);
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  transition: all 0.3s ease;
}

.game-center-container.dark-mode {
  background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
  color: #e2e8f0;
}

.header {
  text-align: center;
  margin-bottom: 50px;
}

.header h1 {
  font-size: 2.5rem;
  color: #2d3748;
  margin-bottom: 10px;
}

.dark-mode .header h1 {
  color: #f7fafc;
}

.header p {
  color: #4a5568;
  font-size: 1.1rem;
}

.dark-mode .header p {
  color: #a0aec0;
}

.game-cards {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 1000px;
}

.game-card {
  background: white;
  border-radius: 24px;
  padding: 30px;
  width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.8);
}

.dark-mode .game-card {
  background: #2d3748;
  border-color: rgba(255,255,255,0.05);
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

.game-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 35px rgba(0,0,0,0.1);
}

.card-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.card-content h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
  color: #2d3748;
}

.dark-mode .card-content h3 {
  color: #f7fafc;
}

.card-content p {
  color: #718096;
  line-height: 1.6;
  margin-bottom: 25px;
  height: 50px;
}

.dark-mode .card-content p {
  color: #a0aec0;
}

.play-btn {
  background: #4a90e2;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.bubble-card:hover .play-btn { background: #357abd; }
.carrot-card:hover .play-btn { background: #f39c12; }

.carrot-card .play-btn { background: #e67e22; }
.sword-card:hover .play-btn { background: #5d3fd3; }
.sword-card .play-btn { background: #6f42c1; }

.back-home {
  margin-top: 60px;
  color: #4a90e2;
  font-weight: 500;
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 10px;
  transition: background 0.2s;
}

.back-home:hover {
  background: rgba(74, 144, 226, 0.1);
}

@media (max-width: 768px) {
  .game-card {
    width: 280px;
  }
}
</style>
