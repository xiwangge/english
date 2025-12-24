<template>
  <div class="main-layout" :class="userStore.theme">
    <div class="sidebar">
      <div class="user-info" 
        :class="{ 'is-loading': isUserLoading }"
        @click="handleUserClick">
        <img :src="avatarUrl" alt="头像" class="user-avatar">
        
        <div class="user-greeting">
          <span class="welcome-text">{{ userStore.user.nickname || '游客' }}</span><br>
          <span v-if="!formattedExpiryDate" class="sub-text">Welcome back!</span>
          <span v-else class="expiry-date">
            <svg class="vip-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
            <!-- 会员到期:  --> {{ formattedExpiryDate }}
          </span>
        </div>

        <div class="hover-hint">
          <span class="icon">⚙️</span>
          <span class="text">设置</span>
        </div>

        <div class="loading-mask" v-if="isUserLoading">
          <div class="spinner"></div>
        </div>

      </div>

      <nav class="nav-menu">
        <a href="#" @click.prevent="navigateTo('home')" :class="{ active: activeMenu === 'home' }">
          <span class="icon">🏠</span> 首    页
        </a>
        <a href="#" @click.prevent="navigateTo('my')" :class="{ active: activeMenu === 'my' }">
          <span class="icon">👤</span> 我的课程
        </a>
        <a href="#" @click.prevent="navigateTo('book')" :class="{ active: activeMenu === 'book' }" ref="bookButton">
          <span class="icon">📚</span> 英语课程
        </a>
        <a href="#" @click.prevent="handleProgrammingClick">
          <span class="icon">💻</span> 编程课程
        </a>
        <a href="#" @click.prevent="navigateTo('typing')" :class="{ active: activeMenu === 'typing' }">
          <span class="icon">⌨️</span> 键盘练习
        </a>
        <a href="#" @click.prevent="navigateTo('BubbleGame')" :class="{ active: activeMenu === 'BubbleGame' }">
         <span class="icon">🎮</span> 气泡作战
       </a>
        <a href="#" @click.prevent="navigateTo('reward')" :class="{ active: activeMenu === 'reward' }">
          <span class="icon">💰</span> 邀请奖励
        </a>
        <!-- <a href="#" @click.prevent="navigateTo('messages')" :class="{ active: activeMenu === 'messages' }">
          <span class="icon">✉️</span> 留言提案
        </a> -->
        

        <!-- <a href="#" @click.prevent="navigateTo('race')" :class="{ active: activeMenu === 'race' }">
          <span class="icon">✉️</span> race
        </a> -->

      </nav>

      <div class="sidebar-footer">
        <!-- 替换为 Canvas 小猫动画 -->
        <div class="mascot-container">
          <canvas id="catCanvas"></canvas>
        </div>
      </div>

    </div>

    <div class="content-area" id="content-area">
      <div class="content-header" :style="{ background: headerBgColor }">
        <div class="header-actions">
          <button @click="userStore.toggleTheme" class="theme-toggle-btn">
            <span v-if="userStore.theme === 'light'">🌙</span>
            <span v-else>☀️</span>
          </button>
          <button v-if="!userStore.user.nickname" @click="redirectToLogin" class="auth-button">
            登录
          </button>
          <button v-else @click="handleLogout" class="auth-button">
            退出
          </button>
        </div>
      </div>
      <div class="router-view-wrapper">
        <router-view></router-view>
      </div>
    </div>

    <!-- 登录提示模态框 -->
    <div v-if="showLoginModal" class="modal-overlay" @click="closeLoginModal">
      <div class="modal-content" @click.stop>
        <h3>请登录</h3>
        <p>您需要登录后才能访问“我的课程”。</p>
        <div class="modal-actions">
          <button @click="closeLoginModal" class="btn-secondary">稍后</button>
          <button @click="redirectToLogin" class="btn-primary">去登录</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, provide } from 'vue';
import { useRouter } from 'vue-router';
import { userStore } from '../store/user.js';
import { useToast } from 'vue-toastification';

const router = useRouter();
const toast = useToast();
const bookButton = ref(null);

const activeMenu = ref('home');
const showLoginModal = ref(false); // 控制模态框显示

// For dynamic header background color
const headerBgColor = ref('transparent'); // Default color
const setHeaderBgColor = (color) => {
  headerBgColor.value = color;
};
provide('setHeaderBgColor', setHeaderBgColor);

const avatarUrl = computed(() => {
  const avatar = userStore.user.avatar;
  if (!avatar) {
    return '/images/bubu.png'; // 默认头像
  }
  if (avatar.startsWith('http')) {
    return avatar; // 微信头像，直接使用
  }
  if (avatar.includes('penguins')) {
    return `/images/${avatar}`;
  }
  return `/images/${avatar}`; // 自选头像，拼接路径
});

const formattedExpiryDate = computed(() => {
  const expiry = userStore.user.subscriptionExpiry;
  if (!expiry) return null;
  const date = new Date(expiry);
  if (date < new Date()) return '已过期';
  return date.toLocaleDateString();
});

function navigateTo(page) {
  const token = localStorage.getItem('token');
  if (page === 'my' && !token) {
    showLoginModal.value = true; // 替换 alert
    return;
  }
  activeMenu.value = page;
  router.push({ name: page });
}

function closeLoginModal() {
  showLoginModal.value = false;
}

function redirectToLogin() {
  showLoginModal.value = false;
  router.push({ name: 'login' });
}

function handleLogout() {
  localStorage.removeItem('token');
  userStore.setUser({}); // 清空用户信息
  router.push({ name: 'login' });
}

function handleProgrammingClick() {
  toast.info('“编程课程” 正在火速开发中，敬请期待！');
}

// --- 小猫 Canvas 动画逻辑开始 ---

function initCatAnimation() {
    const canvas = document.getElementById('catCanvas');
    if (!canvas) {
        // 如果元素尚未渲染，则退出
        return;
    }
    const ctx = canvas.getContext('2d');

    let width, height;
    let lastTime = 0;
    
    // 眨眼状态和计时器
    let blinkTimer = 0;
    let isBlinking = false;
    const BLINK_INTERVAL = 2000; // 2秒眨一次眼
    const BLINK_DURATION = 150;  // 眨眼持续时间

    // 喵喵叫状态和计时器 (替换微笑逻辑)
    let meowTimer = 0;
    let isMeowing = false;
    const MEOW_INTERVAL = 2000; // 2秒喵一次
    const MEOW_DURATION = 400; // 喵叫持续 0.4 秒

    // 关键：缩小到原来的 2/3
    const SIZE_MULTIPLIER = 2 / 3; 

    // 小猫的颜色配置
    const CAT_COLOR = '#fcf0e2';       // 浅米白 / 奶油色
    const CAT_SHADOW_COLOR = '#D4C4B5'; // 稍微深一点的米灰色作为阴影/轮廓
    const HAT_COLOR = '#ff8a65';       // 亮红色
    const HAT_BORDER_COLOR = '#currentColor'; // 稍浅一点的红色用于帽檐
    const MOUTH_NOSE_COLOR = '#FF8A80'; // 粉色鼻子

    // 绘制基准（未缩放时的坐标）
    const BASE_DRAWING_WIDTH = 250; 
    const ORIGINAL_CAT_TOP_Y = -145;  
    const ORIGINAL_CAT_BOTTOM_Y = 160; 
    const ORIGINAL_CAT_HEIGHT = ORIGINAL_CAT_BOTTOM_Y - ORIGINAL_CAT_TOP_Y; 
    const ORIGINAL_CENTER_OF_CAT_Y = (ORIGINAL_CAT_TOP_Y + ORIGINAL_CAT_BOTTOM_Y) / 2; 

    // 关键：匹配 .mascot-container 的 CSS 宽度 160px
    const TARGET_CANVAS_WIDTH = 160; 
    const TOP_BOTTOM_PADDING = 5; 

    // 辅助函数：绘制圆角矩形
    function drawRoundRect(x, y, w, h, radius, color) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    // 辅助函数：绘制椭圆
    function drawEllipse(x, y, radiusX, radiusY, rotation, color) {
        ctx.beginPath();
        ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }
    
    // 主绘制函数（前置声明）
    function draw(timestamp) {
        // 1. 清空画布
        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        
        // 计算缩放比例
        const fullScale = width / BASE_DRAWING_WIDTH;
        const effectiveScale = fullScale * SIZE_MULTIPLIER; // 应用 2/3 缩小

        // 垂直居中计算
        const canvasCenterY = height / 2;
        const catCenterYOffset = ORIGINAL_CENTER_OF_CAT_Y * effectiveScale;
        const centerY = canvasCenterY - catCenterYOffset; 
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(effectiveScale, effectiveScale); // 使用缩小后的有效比例

        // --- 绘制开始 (坐标系以 0,0 为中心) ---

        // 2. 绘制尾巴
        ctx.beginPath();
        ctx.moveTo(80, 100); 
        ctx.bezierCurveTo(130, 80, 150, 20, 120, 0); 
        ctx.bezierCurveTo(100, -20, 90, 40, 90, 100); 
        ctx.closePath();
        ctx.fillStyle = CAT_COLOR;
        ctx.fill();
        ctx.strokeStyle = CAT_SHADOW_COLOR;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // 3. 绘制身体
        ctx.fillStyle = CAT_COLOR;
        ctx.strokeStyle = CAT_SHADOW_COLOR;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(-60, -20);
        ctx.bezierCurveTo(-110, 80, -110, 150, -70, 160); 
        ctx.lineTo(70, 160); 
        ctx.bezierCurveTo(110, 150, 110, 80, 60, -20); 
        ctx.closePath();
        ctx.fill();
        ctx.stroke(); 

        // 4. 绘制前腿/爪子
        ctx.fillStyle = CAT_SHADOW_COLOR; 
        drawEllipse(-25, 155, 20, 25, 0, CAT_SHADOW_COLOR); 
        drawEllipse(25, 155, 20, 25, 0, CAT_SHADOW_COLOR); 

        ctx.fillStyle = CAT_COLOR; 
        drawEllipse(-25, 145, 18, 20, 0, CAT_COLOR); 
        drawEllipse(25, 145, 18, 20, 0, CAT_COLOR);  

        // 增加一点脚趾的线条
        ctx.strokeStyle = CAT_SHADOW_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-35, 145); ctx.lineTo(-15, 145); 
        ctx.moveTo(15, 145); ctx.lineTo(35, 145); 
        ctx.stroke();

        // 5. 绘制前爪在肚子上的轮廓
        ctx.strokeStyle = CAT_SHADOW_COLOR;
        ctx.lineWidth = 1.5;
        // 左爪的轮廓线
        ctx.beginPath();
        ctx.moveTo(-35, 100);
        ctx.quadraticCurveTo(-20, 120, -10, 140);
        ctx.stroke();
        // 右爪的轮廓线
        ctx.beginPath();
        ctx.moveTo(35, 100);
        ctx.quadraticCurveTo(20, 120, 10, 140);
        ctx.stroke();


        // 6. 绘制头部
        ctx.fillStyle = CAT_COLOR;
        ctx.strokeStyle = CAT_SHADOW_COLOR;
        ctx.lineWidth = 3;
        drawEllipse(0, -50, 85, 75, 0, CAT_COLOR);
        ctx.stroke();

        // 7. 绘制耳朵
        // 左耳
        ctx.beginPath();
        ctx.moveTo(-60, -90);
        ctx.lineTo(-80, -130);
        ctx.lineTo(-30, -110);
        ctx.closePath();
        ctx.fillStyle = CAT_COLOR;
        ctx.fill();
        ctx.strokeStyle = CAT_SHADOW_COLOR;
        ctx.lineWidth = 2;
        ctx.stroke();
        // 左耳内侧
        ctx.beginPath();
        ctx.moveTo(-60, -95);
        ctx.lineTo(-72, -120);
        ctx.lineTo(-40, -108);
        ctx.closePath();
        ctx.fillStyle = MOUTH_NOSE_COLOR; 
        ctx.fill();

        // 右耳
        ctx.beginPath();
        ctx.moveTo(60, -90);
        ctx.lineTo(80, -130);
        ctx.lineTo(30, -110);
        ctx.closePath();
        ctx.fillStyle = CAT_COLOR;
        ctx.fill();
        ctx.strokeStyle = CAT_SHADOW_COLOR;
        ctx.lineWidth = 2;
        ctx.stroke();
        // 右耳内侧
        ctx.beginPath();
        ctx.moveTo(60, -95);
        ctx.lineTo(72, -120);
        ctx.lineTo(40, -108);
        ctx.closePath();
        ctx.fillStyle = MOUTH_NOSE_COLOR; 
        ctx.fill();

        // 8. 绘制帽子 (在头部之上)
        ctx.fillStyle = HAT_COLOR;
        ctx.strokeStyle = HAT_COLOR; 
        ctx.lineWidth = 2;
        
        // 帽子主体 (半圆)
        ctx.beginPath();
        ctx.arc(0, -100, 45, Math.PI, 0); 
        ctx.closePath(); 
        ctx.fill();
        ctx.stroke(); 
        
        // 帽子卷边 (圆角矩形)
        drawRoundRect(-50, -105, 100, 25, 10, HAT_BORDER_COLOR);
        ctx.strokeStyle = HAT_BORDER_COLOR;
        ctx.beginPath(); 
        ctx.moveTo(-50 + 10, -105);
        ctx.lineTo(-50 + 100 - 10, -105);
        ctx.quadraticCurveTo(-50 + 100, -105, -50 + 100, -105 + 10);
        ctx.lineTo(-50 + 100, -105 + 25 - 10);
        ctx.quadraticCurveTo(-50 + 100, -105 + 25, -50 + 100 - 10, -105 + 25);
        ctx.lineTo(-50 + 10, -105 + 25);
        ctx.quadraticCurveTo(-50, -105 + 25, -50, -105 + 25 - 10);
        ctx.lineTo(-50, -105 + 10);
        ctx.quadraticCurveTo(-50, -105, -50 + 10, -105);
        ctx.stroke();


        // 帽子顶部的球
        ctx.beginPath();
        ctx.arc(0, -145, 12, 0, Math.PI * 2);
        ctx.fillStyle = HAT_BORDER_COLOR;
        ctx.fill();
        ctx.stroke();


        // 9. 绘制五官
        
        // 眼睛
        const eyeY = -50;
        const eyeXOffset = 35;
        const eyeSize = 8;

        ctx.fillStyle = '#111';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;

        if (isBlinking) {
            // 闭眼
            // 左眼
            ctx.beginPath();
            ctx.moveTo(-eyeXOffset - 10, eyeY);
            ctx.quadraticCurveTo(-eyeXOffset, eyeY + 5, -eyeXOffset + 10, eyeY);
            ctx.stroke();
            // 右眼
            ctx.beginPath();
            ctx.moveTo(eyeXOffset - 10, eyeY);
            ctx.quadraticCurveTo(eyeXOffset, eyeY + 5, eyeXOffset + 10, eyeY);
            ctx.stroke();
        } else {
            // 睁眼
            ctx.beginPath();
            ctx.arc(-eyeXOffset, eyeY, eyeSize, 0, Math.PI * 2); // 左
            ctx.arc(eyeXOffset, eyeY, eyeSize, 0, Math.PI * 2);  // 右
            ctx.fill();
            
            // 眼神高光 (可选)
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(-eyeXOffset - 2, eyeY - 2, 2, 0, Math.PI * 2);
            ctx.arc(eyeXOffset - 2, eyeY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 鼻子
        ctx.fillStyle = MOUTH_NOSE_COLOR;
        ctx.beginPath();
        ctx.moveTo(-5, -35);
        ctx.lineTo(5, -35);
        ctx.lineTo(0, -28);
        ctx.closePath();
        ctx.fill();

        // 嘴巴 (喵喵叫或闭嘴)
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#111';
        
        if (isMeowing) {
            // 张嘴 (模拟喵喵叫)
            const MOUTH_OPEN_COLOR = '#333'; // 深色表示口腔内部
            const TONGUE_COLOR = '#FF99AA'; // 浅粉色舌头

            // 1. 画开口 (椭圆)
            ctx.beginPath();
            // 在鼻子下方
            ctx.ellipse(0, -15, 12, 8, 0, 0, 2 * Math.PI); 
            ctx.fillStyle = MOUTH_OPEN_COLOR;
            ctx.fill();
            
            // 2. 画舌头
            drawEllipse(0, -13, 8, 4, 0, TONGUE_COLOR); 
            
            // 3. 绘制嘴唇轮廓，从鼻子尖向下延伸
            ctx.strokeStyle = '#111';
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(-10, -20); // 左侧唇线
            ctx.moveTo(0, -28);
            ctx.lineTo(10, -20); // 右侧唇线
            ctx.stroke();

        } else {
            // 默认闭嘴 (W形)
            const controlY = -20; 
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.quadraticCurveTo(-5, controlY, -10, -25); // 左半边
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.quadraticCurveTo(5, controlY, 10, -25); // 右半边
            ctx.stroke();
        }

        // 胡须
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#333';
        // 左胡须
        ctx.beginPath(); ctx.moveTo(-60, -40); ctx.lineTo(-90, -45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-60, -32); ctx.lineTo(-95, -32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-60, -24); ctx.lineTo(-90, -20); ctx.stroke();
        // 右胡须
        ctx.beginPath(); ctx.moveTo(60, -40); ctx.lineTo(90, -45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(60, -32); ctx.lineTo(95, -32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(60, -24); ctx.lineTo(90, -20); ctx.stroke();

        ctx.restore(); 
    }

    // 初始化画布尺寸
    function resize() {
        width = TARGET_CANVAS_WIDTH;
        
        // 1. 计算用于绘制的有效缩放比例
        const fullScale = width / BASE_DRAWING_WIDTH;
        const effectiveScale = fullScale * SIZE_MULTIPLIER; // 应用 2/3 缩小
        
        // 2. 根据有效比例计算所需高度 (猫咪实际高度 + 顶部/底部留白)
        const requiredCatHeight = ORIGINAL_CAT_HEIGHT * effectiveScale;
        height = requiredCatHeight + (TOP_BOTTOM_PADDING * 2);

        canvas.width = width;
        canvas.height = height;

        draw(0); // 重绘
    }

    // 动画循环
    function animate(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        // --- 更新眨眼逻辑 (2秒间隔) ---
        blinkTimer += deltaTime;
        if (blinkTimer > BLINK_INTERVAL) {
            isBlinking = true;
            if (blinkTimer > BLINK_INTERVAL + BLINK_DURATION) {
                isBlinking = false;
                blinkTimer = 0; // 重置计时器
            }
        }

        // --- 更新喵喵叫逻辑 (2秒间隔) ---
        meowTimer += deltaTime;
        if (meowTimer > MEOW_INTERVAL) {
            isMeowing = true;
            if (meowTimer > MEOW_INTERVAL + MEOW_DURATION) {
                isMeowing = false;
                meowTimer = 0; // 重置计时器
            }
        }

        draw(timestamp);
        requestAnimationFrame(animate);
    }
    
    // 启动动画
    resize(); 
    requestAnimationFrame(animate);
}

// 在组件挂载后初始化动画
onMounted(() => {
  navigateTo('home');
  initCatAnimation(); // 启动小猫 Canvas 动画
});

// === 新增：处理头像点击状态 ===
const isUserLoading = ref(false);

const handleUserClick = async () => {
  if (isUserLoading.value) return; // 防止重复点击
  
  isUserLoading.value = true;
  
  // 为了让加载动画展示出来（即使用户电脑很快，也展示一瞬间，体验更平滑）
  // 或者如果 navigateTo 是异步的，可以直接 await
  try {
    // 稍微延迟一下 navigateTo 的调用或者等待它完成
    await navigateTo('setting'); 
    
    // 注意：如果是跳转到新路由，组件可能会销毁，下面的代码可能不执行，这没关系。
    // 如果是同页面的组件切换，可以在这里重置状态。
    setTimeout(() => {
      isUserLoading.value = false;
    }, 500); 
  } catch (e) {
    isUserLoading.value = false;
  }
};
</script>

<style scoped>
@import '../assets/index.css';
@import '../assets/book.css';
@import '../assets/book_detail.css';
@import '../assets/practice.css';

.expiry-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  color: var(--primary-color, #f48c25);
  font-weight: 500;
  margin-top: 4px;
}

.vip-icon {
    width: 0.75rem;
    height: 0.75rem;
}

.content-area {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  position: relative; /* 确保子元素的 `position: absolute` 是相对于此容器 */
  overflow: hidden; /* 防止内容溢出 */
}

.content-header {
  padding: 10px 40px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  /* background-color is now controlled by headerBgColor */
  border-bottom: 1px solid var(--border-color, var(--border-color-light)); /* Optional border */
  flex-shrink: 0; /* 防止 header 收缩 */
  z-index: 10;
  transition: background 0.3s ease, border-color 0.3s ease; /* Add transition for smooth color change */
}

.router-view-wrapper {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.auth-button {
  padding: 8px 16px;
  background-color: #fcf0e2;
  color: #e59f42;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.dark .auth-button {
  background-color: rgba(229, 159, 66, 0.2);
  color: #ed8936;
}

.auth-button:hover {
  background-color: #ff7043; /* A slightly darker shade of primary-color */
  color: white;
}
.dark .auth-button:hover {
  background-color: #ed8936;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-toggle-btn {
  background: none;
  border: 1px solid var(--border-color-light);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.theme-toggle-btn:hover {
  background-color: rgba(0,0,0,0.05);
}

.dark .theme-toggle-btn {
  border-color: #4a4a4a;
  color: #e2e8f0;
}

.dark .theme-toggle-btn:hover {
  background-color: rgba(255,255,255,0.1);
}
</style>