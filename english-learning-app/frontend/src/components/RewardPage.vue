<template>
  <div class="reward-page-container" :class="{ 'dark-mode': userStore.theme === 'dark' }">
    <div class="layout-container">
      <div class="content-wrapper">
        <div class="main-content">
          
          <div class="membership-section">
            <h2 class="section-title">开通会员，畅享特权</h2>
            <div class="membership-plans">
              <div class="card membership-card">
                <div class="plan-header">
                  <h3 class="plan-title">月度会员</h3>
                  <p class="plan-price">¥{{ getPrice('monthly') }}</p>
                </div>
                <ul class="plan-features">
                  <li>所有课程免费学</li>
                  <li>解锁全部头像</li>
                  <li>专属学习报告</li>
                </ul>
                <button class="btn btn-primary" @click="purchaseMembership('monthly')">立即开通</button>
              </div>
              <div class="card membership-card popular">
                 <span class="popular-badge">超值推荐</span>
                <div class="plan-header">
                  <h3 class="plan-title">季度会员</h3>
                  <p class="plan-price">¥{{ getPrice('quarterly') }}</p>
                </div>
                <ul class="plan-features">
                  <li>所有课程免费学</li>
                  <li>解锁全部头像</li>
                  <li>专属学习报告</li>
                  <li>好友邀请奖励翻倍</li>
                </ul>
                <button class="btn btn-primary" @click="purchaseMembership('quarterly')">立即开通</button>
              </div>
              <div class="card membership-card">
                <div class="plan-header">
                  <h3 class="plan-title">年度会员</h3>
                  <p class="plan-price">¥{{ getPrice('yearly') }}</p>
                </div>
                <ul class="plan-features">
                  <li>所有课程免费学</li>
                  <li>解锁全部头像</li>
                  <li>专属学习报告</li>
                  <li>好友邀请奖励翻倍</li>
                  <li>专属客服支持</li>
                </ul>
                <button class="btn btn-primary" @click="purchaseMembership('yearly')">立即开通</button>
              </div>
            </div>
          </div>

          <div class="invitation-section">
            <h2 class="section-title">邀请好友，赚取奖励</h2>
            <div class="card invitation-card">
              <div class="invitation-header">
                <div class="invitation-text">
                  <h3 class="card-title">每邀请一位好友注册</h3>
                  <p class="card-subtitle">您和好友各获得 <span class="highlight">7天</span> 会员时长</p>
                </div>
                <div class="invitation-icon">
                  <svg class="icon icon-gift" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1v-5h18v5zm0-7H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v4z"/>
                  </svg>
                </div>
              </div>
              
              <div class="invitation-action">
                <div class="link-box">
                  <input type="text" readonly :value="invitationLink" class="link-input">
                  <button class="btn btn-copy" @click="copyLink">复制链接</button>
                </div>
                <button class="btn btn-share" @click="showQRCode">
                  <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h-2v2h2v-2zm-2 4h2v2h-2v-2zm-4 0h2v2h-2v-2zm2-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm-2 4h2v2h-2v-2zm2-2h-2v-2h2v2zm2-4h-2v-2h2v2zm2-2h-2v-2h2v2z"/></svg>
                  生成二维码
                </button>
              </div>

              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-value">{{ invitationCount }}</span>
                  <span class="stat-label">已邀请人数</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ rewardDays }}</span>
                  <span class="stat-label">获得奖励(天)</span>
                </div>
              </div>
            </div>
          </div>

          <div class="footer-actions">
            <button class="btn btn-primary btn-large">
              <span class="btn-text">申请提现</span>
            </button>
            <a class="rules-link" href="#">查看推广规则</a>
          </div>

        </div>
      </div>
    </div>

    <div v-if="showPaymentModal" class="modal-overlay" @click.self="showPaymentModal = false">
      <div class="modal-content">
        <h3 class="modal-title">支付确认</h3>
        <p>您选择了 <strong>{{ selectedPlanName }}</strong></p>
        <p class="text-lg font-bold mb-4">支付金额: {{ selectedPlanPrice }}</p>
        <p class="text-sm text-muted mb-6">（此处为模拟支付，点击确认即可开通）</p>
        <div class="modal-actions">
           <button class="btn btn-secondary" @click="showPaymentModal = false">取消</button>
           <button class="btn btn-primary" @click="confirmPayment">确认支付</button>
        </div>
      </div>
    </div>

    <!-- 微信支付二维码模态框 -->
    <div v-if="showWechatPayModal" class="modal-overlay" @click.self="closeWechatPayModal">
      <div class="modal-content">
        <h3 class="modal-title">微信扫码支付</h3>
        <div class="qr-code-container" v-if="paymentQRCodeUrl">
           <img :src="paymentQRCodeUrl" alt="微信支付二维码" />
        </div>
        <p v-else>二维码正在生成中...</p>
        <p class="text-sm text-muted mt-4">请使用微信扫一扫完成支付</p>
        <button class="btn btn-secondary mt-6 w-full" @click="closeWechatPayModal">取消支付</button>
      </div>
    </div>

    <div v-if="showQRModal" class="modal-overlay" @click.self="showQRModal = false">
      <div class="modal-content">
        <h3 class="modal-title">邀请二维码</h3>
        <div class="qr-code-container">
           <img :src="qrCodeUrl" alt="Invitation QR Code" />
        </div>
        <p class="text-sm text-muted mt-4">扫一扫，注册即送会员</p>
        <button class="btn btn-primary mt-6 w-full" @click="showQRModal = false">关闭</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject, watch } from 'vue';
import { userStore } from '../store/user.js';
import { useToast } from 'vue-toastification';
import QRCode from 'qrcode';

const toast = useToast();
const invitationLink = ref('');
const invitationCount = ref(0);
const rewardDays = ref(0);
const showPaymentModal = ref(false);
const showQRModal = ref(false);
const showWechatPayModal = ref(false);
const paymentQRCodeUrl = ref('');
let pollingInterval = null;
const selectedPlan = ref('');
const selectedPlanName = ref('');
const selectedPlanPrice = ref('');
const qrCodeUrl = ref('');
const products = ref([]);

// Dynamic header background color injection
const setHeaderBgColor = inject('setHeaderBgColor');

const updateHeaderColor = () => {
    if (setHeaderBgColor) {
        setHeaderBgColor(userStore.theme === 'dark' ? 'var(--bg-color)' : '#fff8f5');
    }
};

onMounted(async () => {
  updateHeaderColor();
  fetchProducts(); // 获取产品价格
  
  // Watch theme changes
  watch(() => userStore.theme, () => {
    updateHeaderColor();
  });

  if (userStore.user.invitationCode) {
    // Generate link based on current domain
    const origin = window.location.origin;
    invitationLink.value = `${origin}/login?ref=${userStore.user.invitationCode}`;
    
    // Fetch stats (Mock data or real API)
    fetchUserInfo();
  }
});

onUnmounted(() => {
    if (setHeaderBgColor) {
        setHeaderBgColor('transparent');
    }
});


async function fetchUserInfo() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await fetch('/api/userinfo', {
             headers: { 'Authorization': token }
        });
        if (response.ok) {
            const userData = await response.json();
            userStore.setUser(userData);
            invitationCount.value = userStore.user.invitedCount || 0;
            rewardDays.value = (userStore.user.invitedCount || 0) * 7;
        } else {
            console.error("Failed to fetch user info");
        }
    } catch (e) {
        console.error("Failed to fetch user info", e);
    }
}

function copyLink() {
  if (!invitationLink.value) return;
  navigator.clipboard.writeText(invitationLink.value).then(() => {
    toast.success('链接已复制到剪贴板');
  }).catch(() => {
    toast.error('复制失败，请手动复制');
  });
}

async function showQRCode() {
    if (!invitationLink.value) return;
    try {
        qrCodeUrl.value = await QRCode.toDataURL(invitationLink.value);
        showQRModal.value = true;
    } catch (err) {
        console.error(err);
        toast.error('生成二维码失败');
    }
}


function getPrice(type) {
  const product = products.value.find(p => p.type === type);
  return product ? product.price : '...';
}

async function fetchProducts() {
  try {
    const response = await fetch('/api/products');
    if (response.ok) {
      products.value = await response.json();
    }
  } catch (e) {
    console.error("获取产品价格失败:", e);
  }
}

async function purchaseMembership(plan) {
    selectedPlan.value = plan;
    showPaymentModal.value = false; // 关闭模拟支付弹窗
    showWechatPayModal.value = true;
    paymentQRCodeUrl.value = ''; // 清空旧二维码
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/payment/create-native', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ productType: plan })
        });

        if (!response.ok) {
            throw new Error('创建支付订单失败');
        }
        const data = await response.json();
        
        if (!data.codeUrl) {
            throw new Error('无法获取支付二维码，请检查后端配置');
        }
        // 生成二维码并开始轮询
        paymentQRCodeUrl.value = await QRCode.toDataURL(data.codeUrl);
        startPolling(data.orderNo);

    } catch (error) {
        console.error('支付流程出错:', error);
        toast.error(error.message || '支付发起失败，请稍后重试');
        closeWechatPayModal();
    }
}

function startPolling(orderNo) {
    pollingInterval = setInterval(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/payment/query-status/${orderNo}`, {
                headers: { 'Authorization': token }
            });
            const data = await response.json();

            if (data.status === 'paid') {
                clearInterval(pollingInterval);
                pollingInterval = null;
                closeWechatPayModal();
                toast.success('支付成功！会员已到账。');
                // 刷新用户信息
                const fetchUserInfo = inject('fetchUserInfo');
                if(fetchUserInfo) fetchUserInfo();
            }
        } catch (error) {
            console.error('轮询订单状态失败:', error);
        }
    }, 3000); // 每3秒查询一次
}

function closeWechatPayModal() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    showWechatPayModal.value = false;
}

// 保留旧的 purchaseMembership 逻辑作为 confirmPayment 的一部分，以防万一
async function confirmPayment() {
    // 这个函数现在基本不会被调用了，但以防万一保留
    purchaseMembership(selectedPlan.value);
}
</script>

<style scoped>
/* --- 全局变量 (Tailwind Theme Simulation) --- */
.reward-page-container {
  /* Colors */
  --primary-color: #f48c25;
  --primary-light: rgba(244, 140, 37, 0.1);
  --primary-dark: #e07b1a;
  
  --bg-light: #fff8f5; 
  
  /* 1. 默认背景色 (Light Mode) */
  background-color: #fff8f5;
  
  --bg-card: #ffffff;
  --text-main: #111827; 
  --text-body: #374151; 
  --text-muted: #6b7280; 
  --border-color: #e5e7eb; 

  /* Spacing */
  --radius-default: 0.75rem; /* 12px */
  --radius-full: 9999px;

  /* Fonts */
  --font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;

  font-family: var(--font-family);
  color: var(--text-body);
  min-height: 100vh;
  transition: background-color 0.3s, color 0.3s;
}

/* 2. Dark Mode 样式覆盖 (改为 .dark-mode 类) */
.reward-page-container.dark-mode {
   /* 3. 强制深色背景 */
   background-color: #1a202c;

   /* 重写变量 */
   --bg-light: #1a202c;
   --bg-card: #2d3748;
   --text-main: #e2e8f0;
   --text-body: #a0aec0;
   --text-muted: #718096;
   --border-color: #4a5568;
}

/* --- 布局 --- */
.layout-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  height: 100%;
}

.content-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
}

.main-content {
  width: 100%;
  max-width: 48rem; /* max-w-3xl */
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

/* --- Section 通用 --- */
.section-title {
  font-size: 1.5rem; /* text-2xl */
  font-weight: 800;
  color: var(--text-main);
  text-align: center;
  margin-bottom: 1.5rem;
}

/* --- 卡片通用 --- */
.card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-default);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

/* --- 会员计划 --- */
.membership-plans {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .membership-plans {
    grid-template-columns: repeat(3, 1fr);
  }
}

.membership-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.membership-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.membership-card.popular {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.popular-badge {
  position: absolute;
  top: 0;
  right: 0;
  background-color: var(--primary-color);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-bottom-left-radius: var(--radius-default);
}

.plan-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.plan-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.5rem;
}

.plan-price {
  font-size: 2rem;
  font-weight: 800;
  color: var(--primary-color);
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
  text-align: left;
  width: 100%;
  color: var(--text-body);
  font-size: 0.875rem;
}

.plan-features li {
  margin-bottom: 0.75rem;
  position: relative;
  padding-left: 1.5rem;
}

.plan-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #22c55e; /* green-500 */
}

.membership-card .btn {
  width: 100%;
}

/* --- Modal 弹窗样式 --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--bg-card);
  padding: 2rem;
  border-radius: var(--radius-default);
  text-align: center;
  width: 90%;
  max-width: 320px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-main);
}

.qr-code-container {
  width: 200px;
  height: 200px;
  margin: 0 auto;
}
.qr-code-container img {
  width: 100%;
  height: 100%;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* --- 邀请卡片 --- */
.invitation-card {
  padding: 2rem;
}

.invitation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.5rem;
}

.card-subtitle {
  color: var(--text-muted);
}

.highlight {
  color: var(--primary-color);
  font-weight: 800;
  font-size: 1.125rem;
}

.invitation-icon {
  width: 3rem;
  height: 3rem;
  color: var(--primary-color);
}

.invitation-action {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (min-width: 640px) {
  .invitation-action {
    flex-direction: row;
  }
}

.link-box {
  flex: 1;
  display: flex;
  gap: 0.5rem;
}

.link-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-default);
  background-color: var(--bg-light); /* Input bg */
  color: var(--text-body);
  font-size: 0.875rem;
  outline: none;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  background-color: var(--bg-light); /* Light bg for stats area */
  padding: 1.5rem;
  border-radius: var(--radius-default);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* --- Buttons --- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: opacity 0.2s;
  border: none;
}
.btn:hover { opacity: 0.9; }

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-secondary {
  background-color: var(--border-color);
  color: var(--text-body);
}

.btn-copy {
  background-color: var(--primary-light);
  color: var(--primary-dark);
  padding: 0 1rem;
}

.btn-share {
  background-color: white;
  border: 1px solid var(--border-color);
  color: var(--text-body);
  gap: 0.5rem;
}
.dark-mode .btn-share {
    background-color: var(--bg-card);
}

/* Icons */
.icon { width: 1.25rem; height: 1.25rem; fill: currentColor; }
.icon-gift { width: 100%; height: 100%; }

/* Utility */
.w-full { width: 100%; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.text-sm { font-size: 0.875rem; }
.text-lg { font-size: 1.125rem; }
.font-bold { font-weight: 700; }

/* 底部操作区 */
.footer-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
}

.rules-link {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.2s;
}

.rules-link:hover {
  color: var(--primary-color);
}
</style>