<template>
  <div class="login-container">
    <div class="bg-blob blob-top-left"></div>
    <div class="bg-blob blob-bottom-right"></div>

    <main class="login-main-layout">
      <div class="welcome-side">
        <div class="mascot-wrapper">
          <img src="/images/login-mascot.png" alt="Welcome Mascot" class="mascot-img">
        </div>
        <div class="welcome-text-group">
          <h1 class="welcome-title">开始您的学习之旅</h1>
          <p class="welcome-subtitle">每天进步一点点，探索更大的世界！</p>
        </div>
      </div>

      <div class="form-side">
        <div class="login-card">
          <div class="form-header">
            <h2 class="form-title">欢迎回来!</h2>
          </div>

          <div class="tab-header">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'email' }"
              @click="switchTab('email')"
            >
              邮箱登录
            </button>
          </div>

          <div class="tab-content" v-show="activeTab === 'email'">
            <div class="form-group">
              <label for="email">邮箱地址</label>
              <div class="input-wrapper">
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <input
                  type="email"
                  id="email"
                  class="form-input"
                  placeholder="请输入您的邮箱"
                  v-model="email"
                >
              </div>
            </div>

            <div class="form-group">
              <label for="verificationCode">验证码</label>
              <div class="code-group">
                <div class="input-wrapper flex-1">
                  <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                  <input
                    type="text"
                    id="verificationCode"
                    class="form-input"
                    placeholder="6位验证码"
                    v-model="verificationCode"
                  >
                </div>
                <button
                  class="send-code-btn"
                  :disabled="isCountingDown"
                  @click="handleSendCodeClick"
                >
                  {{ sendButtonText }}
                </button>
              </div>
            </div>

            <div class="action-area">
              <button class="login-btn" @click="handleLoginClick">登录</button>
            </div>
            
            <div class="privacy-agreement">
              登录即代表您已阅读并同意我们的 
              <router-link :to="{ name: 'privacy' }" class="privacy-link">隐私政策</router-link>
            </div>
          </div>

        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useToast } from 'vue-toastification';

// --- 状态变量 ---
const activeTab = ref('email');
const email = ref('');
const verificationCode = ref('');
const sendButtonText = ref('发送验证码');
const isCountingDown = ref(false);
const messageRef = ref(null);
const toast = useToast();

let countdown = 60;
let invitationCode = '';

// --- 逻辑函数 ---
function switchTab(tab) {
  activeTab.value = tab;
  if (tab === 'wechat') wechatLogin();
}

function updateCountdown() {
  if (countdown > 0) {
    sendButtonText.value = `(${countdown}s)`;
    isCountingDown.value = true;
    countdown--;
    setTimeout(updateCountdown, 1000);
  } else {
    sendButtonText.value = '发送验证码';
    isCountingDown.value = false;
    countdown = 60;
  }
}

async function handleSendCodeClick() {
  if (!email.value) { toast.error('邮箱不能为空！'); return; }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) { toast.error('邮箱格式不正确！'); return; }
  isCountingDown.value = true;
  fetch('/api/sendVerificationCode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.value })
  }).then(response => response.json()).then(data => {
    if (data.message === '验证码发送成功') {
      toast.success('验证码发送成功！');
      updateCountdown();
    } else {
      toast.error(data.message);
      isCountingDown.value = false;
    }
  }).catch(() => { isCountingDown.value = false; toast.error('网络请求失败'); });
}

async function handleLoginClick() {
  if (!email.value || !verificationCode.value) { toast.error('邮箱和验证码不能为空！'); return; }
  try {
    const response = await fetch('/api/loginWithVerificationCode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        verificationCode: verificationCode.value,
        invitationCode: localStorage.getItem('invitationCode') // 添加邀请码
      })
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      window.location.href = '/';
    } else {
      toast.error(data.message);
    }
  } catch (error) { toast.error('登录失败，请稍后再试'); }
}


onMounted(async () => {
  // === 新增代码开始：捕获邀请码 ===
  const urlParams = new URLSearchParams(window.location.search);
  invitationCode = urlParams.get('ref'); // 获取链接上的 ?ref=sdfs

  if (invitationCode) {
    localStorage.setItem('invitationCode', invitationCode);
  }
});

</script>

<style scoped>
/* 全局变量 */
.login-container {
  --primary-color: #f48c25;
  --primary-light: rgba(244, 140, 37, 0.1);
  --bg-light: #f8f7f5;
  --card-bg: #ffffff;
  --text-main: #181411;
  --text-subtle: #8a7560;
  --field-bg: #f5f2f0;
  
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  background-color: var(--bg-light);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  color: var(--text-main);
}

/* Dark mode variables */
:global(html.dark) .login-container {
  --primary-color: #f6ad55;
  --primary-light: rgba(246, 173, 85, 0.15);
  --bg-light: #1a202c;
  --card-bg: #2d3748;
  --text-main: #f7fafc;
  --text-subtle: #cbd5e0;
  --field-bg: #4a5568;
}

/* 背景光晕 */
.bg-blob {
  position: absolute;
  width: 20rem;
  height: 20rem;
  border-radius: 50%;
  background-color: var(--primary-light);
  filter: blur(80px);
  z-index: 0;
}
.blob-top-left { top: -10rem; left: -10rem; }
.blob-bottom-right { bottom: -10rem; right: -10rem; }

/* --- 核心布局：左右分栏 --- */
.login-main-layout {
  z-index: 10;
  display: flex;
  width: 100%;
  max-width: 900px; /* 限制最大宽度 */
  background-color: var(--card-bg);
  border-radius: 1.5rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.08);
  overflow: hidden;
}

/* 左侧：欢迎区域 */
.welcome-side {
  flex: 1;
  background-color: var(--primary-light); /* 浅橙色背景 */
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.mascot-wrapper {
  margin-bottom: 2rem;
}

.mascot-img {
  width: 100%;
  max-width: 280px;
  height: auto;
  /* [新增] 添加圆角，您可以根据需要调整数值 */
  border-radius: 1.5rem; 
  /* 添加一个轻微的浮动动画，让它更生动 */
  animation: float 3s ease-in-out infinite;
}

.welcome-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--primary-color);
  margin-bottom: 0.75rem;
}

.welcome-subtitle {
  font-size: 1rem;
  color: var(--text-subtle);
  line-height: 1.5;
}

/* 右侧：表单区域 */
.form-side {
  flex: 1;
  padding: 3rem;
  display: flex;
  align-items: center;
}

.login-card {
  width: 100%;
  max-width: 360px; /* 限制表单宽度 */
  margin: 0 auto;
}

.form-header {
  text-align: center;
  margin-bottom: 2rem;
}

.form-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.form-subtitle {
  color: var(--text-subtle);
}

/* --- 表单样式 (保持原有风格并微调) --- */
.tab-header {
  display: flex;
  margin-bottom: 2rem;
  border-radius: 0.75rem;
  background-color: var(--field-bg);
  padding: 0.25rem;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: none;
  border-radius: 0.5rem;
  font-weight: 700;
  color: var(--text-subtle);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background-color: var(--card-bg);
  color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  position: relative; /* 添加相对定位 */
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.icon {
  position: absolute;
  left: 1rem;
  color: var(--text-subtle);
  width: 20px;
  height: 20px;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 2.75rem;
  border: 2px solid var(--field-bg);
  background-color: var(--field-bg);
  border-radius: 0.75rem;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: var(--primary-color);
  background-color: var(--card-bg);
  outline: none;
}

.code-group {
  display: flex;
  gap: 0.75rem;
}

.send-code-btn {
  padding: 0 1rem;
  background-color: var(--primary-light);
  color: var(--primary-color);
  border: none;
  border-radius: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.send-code-btn:hover:not(:disabled) {
  background-color: rgba(244, 140, 37, 0.2);
}

.login-btn {
  width: 100%;
  padding: 1rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 1.125rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.1s, background-color 0.2s;
}

.login-btn:hover { background-color: #e07b1a; transform: translateY(-2px); }
.login-btn:active { transform: translateY(0); }

.wechat-content { text-align: center; }
.qr-container {
  width: 200px; height: 200px;
  background-color: var(--field-bg);
  margin: 0 auto;
  border-radius: 0.75rem;
  display: flex; align-items: center; justify-content: center;
}
.qr-container img { width: 100%; height: 100%; object-fit: contain; }

/* 响应式布局：小屏幕变垂直 */
@media (max-width: 768px) {
  .login-main-layout { flex-direction: column; max-width: 400px; }
  .welcome-side { padding: 2rem; }
  .mascot-img { max-width: 180px; }
  .form-side { padding: 2rem; }
}

/* 动画 */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.privacy-agreement {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: #718096;
  text-align: center;
}

.privacy-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
}

.privacy-link:hover {
  text-decoration: underline;
}

</style>
