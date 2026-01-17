<template>
  <div class="message-board-container" :class="{ 'dark-mode': userStore.theme === 'dark' }">
    <div class="layout-container">
      <main class="main-content">
        <div class="content-wrapper">
          
          <div class="page-header">
            <div class="header-text">
              <h1 class="page-title">留言板</h1>
              <p class="page-subtitle">分享您的想法、学习心得，或者向社区提问。<br>提案仅可提交关于平台优化建议和期待的功能或学习内容，待客服审核通过后显示在提案公告区</p>
            </div>
          </div>

          <div class="post-card">
            <div class="input-area">
              <div class="avatar current-user-avatar" :style="{ backgroundImage: `url('/images/${currentUser.avatar}')` }"></div>
              <textarea class="message-input" v-model="newMessage" placeholder="分享一些有趣的事情..."></textarea>
            </div>
            <div class="action-bar">
              <label class="checkbox-label">
                <input type="checkbox" class="checkbox-input" v-model="isProposal" />
                <span class="checkbox-text">发起提案</span>
              </label>
              <button class="btn btn-primary" @click="postMessage">提交留言</button>
            </div>
          </div>

          <div class="section-container" v-if="proposals.length > 0">
            <div class="section-header">
              <svg class="icon icon-lg text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.39-.4.53-.8 1.06-1.2 1.6zM20.4 5.6c-.4-.53-.8-1.06-1.2-1.6-.99.74-2.24 1.68-3.2 2.39.4.53.8 1.07 1.2 1.6.96-.71 2.21-1.65 3.2-2.39zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1l5 5V4L5 9H4zm9 15v-2c4.97 0 9-4.03 9-9s-4.03-9-9-9v-2c6.08 0 11 4.92 11 11s-4.92 11-11 11z"/>
              </svg>
              <h2 class="section-title">提案公告栏</h2>
            </div>

            <div class="card proposal-card" v-for="proposal in proposals" :key="proposal._id">
              <div class="user-info">
                <div class="avatar" :style="{ backgroundImage: proposal.author?.avatar ? `url('/images/${proposal.author.avatar}')` : '' }">
                  <span v-if="!proposal.author?.avatar" class="default-avatar-icon">
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </span>
                </div>
                <div class="user-meta">
                  <p class="user-name">
                    {{ proposal.author?.nickname || '已注销用户' }}
                    
                    <span v-if="proposal.author && ['admin', 'support'].includes(proposal.author.userType)" class="admin-badge">
                      <svg class="icon-admin" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                    </span>
                  </p>
                  <p class="post-time">{{ new Date(proposal.createdAt).toLocaleString() }}</p>
                </div>
              </div>
              <p class="message-content">{{ proposal.content }}</p>
              
              <div class="proposal-actions">
                <div class="vote-group">
                  <div class="vote-buttons">
                    <button class="btn btn-vote btn-vote-up" @click="vote(proposal._id, 'up')">
                      <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L23 10z"/></svg>
                      <span>投票赞成 ({{ proposal.votes.filter(v => v.voteType === 'up').length }})</span>
                    </button>
                    <button class="btn btn-vote btn-vote-down" @click="vote(proposal._id, 'down')">
                      <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v1.91l.01.01L1 14c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                      <span>投票反对 ({{ proposal.votes.filter(v => v.voteType === 'down').length }})</span>
                    </button>
                  </div>
                  <div class="comment-stat" @click="toggleReplies(proposal._id)" style="cursor: pointer;">
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                    <span>{{ proposal.replies.length }}</span>
                  </div>
                </div>
                
                <div class="countdown-badge" v-if="proposal.voteDeadline">
                  <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
                  <p>投票截止倒计时: <span class="font-bold">{{ new Date(proposal.voteDeadline).toLocaleString() }}</span></p>
                </div>
              </div>
              <div v-if="expandedReplies[proposal._id]" class="replies-section">
                <div v-for="reply in proposal.replies" :key="reply._id" class="reply-item">
                  <div class="user-info">
                  <div class="avatar reply-avatar" :style="{ backgroundImage: reply.author?.avatar ? `url('/images/${reply.author.avatar}')` : '' }">
                    </div>
                  <div class="user-meta">
                    <p class="user-name">
                      {{ reply.author?.nickname || '已注销用户' }}
                      <span v-if="reply.author && ['admin', 'support'].includes(reply.author.userType)" class="admin-badge">
                        </span>
                    </p>
                    </div>
                </div>
                  <p class="message-content">{{ reply.content }}</p>
                </div>
                <!-- Reply Input Area -->
                <div class="reply-input-area">
                   <div class="avatar reply-avatar" :style="{ backgroundImage: `url('/images/${currentUser.avatar}')` }"></div>
                   <textarea class="message-input reply-input" :placeholder="'回复 ' + proposal.author.nickname + '...'" v-model="replyInputs[proposal._id]"></textarea>
                   <button class="btn btn-primary btn-reply" @click="postReply(proposal._id)">提交回复</button>
                </div>
              </div>
            </div>
          </div>

          <div class="section-container">
            <h2 class="section-title border-bottom">给客服留言</h2>
            
            <div class="message-list">
              <div class="card message-card" v-for="msg in normalMessages" :key="msg._id">
                <div class="user-info">
                  <div class="avatar" :style="{ backgroundImage: msg.author?.avatar ? `url('/images/${msg.author.avatar}')` : '' }">
                    <span v-if="!msg.author?.avatar" class="default-avatar-icon">
                      <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    </span>
                  </div>
                  <div class="user-meta">
                    <p class="user-name">
                      {{ msg.author.nickname }}
                      <span v-if="['admin', 'support'].includes(msg.author.userType)" class="admin-badge">
                        <svg class="icon-admin" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                      </span>
                    </p>
                    <p class="post-time">{{ new Date(msg.createdAt).toLocaleString() }}</p>
                  </div>
                </div>
                <p class="message-content">{{ msg.content }}</p>
                <div class="message-actions">
                  <button class="action-btn comment-btn" @click="toggleReplies(msg._id)">
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM20 16h-2v-2h2v2zm0-4h-2V6h2v6z"/></svg>
                    <span>{{ msg.replies.length }}</span>
                  </button>
                </div>
                <div v-if="expandedReplies[msg._id]" class="replies-section">
                  <div v-for="reply in msg.replies" :key="reply._id" class="reply-item">
                    <div class="user-info">
                      <div class="avatar reply-avatar" :style="{ backgroundImage: `url('/images/${reply.author.avatar}')` }"></div>
                      <div class="user-meta">
                        <p class="user-name">
                          {{ reply.author.nickname }}
                          <span v-if="['admin', 'support'].includes(reply.author.userType)" class="admin-badge">
                            <svg class="icon-admin" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                          </span>
                        </p>
                        <p class="post-time">{{ new Date(reply.createdAt).toLocaleString() }}</p>
                      </div>
                    </div>
                    <p class="message-content">{{ reply.content }}</p>
                  </div>
                  <!-- Reply Input Area for normal messages -->
                  <div v-if="msg.status !== 'closed'" class="reply-input-area">
                    <div class="avatar reply-avatar" :style="{ backgroundImage: `url('/images/${currentUser.avatar}')` }"></div>
                    <textarea class="message-input reply-input" :placeholder="'回复 ' + msg.author.nickname + '...'" v-model="replyInputs[msg._id]"></textarea>
                    <button class="btn btn-primary btn-reply" @click="postReply(msg._id)">提交回复</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, inject, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { userStore } from '../store/user.js';

const messages = ref([]);
const newMessage = ref('');
const isProposal = ref(false);
const toast = useToast();
const currentUser = ref({ avatar: '' });

const proposals = ref([]);
const normalMessages = ref([]);
const expandedReplies = ref({});
const replyInputs = ref({});

function toggleReplies(proposalId) {
  expandedReplies.value[proposalId] = !expandedReplies.value[proposalId];
}
 
 async function fetchMessages() {
   try {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': token };

    const [proposalsRes, messagesRes] = await Promise.all([
      fetch('/api/proposalsByStatus', { headers }),
      fetch('/api/messagesByUser', { headers })
    ]);

    if (proposalsRes.ok) {
      proposals.value = await proposalsRes.json();
      console.log(proposals.value )
    } else {
      toast.error('获取提案失败');
    }

    if (messagesRes.ok) {
      normalMessages.value = await messagesRes.json();
    } else {
      toast.error('获取留言失败');
    }
  } catch (error) {
    toast.error('网络错误');
  }
}

async function postMessage() {
  if (!newMessage.value.trim()) {
    toast.error('内容不能为空');
    return;
  }

  // 前端订阅状态检查
  if (isProposal.value) {
    const now = new Date();
    const expiry = currentUser.value.subscriptionExpiry ? new Date(currentUser.value.subscriptionExpiry) : null;
    if (!expiry || expiry < now) {
      toast.error('只有订阅用户才能发起提案。');
      return;
    }
  }

  try {
    const token = localStorage.getItem('token');
    const body = {
      content: newMessage.value,
      messageType: isProposal.value ? 'proposal' : 'message'
    };
    const response = await fetch('/api/message/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(body)
    });
    if (response.ok) {
      newMessage.value = '';
      isProposal.value = false;
      toast.success('发布成功！');
      fetchMessages();
    } else {
      toast.error('发布失败');
    }
  } catch (error) {
    toast.error('网络错误');
  }
}

async function vote(messageId, voteType) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/messages/${messageId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ voteType })
    });
    if (response.ok) {
      toast.success('投票成功！');
      fetchMessages();
    } else {
      toast.error('投票失败');
    }
  } catch (error) {
    toast.error('网络错误');
  }
}

async function postReply(messageId) {
  const content = replyInputs.value[messageId];
  if (!content || !content.trim()) {
    toast.error('回复内容不能为空');
    return;
  }
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/messages/${messageId}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ content })
    });
    if (response.ok) {
      toast.success('回复成功！');
      replyInputs.value[messageId] = ''; // 清空输入框
      fetchMessages(); // 重新获取留言以显示新回复
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || '回复失败');
    }
  } catch (error) {
    toast.error('网络错误，回复失败');
  }
}

onMounted(async () => {
  const setHeaderBgColor = inject('setHeaderBgColor');
  
  const updateHeaderColor = () => {
    if (setHeaderBgColor) {
        setHeaderBgColor(userStore.theme === 'dark' ? 'var(--bg-color)' : '#fff8f5');
    }
  };
  
  updateHeaderColor();
  
  watch(() => userStore.theme, () => {
    updateHeaderColor();
  });

  await fetchMessages();
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/userinfo', {
      headers: { 'Authorization': token }
    });
    if (response.ok) {
      currentUser.value = await response.json();
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
});

onUnmounted(() => {
    const setHeaderBgColor = inject('setHeaderBgColor');
    if (setHeaderBgColor) {
        setHeaderBgColor('transparent');
    }
});
</script>

<style scoped>
/* --- 全局变量 (Tailwind Theme Simulation) --- */
.message-board-container {
  /* Colors */
  --primary-color: #f48c25;
  --primary-light: rgba(244, 140, 37, 0.1);
  --primary-dark: #e07b1a;
  
  /* [修复1] 恢复输入框需要的浅色背景变量 */
  --bg-light: #ffffff; 
  
  /* 默认浅色背景 */
  background-color: #fff8f5; 
  
  --bg-card-light: #ffffff;
  --text-main: #111827; 
  --text-body: #374151; 
  --text-muted: #6b7280; 
  --border-color: #e5e7eb; 

  /* Proposal Theme (Amber) */
  --proposal-bg: rgba(255, 251, 235, 0.8);
  --proposal-border: #fde68a; 
  
  /* Vote Colors */
  --vote-up-bg: #dcfce7; 
  --vote-up-text: #15803d; 
  --vote-down-bg: #fee2e2; 
  --vote-down-text: #b91c1c; 

  /* Fonts */
  --font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  
  /* Spacing */
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;

  font-family: var(--font-family);
  color: var(--text-body);
  min-height: 100vh;
  transition: background-color 0.3s, color 0.3s;
}

/* [修复2] 使用 .dark-mode 类来控制深色模式，不再依赖全局 selector */
.message-board-container.dark-mode {
  /* 强制深色背景 */
  background-color: #1a202c; 
  
  /* [修复3] 重新定义深色模式下的变量 */
  --bg-light: #2d3748; /* 输入框背景变深 */
  --bg-card-light: #2d3748;
  --text-main: #e2e8f0;
  --text-body: #a0aec0;
  --text-muted: #718096;
  --border-color: #4a5568;
  
  /* Dark mode proposal theme */
  --proposal-bg: rgba(45, 55, 72, 0.8);
  --proposal-border: #4a5568;
}

/* --- 布局 --- */
.layout-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  height: 100%;
}

.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 48rem; /* max-w-3xl (768px) */
  gap: 2rem; /* gap-8 */
}

/* 页面头部 */
.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.page-title {
  color: var(--text-main);
  font-size: 2.25rem; /* text-4xl */
  font-weight: 900;
  letter-spacing: -0.05em;
  margin: 0;
}

.page-subtitle {
  color: var(--text-muted);
  font-size: 1rem;
  font-weight: 400;
  margin: 0;
}

/* --- 发布留言框 --- */
.post-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: var(--bg-card-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 1rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.input-area {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.message-input {
  flex: 1;
  min-width: 0;
  height: 7rem; /* h-28 */
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--bg-light);
  color: var(--text-main);
  font-size: 1rem;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: box-shadow 0.15s;
}

.message-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 3.5rem; /* pl-14 to align with input */
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem 0;
}

.checkbox-input {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid #d1d5db;
  border-radius: 0.25rem;
  accent-color: var(--primary-color);
}

.checkbox-text {
  color: var(--text-muted);
  font-size: 0.875rem;
  transition: color 0.2s;
}

.checkbox-label:hover .checkbox-text {
  color: var(--text-main);
}

/* 按钮 */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem; /* h-10 */
  padding: 0 1.25rem;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.btn:hover {
  opacity: 0.9;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  min-width: 100px;
}

/* --- 提案公告栏 --- */
.section-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  font-size: 1.5rem; /* text-2xl */
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.text-primary {
  color: var(--primary-color);
}

.proposal-card {
  background-color: var(--proposal-bg);
  border: 1px solid var(--proposal-border);
}

/* --- 留言卡片通用 --- */
.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.message-card {
  background-color: var(--bg-card-light);
  border: 1px solid var(--border-color);
}

/* 用户信息头 */
.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 2.5rem; /* size-10 */
  height: 2.5rem;
  border-radius: 50%;
  background-color: #e5e7eb; /* gray-200 placeholder */
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.current-user-avatar {
  width: 2.5rem;
  height: 2.5rem;
}

.default-avatar-icon {
  color: var(--text-muted);
  width: 1.5rem;
  height: 1.5rem;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.icon-admin {
  width: 1rem;
  height: 1rem;
}

.post-time {
  font-size: 0.75rem; /* text-xs */
  color: var(--text-muted);
  margin: 0;
}

/* 留言内容 */
.message-content {
  font-size: 1rem;
  color: var(--text-body);
  line-height: 1.625;
  margin: 0;
}

/* 提案操作区 */
.proposal-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--proposal-border);
}

.vote-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.vote-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-vote {
  height: 2.25rem;
  padding: 0 1rem;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s;
}

.btn-vote-up {
  background-color: var(--vote-up-bg);
  color: var(--vote-up-text);
}
.btn-vote-up:hover { background-color: #bbf7d0; } /* green-200 */

.btn-vote-down {
  background-color: var(--vote-down-bg);
  color: var(--vote-down-text);
}
.btn-vote-down:hover { background-color: #fecaca; } /* red-200 */

.comment-stat {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--text-muted);
  font-weight: 500;
  font-size: 0.875rem;
}

.replies-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--proposal-border);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reply-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 3.25rem; /* Align with proposal content */
}

.reply-avatar {
  width: 2rem;
  height: 2rem;
}

.reply-input-area {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--proposal-border);
}

.reply-input {
  height: 4rem; /* Smaller height for replies */
}

.btn-reply {
  height: 4rem; /* Match textarea height */
  align-self: flex-start;
}
 
 .countdown-badge {
   align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-full);
  background-color: var(--primary-light);
  color: #92400e; /* primary-800 approx */
  font-size: 0.875rem;
}

.font-bold { font-weight: 700; }

/* 留言操作区 */
.message-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #f3f4f6; /* gray-100 */
  color: var(--text-muted);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0;
  transition: color 0.2s;
}

.like-btn:hover { color: var(--vote-down-text); }
.comment-btn:hover { color: var(--primary-color); }

/* 图标通用样式 */
.icon {
  width: 1.25rem; /* text-xl */
  height: 1.25rem;
  fill: currentColor;
}

.icon-lg {
  width: 1.875rem; /* text-3xl */
  height: 1.875rem;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.border-bottom {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
  padding-top: 1.25rem;
  padding-left: 1rem;
  padding-right: 1rem;
}

/* 📱 手机端适配 */
@media (max-width: 768px) {
  .page-title {
    font-size: 1.75rem;
  }
  
  .page-header {
    padding: 0.5rem;
  }

  .action-bar {
    padding-left: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .btn-primary {
    width: 100%;
  }

  .reply-item {
    padding-left: 0.5rem;
  }

  .reply-input-area {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-reply {
    width: 100%;
    height: auto;
    padding: 10px;
    margin-top: 5px;
  }

  .vote-group {
    flex-direction: column;
    align-items: flex-start;
  }

  .vote-buttons {
    width: 100%;
    justify-content: space-between;
  }

  .btn-vote {
    flex: 1;
    font-size: 12px;
    padding: 0 5px;
  }
}
</style>