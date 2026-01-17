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
            {{ formattedExpiryDate }}
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
        <a href="#" @click.prevent="navigateTo('messages')" :class="{ active: activeMenu === 'messages' }">
          <span class="icon">📥</span> 留言建议
        </a>
        <a href="#" @click.prevent="navigateTo('reward')" :class="{ active: activeMenu === 'reward' }">
          <span class="icon">💰</span> 邀请奖励
        </a>
        <a href="#" @click.prevent="navigateTo('about')" :class="{ active: activeMenu === 'about' }">
          <span class="icon">ℹ️</span> 关于我们
        </a>
        <a href="#" @click.prevent="goToChinaSite">
          <span class="icon">🇨🇳</span> 中国站
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="mascot-container">
          <canvas id="catCanvas"></canvas>
        </div>
      </div>

    </div>

    <div class="content-area" id="content-area">
      <div class="content-header" :style="{ background: headerBgColor }">
        <!-- 📱 Mobile Hamburger Icon -->
        <button class="hamburger-btn" @click="isDrawerOpen = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/>
          </svg>
        </button>

        <div class="header-actions">
          <div class="customer-service-container desktop-only" @mouseover="showQRCode = true" @mouseout="showQRCode = false">
            <button class="theme-toggle-btn">
              <img src="/images/wechat.png" class="wechat-icon" alt="微信">
            </button>
            <div v-show="showQRCode" class="qr-code-popup">
              <img src="/images/xue_kefu_qr.jpg" alt="客服二维码">
              <p>微信扫码联系客服</p>
            </div>
          </div>
          <button @click="userStore.toggleTheme" class="theme-toggle-btn desktop-only">
            <span v-if="userStore.theme === 'light'">🌙</span>
            <span v-else>☀️</span>
          </button>

          <button v-if="!userStore.user.nickname" @click="redirectToLogin" class="auth-button desktop-only">
            登录
          </button>
          <button v-else @click="handleLogout" class="auth-button desktop-only">
            退出
          </button>

        </div>
      </div>

      <!-- 📱 Mobile Drawer Overlay -->
      <div class="drawer-overlay" :class="{ active: isDrawerOpen }" @click="isDrawerOpen = false"></div>
      
      <!-- 📱 Mobile Drawer -->
      <div class="mobile-drawer" :class="{ active: isDrawerOpen }">
         <div class="drawer-header">
           <div class="drawer-user" @click="handleUserClick(); isDrawerOpen = false">
             <img :src="avatarUrl" alt="头像" class="drawer-avatar">
             <span class="drawer-nickname">{{ userStore.user.nickname || '游客' }}</span>
           </div>
           <button class="close-drawer" @click="isDrawerOpen = false">×</button>
         </div>

         <nav class="drawer-nav">
            <a href="#" @click.prevent="navigateTo('home'); isDrawerOpen = false" :class="{ active: activeMenu === 'home' }">
              <span class="icon">🏠</span> 首页
            </a>
            <a href="#" @click.prevent="navigateTo('messages'); isDrawerOpen = false" :class="{ active: activeMenu === 'messages' }">
              <span class="icon">📥</span> 留言建议
            </a>
            <a href="#" @click.prevent="navigateTo('reward'); isDrawerOpen = false" :class="{ active: activeMenu === 'reward' }">
              <span class="icon">💰</span> 邀请奖励
            </a>
            <a href="#" @click.prevent="navigateTo('about'); isDrawerOpen = false" :class="{ active: activeMenu === 'about' }">
              <span class="icon">ℹ️</span> 关于我们
            </a>
            <a href="#" @click.prevent="goToChinaSite" class="china-site-link">
              <span class="icon">🇨🇳</span> 中国站
            </a>
         </nav>

         <div class="drawer-footer">
            <div class="drawer-actions">
               <button @click="userStore.toggleTheme" class="drawer-action-btn">
                 <span v-if="userStore.theme === 'light'">🌙 深色模式</span>
                 <span v-else>☀️ 浅色模式</span>
               </button>
               <button v-if="!userStore.user.nickname" @click="redirectToLogin(); isDrawerOpen = false" class="drawer-action-btn primary">
                 登录
               </button>
               <button v-else @click="handleLogout(); isDrawerOpen = false" class="drawer-action-btn">
                 退出登录
               </button>
            </div>
         </div>
      </div>

      <div class="router-view-wrapper">
        <router-view></router-view>
      </div>
    </div>

  </div>
</template>

<script setup>
import { onMounted, ref, computed, provide, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { userStore } from '../store/user.js';
import { useToast } from 'vue-toastification';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const bookButton = ref(null);

const activeMenu = ref('home');
const isDrawerOpen = ref(false);
const showRedirectLoginModal = ref(false);

// 监听路由变化，同步 activeMenu
watch(() => route.name, (newName) => {
  if (newName) activeMenu.value = newName;
}, { immediate: true });

watch(() => userStore.showLoginModal, (newValue) => {
  if (newValue) {
    showRedirectLoginModal.value = true;
    userStore.closeLoginModal();
  }
});

const isLoggedIn = computed(() => !!localStorage.getItem('token'));
const showQRCode = ref(false); // 控制二维码显示

const headerBgColor = ref('transparent');
const setHeaderBgColor = (color) => {
  headerBgColor.value = color;
};
provide('setHeaderBgColor', setHeaderBgColor);

const avatarUrl = computed(() => {
  const avatar = userStore.user.avatar;
  if (!avatar) return '/images/bubu.png';
  if (avatar.startsWith('http')) return avatar;
  if (avatar.includes('penguins')) return `/images/${avatar}`;
  return `/images/${avatar}`;
});

const formattedExpiryDate = computed(() => {
  const expiry = userStore.user.subscriptionExpiry;
  if (!expiry) return null;
  const date = new Date(expiry);
  const now = new Date();
  if (date < now) return '已过期';
  
  // 如果是终身会员（100年）
  if (date.getFullYear() > now.getFullYear() + 50) return '终身会员';
  
  return date.toLocaleDateString() + ' 到期';
});

const isSubscribed = computed(() => {
  const expiry = userStore.user.subscriptionExpiry;
  if (!expiry) return false;
  return new Date(expiry) > new Date();
});

function navigateTo(page) {
  activeMenu.value = page;
  router.push({ name: page });
}

function handleProgrammingClick() {
  toast.info('“编程课程” 正在火速开发中，敬请期待！');
}

function redirectToLogin() {
  showRedirectLoginModal.value = false;
  router.push({ name: 'login' });
}

function handleLogout() {
  localStorage.removeItem('token');
  userStore.clearUser(); // 彻底清除用户信息
  router.push({ name: 'login' });
}

function initCatAnimation() {
    const canvas = document.getElementById('catCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let lastTime = 0;
    let blinkTimer = 0;
    let isBlinking = false;
    const BLINK_INTERVAL = 2000;
    const BLINK_DURATION = 150;
    let meowTimer = 0;
    let isMeowing = false;
    const MEOW_INTERVAL = 2000;
    const MEOW_DURATION = 400;
    const SIZE_MULTIPLIER = 2 / 3;
    const CAT_COLOR = '#fcf0e2';
    const CAT_SHADOW_COLOR = '#D4C4B5';
    const HAT_COLOR = '#ff8a65';
    const HAT_BORDER_COLOR = '#currentColor';
    const MOUTH_NOSE_COLOR = '#FF8A80';
    const BASE_DRAWING_WIDTH = 250;
    const ORIGINAL_CAT_TOP_Y = -145;
    const ORIGINAL_CAT_BOTTOM_Y = 160;
    const ORIGINAL_CAT_HEIGHT = ORIGINAL_CAT_BOTTOM_Y - ORIGINAL_CAT_TOP_Y;
    const ORIGINAL_CENTER_OF_CAT_Y = (ORIGINAL_CAT_TOP_Y + ORIGINAL_CAT_BOTTOM_Y) / 2;
    const TARGET_CANVAS_WIDTH = 160;
    const TOP_BOTTOM_PADDING = 5;

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

    function drawEllipse(x, y, radiusX, radiusY, rotation, color) {
        ctx.beginPath();
        ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function draw(timestamp) {
        ctx.clearRect(0, 0, width, height);
        const centerX = width / 2;
        const fullScale = width / BASE_DRAWING_WIDTH;
        const effectiveScale = fullScale * SIZE_MULTIPLIER;
        const canvasCenterY = height / 2;
        const catCenterYOffset = ORIGINAL_CENTER_OF_CAT_Y * effectiveScale;
        const centerY = canvasCenterY - catCenterYOffset;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(effectiveScale, effectiveScale);
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
        ctx.fillStyle = CAT_SHADOW_COLOR;
        drawEllipse(-25, 155, 20, 25, 0, CAT_SHADOW_COLOR);
        drawEllipse(25, 155, 20, 25, 0, CAT_SHADOW_COLOR);
        ctx.fillStyle = CAT_COLOR;
        drawEllipse(-25, 145, 18, 20, 0, CAT_COLOR);
        drawEllipse(25, 145, 18, 20, 0, CAT_COLOR);
        ctx.strokeStyle = CAT_SHADOW_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-35, 145);
        ctx.lineTo(-15, 145);
        ctx.moveTo(15, 145);
        ctx.lineTo(35, 145);
        ctx.stroke();
        ctx.strokeStyle = CAT_SHADOW_COLOR;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-35, 100);
        ctx.quadraticCurveTo(-20, 120, -10, 140);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(35, 100);
        ctx.quadraticCurveTo(20, 120, 10, 140);
        ctx.stroke();
        ctx.fillStyle = CAT_COLOR;
        ctx.strokeStyle = CAT_SHADOW_COLOR;
        ctx.lineWidth = 3;
        drawEllipse(0, -50, 85, 75, 0, CAT_COLOR);
        ctx.stroke();
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
        ctx.beginPath();
        ctx.moveTo(-60, -95);
        ctx.lineTo(-72, -120);
        ctx.lineTo(-40, -108);
        ctx.closePath();
        ctx.fillStyle = MOUTH_NOSE_COLOR;
        ctx.fill();
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
        ctx.beginPath();
        ctx.moveTo(60, -95);
        ctx.lineTo(72, -120);
        ctx.lineTo(40, -108);
        ctx.closePath();
        ctx.fillStyle = MOUTH_NOSE_COLOR;
        ctx.fill();
        ctx.fillStyle = HAT_COLOR;
        ctx.strokeStyle = HAT_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -100, 45, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
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
        ctx.beginPath();
        ctx.arc(0, -145, 12, 0, Math.PI * 2);
        ctx.fillStyle = HAT_BORDER_COLOR;
        ctx.fill();
        ctx.stroke();
        const eyeY = -50;
        const eyeXOffset = 35;
        const eyeSize = 8;
        ctx.fillStyle = '#111';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        if (isBlinking) {
            ctx.beginPath();
            ctx.moveTo(-eyeXOffset - 10, eyeY);
            ctx.quadraticCurveTo(-eyeXOffset, eyeY + 5, -eyeXOffset + 10, eyeY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(eyeXOffset - 10, eyeY);
            ctx.quadraticCurveTo(eyeXOffset, eyeY + 5, eyeXOffset + 10, eyeY);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(-eyeXOffset, eyeY, eyeSize, 0, Math.PI * 2);
            ctx.arc(eyeXOffset, eyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(-eyeXOffset - 2, eyeY - 2, 2, 0, Math.PI * 2);
            ctx.arc(eyeXOffset - 2, eyeY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = MOUTH_NOSE_COLOR;
        ctx.beginPath();
        ctx.moveTo(-5, -35);
        ctx.lineTo(5, -35);
        ctx.lineTo(0, -28);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#111';
        if (isMeowing) {
            const MOUTH_OPEN_COLOR = '#333';
            const TONGUE_COLOR = '#FF99AA';
            ctx.beginPath();
            ctx.ellipse(0, -15, 12, 8, 0, 0, 2 * Math.PI);
            ctx.fillStyle = MOUTH_OPEN_COLOR;
            ctx.fill();
            drawEllipse(0, -13, 8, 4, 0, TONGUE_COLOR);
            ctx.strokeStyle = '#111';
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(-10, -20);
            ctx.moveTo(0, -28);
            ctx.lineTo(10, -20);
            ctx.stroke();
        } else {
            const controlY = -20;
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.quadraticCurveTo(-5, controlY, -10, -25);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.quadraticCurveTo(5, controlY, 10, -25);
            ctx.stroke();
        }
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#333';
        ctx.beginPath(); ctx.moveTo(-60, -40); ctx.lineTo(-90, -45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-60, -32); ctx.lineTo(-95, -32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-60, -24); ctx.lineTo(-90, -20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(60, -40); ctx.lineTo(90, -45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(60, -32); ctx.lineTo(95, -32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(60, -24); ctx.lineTo(90, -20); ctx.stroke();
        ctx.restore();
    }

    function resize() {
        width = TARGET_CANVAS_WIDTH;
        const fullScale = width / BASE_DRAWING_WIDTH;
        const effectiveScale = fullScale * SIZE_MULTIPLIER;
        const requiredCatHeight = ORIGINAL_CAT_HEIGHT * effectiveScale;
        height = requiredCatHeight + (TOP_BOTTOM_PADDING * 2);
        canvas.width = width;
        canvas.height = height;
        draw(0);
    }

    function animate(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        blinkTimer += deltaTime;
        if (blinkTimer > BLINK_INTERVAL) {
            isBlinking = true;
            if (blinkTimer > BLINK_INTERVAL + BLINK_DURATION) {
                isBlinking = false;
                blinkTimer = 0;
            }
        }
        meowTimer += deltaTime;
        if (meowTimer > MEOW_INTERVAL) {
            isMeowing = true;
            if (meowTimer > MEOW_INTERVAL + MEOW_DURATION) {
                isMeowing = false;
                meowTimer = 0;
            }
        }
        draw(timestamp);
        requestAnimationFrame(animate);
    }
    resize();
    requestAnimationFrame(animate);
}

onMounted(() => {
  // navigateTo('home'); // 移除强制重定向，由路由自行处理
  initCatAnimation();
});

const isUserLoading = ref(false);

const handleUserClick = async () => {
  if (isUserLoading.value) return;
  isUserLoading.value = true;
  try {
    await navigateTo('setting');
    setTimeout(() => { isUserLoading.value = false; }, 500);
  } catch (e) {
    isUserLoading.value = false;
  }
};
const goToChinaSite = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'https://xuebubu.com';
    return;
  }

  try {
    const response = await fetch('/api/sso/generate', {
      method: 'POST',
      headers: { 
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.sso_code) {
        window.location.href = `https://xuebubu.com/login?sso_code=${data.sso_code}`;
        return;
      }
    }
    window.location.href = 'https://xuebubu.com';
  } catch (error) {
    console.error('SSO generation failed:', error);
    window.location.href = 'https://xuebubu.com';
  }
};

</script>

<style scoped>
@import '../assets/index.css';

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
  position: relative;
  overflow: hidden;
}

.content-header {
  padding: 10px 40px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  z-index: 10;
  transition: background 0.3s ease, border-color 0.3s ease;
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
  background-color: #ff7043;
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

.wechat-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.customer-service-container {
  position: relative;
}

.qr-code-popup {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10px;
  padding: 1rem;
  background-color: var(--card-bg, #fff);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100;
  text-align: center;
  width: 180px;
}

.qr-code-popup img {
  width: 100%;
  height: auto;
  display: block;
}

.qr-code-popup p {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-subtle);
}

/* 🍔 Hamburger Button */
.hamburger-btn {
  display: none;
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--text-main);
}
.hamburger-btn svg {
  width: 24px;
  height: 24px;
}

/* 抽屉遮罩层 */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}
.drawer-overlay.active {
  opacity: 1;
  visibility: visible;
}

/* 抽屉主体 */
.mobile-drawer {
  position: fixed;
  top: 0;
  right: -280px;
  width: 280px;
  height: 100%;
  background: var(--card-bg, #fff);
  z-index: 1001;
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 10px rgba(0,0,0,0.1);
}
.mobile-drawer.active {
  right: 0;
}

.drawer-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drawer-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.drawer-nickname {
  font-weight: 600;
  font-size: 14px;
}

.close-drawer {
  background: none;
  border: none;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  padding: 4px;
}

.drawer-nav {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.drawer-nav a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  text-decoration: none;
  color: var(--text-main);
  border-radius: 8px;
  font-weight: 500;
}

.drawer-nav a.active {
  background-color: var(--primary-light, #fcf0e2);
  color: var(--primary-color, #e59f42);
}

.drawer-footer {
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.drawer-action-btn {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: none;
  font-weight: 600;
  cursor: pointer;
}

.drawer-action-btn.primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
}

/* 📱 Mobile Fine-tuning */
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
  
  .hamburger-btn {
    display: block;
  }

  .content-header {
    justify-content: space-between;
    padding: 10px 15px;
  }
}
</style>
