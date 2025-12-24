<template>
  <div class="horse-racing-container">
    <div v-if="gameState === 'matching'" class="matching-screen">
      <div class="loading-spinner"></div>
      <p>正在寻找对手，请稍候...</p>
    </div>

    <div v-if="gameState === 'preparing'" class="preparation-screen">
      <h2>请安排出马顺序</h2>
      <div class="timer">倒计时: {{ preparationTime }}s</div>
      
      <div class="my-horses">
        <div class="horse-slot" v-for="(slot, index) in mySlots" :key="index">
          第 {{ index + 1 }} 局:
          <select v-model="mySlots[index]">
            <option value="high" :disabled="isHorseUsed('high', index)">上等马</option>
            <option value="mid" :disabled="isHorseUsed('mid', index)">中等马</option>
            <option value="low" :disabled="isHorseUsed('low', index)">下等马</option>
          </select>
        </div>
      </div>
      <button @click="confirmStrategy" :disabled="!isStrategyComplete">确认出战</button>
    </div>

    <div v-if="gameState === 'racing'" class="racing-screen">
      <h3>第 {{ currentRound }} 局 / 共 3 局</h3>
      
      <div class="track-container">
        <div class="track-bg"></div>
        
        <div class="lane" v-for="player in players" :key="player.id">
          <div class="horse-wrapper" :style="{ left: player.progress + '%' }">
            <img :src="getHorseImage(player.currentHorseType)" class="horse-img" :class="{ 'running': isRaceOn }">
            <span class="player-name">{{ player.name }}</span>
          </div>
        </div>
      </div>

      <div v-if="showCardModal" class="card-modal">
        <h3>到达补给点！请抽牌并出牌</h3>
        <div class="hand-cards">
          <div 
            v-for="(card, index) in myHandCards" 
            :key="index"
            class="poker-card"
            :class="{ 'selected': selectedCards.includes(index) }"
            @click="toggleCardSelection(index)"
          >
            {{ card.suit }}{{ card.rank }}
          </div>
        </div>
        <button @click="playCards" :disabled="selectedCards.length === 0">出牌加速!</button>
      </div>
    </div>

    <div v-if="gameState === 'result'" class="result-screen">
      <h2>比赛结束!</h2>
      <div class="winner-announcement">
        {{ gameResult.winnerId === myPlayerId ? '恭喜你获胜！🎉' : '很遗憾，你输了。' }}
      </div>
      <div class="score-details">
        比分: 我方 {{ gameResult.myScore }} - {{ gameResult.opponentScore }} 对方
      </div>
      <button @click="resetGame">返回大厅</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
// 假设你有一个 socket 实例，可以是全局注入的，也可以是这里引入的
// import socket from '@/utils/socket'; 

const gameState = ref('matching'); // matching, preparing, racing, result
const myPlayerId = ref(null);
const players = ref([]); // 包含所有玩家信息的数组
const currentRound = ref(1);
const isRaceOn = ref(false);

// 准备阶段相关
const preparationTime = ref(15);
const mySlots = ref([null, null, null]); // 存储我方三局的出马选择

// 比赛阶段相关
const showCardModal = ref(false);
const myHandCards = ref([]);
const selectedCards = ref([]);

// --- WebSocket 事件监听与处理 ---
onMounted(() => {
  // 模拟 socket 连接
  // socket.connect();
  
  // 1. 监听匹配成功
  // socket.on('match-success', (data) => {
  //   gameState.value = 'preparing';
  //   myPlayerId.value = data.myId;
  //   players.value = data.players.map(p => ({ ...p, progress: 0, currentHorseType: null }));
  //   startPrepTimer();
  // });

  // 2. 监听每一局开始
  // socket.on('round-start', (data) => {
  //   gameState.value = 'racing';
  //   currentRound.value = data.round;
  //   // 更新每位玩家当前局的马匹类型
  //   data.horseAssignments.forEach(assign => {
  //     const player = players.value.find(p => p.id === assign.playerId);
  //     if (player) player.currentHorseType = assign.horseType;
  //   });
  //   startRaceAnimation();
  // });

  // 3. 监听位置更新 (后端定期广播)
  // socket.on('update-positions', (data) => {
  //   data.positions.forEach(pos => {
  //     const player = players.value.find(p => p.id === pos.playerId);
  //     if (player) player.progress = pos.progress; // 0-100 的百分比
  //   });
  // });
  
  // 4. 监听触发补给点
  // socket.on('trigger-checkpoint', (data) => {
  //   if (data.playerId === myPlayerId.value) {
  //     myHandCards.value = data.cards; // 接收发来的牌
  //     showCardModal.value = true;
  //     selectedCards.value = [];
  //   }
  // });

  // 5. 监听游戏结束
  // socket.on('game-over', (data) => {
  //   gameState.value = 'result';
  //   gameResult.value = data;
  // });
  
  // --- 模拟流程用于演示 ---
  setTimeout(() => { gameState.value = 'preparing'; }, 2000);
});

onUnmounted(() => {
  // socket.disconnect();
});

// --- 方法 ---

// 检查某个马匹类型是否已被其他局选择
const isHorseUsed = (type, currentIndex) => {
  return mySlots.value.some((slot, index) => index !== currentIndex && slot === type);
};

const isStrategyComplete = computed(() => {
  return mySlots.value.every(slot => slot !== null);
});

const confirmStrategy = () => {
  // 发送策略给后端
  // socket.emit('submit-strategy', { slots: mySlots.value });
  console.log('策略已提交:', mySlots.value);
  // 等待后端通知开始比赛
};

const startRaceAnimation = () => {
  isRaceOn.value = true;
  // 这里只是触发 CSS 动画状态，实际位置由后端 update-positions 事件驱动
};

// 扑克牌交互
const toggleCardSelection = (index) => {
  const selectedIndex = selectedCards.value.indexOf(index);
  if (selectedIndex > -1) {
    selectedCards.value.splice(selectedIndex, 1);
  } else {
    // 可以添加限制，比如最多选5张
    if (selectedCards.value.length < 5) {
      selectedCards.value.push(index);
    }
  }
};

const playCards = () => {
  const cardsToPlay = selectedCards.value.map(idx => myHandCards.value[idx]);
  // 发送出牌请求给后端
  // socket.emit('play-cards', { cards: cardsToPlay });
  console.log('出牌:', cardsToPlay);
  
  showCardModal.value = false;
  // 清空手牌和选择项，等待后端广播新的速度结果
  myHandCards.value = [];
  selectedCards.value = [];
};

// 辅助方法
const getHorseImage = (type) => {
  const map = {
    'high': '/images/horse-high.png',
    'mid': '/images/horse-mid.png',
    'low': '/images/horse-low.png',
  };
  return map[type] || '/images/horse-default.png';
};
</script>

<style scoped>
.horse-racing-container {
  /* 容器样式，可以是全屏弹窗或页面的一部分 */
  width: 100%;
  height: 600px;
  background: #f0f2f5;
  position: relative;
  overflow: hidden;
}

/* 匹配、准备、结算界面的基础样式 */
.matching-screen, .preparation-screen, .result-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: rgba(255,255,255,0.9);
}

/* 赛道区域 */
.track-container {
  position: relative;
  width: 100%;
  height: 300px; /* 根据需要调整 */
  background: url('/images/track-bg.png') no-repeat center center;
  background-size: cover;
  margin-top: 20px;
}

.lane {
  position: relative;
  height: 80px; /* 每条跑道的高度 */
  border-bottom: 1px dashed rgba(0,0,0,0.1);
}

/* 马匹包裹器，利用 left 属性控制进度 */
.horse-wrapper {
  position: absolute;
  left: 0; /* 初始位置 */
  top: 50%;
  transform: translateY(-50%);
  /* 关键：使用 transition 实现平滑的移动效果 */
  transition: left 0.5s linear; 
  display: flex;
  flex-direction: column;
  align-items: center;
}

.horse-img {
  width: 60px;
  height: auto;
}

/* 简单的跑步动画，让马看起来在动 */
.horse-img.running {
  animation: gallop 0.6s infinite alternate ease-in-out;
}

@keyframes gallop {
  0% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-5px) rotate(2deg); }
  100% { transform: translateY(0) rotate(0deg); }
}

/* 扑克牌弹窗 */
.card-modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 100;
  text-align: center;
}

.hand-cards {
  display: flex;
  gap: 10px;
  margin: 20px 0;
  justify-content: center;
}

.poker-card {
  width: 50px;
  height: 70px;
  border: 1px solid #ccc;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
}

.poker-card.selected {
  background: #e6f7ff;
  border-color: #1890ff;
  transform: translateY(-10px);
}
</style>