<template>
  <div class="setting-page-container" :class="{ 'dark-mode': userStore.theme === 'dark' }">
    <div class="layout-container">
      <div class="content-wrapper">
        <div class="main-content">
          
          <main class="settings-main">
            <div class="page-header">
              <h1 class="page-title">设置</h1>
            </div>

            <div class="card setting-card">
                <h3 class="card-title">我的学分</h3>
                <div class="credit-banner">
                  <svg class="icon large-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                  </svg>
                  <div class="credit-info">
                    <p class="credit-value">{{ userStore.user.credits || 0 }}</p>
                    <p class="credit-desc">完成每日任务和课程可以获得学分，学分可以解锁可爱的头像和装扮哦！</p>
                  </div>
                </div>
              </div>

              <div class="card setting-card">
                  <h3 class="card-title">我的金币</h3>
                  <div class="credit-banner gold-banner">
                      <svg class="icon large-icon" viewBox="0 0 1024 1024" fill="currentColor">
                          <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 768c-176.4 0-320-143.6-320-320S335.6 192 512 192s320 143.6 320 320-143.6 320-320 320zm-24-270.4c-6.8 0-13.2-2.8-18-7.6l-80-80c-10-10-10-26.2 0-36.2s26.2-10 36.2 0l62 62v-162.8c0-14.2 11.4-25.6 25.6-25.6s25.6 11.4 25.6 25.6V494l62-62c10-10 26.2-10 36.2 0s10 26.2 0 36.2l-80 80c-4.8 4.8-11.2 7.6-18 7.6z"/>
                      </svg>
                      <div class="credit-info">
                          <p class="credit-value gold-value">{{ userStore.user.golds || 0 }}</p>
                          <p class="credit-desc">金币可以用于购买道具或参与特殊活动。</p>
                      </div>
                  </div>
              </div>
              
            <div class="settings-list">
              <div class="card setting-card">
                <h3 class="card-title">会员状态</h3>
                <div class="credit-banner">
                   <svg class="icon large-icon" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                   </svg>
                   <div class="credit-info">
                     <p class="credit-value">{{ membershipStatus.text }}</p>
                     <p class="credit-desc">{{ membershipStatus.expiryInfo }}</p>
                   </div>
                 </div>
              </div>

              <div class="card setting-card">
                <h3 class="card-title">我的昵称</h3>
                <div class="form-row">
                  <label class="input-group">
                    <input class="form-input" v-model="newNickname" placeholder="请输入新昵称" />
                  </label>
                  <button class="btn btn-primary" @click="updateNickname">确认修改</button>
                </div>
              </div>

              <div class="card setting-card">
                <h3 class="card-title collapsible" @click="isAvatarSectionCollapsed = !isAvatarSectionCollapsed">
                  选择头像
                  <svg :class="{ 'rotated': !isAvatarSectionCollapsed }" class="icon chevron-icon" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                </h3>
                <div v-if="!isAvatarSectionCollapsed" class="avatar-selection-row">
                  <div class="current-avatar-wrapper">
                    <p class="sub-label">当前头像</p>
                    <div class="avatar current-avatar" :style="{ backgroundImage: `url('${avatarUrl}')` }"></div>
                  </div>
                  <div class="new-avatar-wrapper">
                    <p class="sub-label">选择一个新头像</p>
                    <div class="avatar-grid">
                      <div v-for="avatar in availableAvatars" :key="avatar.url"
                           class="avatar option-avatar"
                           :class="{ 'locked': avatar.locked }"
                           :style="{ backgroundImage: `url('${avatar.url}')` }"
                           @click="!avatar.locked && selectAvatar(avatar.url)">
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="card setting-card">
                <h3 class="card-title">绑定邮箱</h3>
                <p class="status-text">
                  当前状态:
                  <span v-if="userStore.user.email" class="status-bound">已绑定 ({{ maskedEmail }})</span>
                  <span v-else class="status-unbound">未绑定</span>
                </p>
                <div v-if="!userStore.user.email" class="form-row">
                  <label class="input-group">
                    <p class="input-label">绑定/修改邮箱</p>
                    <input class="form-input" placeholder="请输入你的邮箱地址" type="email" v-model="email" />
                  </label>
                  <label class="input-group code-group">
                    <p class="input-label">验证码</p>
                    <div class="code-input-row">
                      <input class="form-input" placeholder="6位验证码" v-model="verificationCode" />
                      <button class="btn btn-secondary btn-code" @click="sendVerificationCode">发送验证码</button>
                    </div>
                  </label>
                  <button class="btn btn-primary" @click="bindEmail">确认</button>
                </div>
              </div>

              <div class="card setting-card">
                <h3 class="card-title">绑定微信</h3>
                <div class="wechat-row">
                  <p class="status-text">当前状态: <span class="status-unbound">未绑定</span></p>
                  <button class="btn btn-wechat">
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v3h-3v-3zm-6 0h3v3h-3v-3zm3 3h3v3h-3v-3zm-3 0h2v2h-2v-2zM3 21h6v-6H3v6zm2-4v2h2v-2H5z"/>
                    </svg>
                    <span>绑定微信</span>
                  </button>
                </div>
              </div>

              <div class="card setting-card">
                <h3 class="card-title">我的班级/群</h3>
                <div v-if="userStore.user.group">
                  <p>你已加入班级/群: {{ userStore.user.group.name }}</p>
                  <p v-if="!isGroupAdmin">群口号: {{ userStore.user.group.slogan }}</p>
                  
                  <div v-if="isGroupAdmin" class="form-row">
                    <label class="input-group">
                      <p class="input-label">修改群口号</p>
                      <input class="form-input" v-model="newGroupSlogan" />
                    </label>
                  </div>

                  <div class="avatar-selection-row">
                    <div class="current-avatar-wrapper">
                      <p class="sub-label">当前群头像</p>
                      <div class="avatar current-avatar" :style="{ backgroundImage: `url('${groupAvatarUrl}')` }"></div>
                    </div>
                  </div>
                  <div v-if="showUpdateGroupAvatar">
                    <h4 class="sub-title">选择一个新的群头像</h4>
                    <div class="avatar-grid">
                      <div v-for="avatar in availableGroupAvatars" :key="avatar"
                           class="avatar option-avatar"
                           :class="{ 'selected': newGroup.avatar === avatar.split('/').pop() }"
                           :style="{ backgroundImage: `url('${avatar}')` }"
                           @click="updateGroupAvatar(avatar)">
                      </div>
                    </div>
                  </div>
                  <div class="actions-row">
                    <button v-if="isGroupAdmin" class="btn btn-secondary" @click="updateGroupSlogan">保存口号</button>
                    <button v-if="isGroupAdmin" class="btn btn-secondary" @click="showUpdateGroupAvatar = !showUpdateGroupAvatar">
                      {{ showUpdateGroupAvatar ? '取消修改' : '修改头像' }}
                    </button>
                    <button class="btn btn-secondary" @click="leaveGroup">退出该群</button>
                    <button v-if="isGroupAdmin" class="btn btn-danger" @click="disbandGroup">解散群</button>
                  </div>
                </div>
                <div v-else>
                  <div v-if="!showCreateGroupForm">
                    <h4 class="sub-title">搜索并加入班级/群</h4>
                    <div class="form-row">
                      <label class="input-group">
                        <p class="input-label">输入班级/群名称</p>
                        <input class="form-input" v-model="groupSearchQuery" @input="debouncedSearchGroups" placeholder="模糊搜索班级/群..." />
                      </label>
                    </div>
                    <ul v-if="groupSearchResults.length" class="group-search-results">
                      <li v-for="group in groupSearchResults" :key="group.id">
                        <span>{{ group.name }} ({{ group.memberCount }}人)</span>
                        <button class="btn btn-secondary" @click="joinGroup(group.id)">加入</button>
                      </li>
                    </ul>
                    <p v-if="searched && !groupSearchResults.length">没有找到匹配的班级/群。</p>
                    <div class="actions-row">
                        <button class="btn btn-link" @click="showCreateGroupForm = true">没有找到？创建一个新班级/群</button>
                    </div>
                  </div>
                  <div v-else>
                    <h4 class="sub-title">创建新班级/群</h4>
                    <div class="form-row vertical">
                      <label class="input-group">
                        <p class="input-label">班级/群名称</p>
                        <input class="form-input" v-model="newGroup.name" placeholder="例如：快乐学习群" />
                      </label>
                      <label class="input-group">
                        <p class="input-label">班级/群口号</p>
                        <input class="form-input" v-model="newGroup.slogan" placeholder="例如：天天向上" />
                      </label>
                      <p class="input-label">选择班级/群头像</p>
                      <div class="avatar-grid">
                        <div v-for="avatar in availableGroupAvatars" :key="avatar"
                             class="avatar option-avatar"
                             :class="{ 'selected': newGroup.avatar === avatar.split('/').pop() }"
                             :style="{ backgroundImage: `url('${avatar}')` }"
                             @click="selectGroupAvatar(avatar)">
                        </div>
                      </div>
                    </div>
                    <div class="actions-row">
                      <button class="btn btn-secondary" @click="showCreateGroupForm = false">返回搜索</button>
                      <button class="btn btn-primary" @click="createGroup">确认创建</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="footer-actions">
                <button class="btn btn-primary btn-large">保存设置</button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, watch, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from 'vue-toastification';
import { userStore } from '../store/user.js';

const toast = useToast();
const newNickname = ref('');
const email = ref('');
const verificationCode = ref('');
const isAvatarSectionCollapsed = ref(true); // 控制头像区域折叠

// --- 班级功能所需变量 ---
const groupSearchQuery = ref('');
const groupSearchResults = ref([]);
const searched = ref(false);
const showCreateGroupForm = ref(false);
const showUpdateGroupAvatar = ref(false);
const newGroupSlogan = ref(''); // 新增：用于绑定群口号输入框
const newGroup = ref({
  name: '',
  slogan: '',
  avatar: 'team_1.png'
});

// 2. 注入 Header 颜色控制 (修复 Dark Mode)
const setHeaderBgColor = inject('setHeaderBgColor');

const updateHeaderColor = () => {
    if (setHeaderBgColor) {
        setHeaderBgColor(userStore.theme === 'dark' ? '#1a202c' : '#fff8f5');
    }
};

onMounted(() => {
    updateHeaderColor();
    if (fetchUserInfo) {
        fetchUserInfo();
    }
    watch(() => userStore.theme, () => {
        updateHeaderColor();
    });
});

onUnmounted(() => {
    if (setHeaderBgColor) {
        setHeaderBgColor('transparent');
    }
});

const isGroupAdmin = computed(() => {
  return userStore.user && userStore.user.group && userStore.user.group.admin === userStore.user.id;
});

const groupAvatarUrl = computed(() => {
  const avatar = userStore.user.group?.avatar;
  if (!avatar) {
    return '/images/team_1.png'; // 默认头像
  }
  return `/images/${avatar}`;
});

const availableGroupAvatars = computed(() => {
  const avatars = [];
  for (let i = 1; i <= 30; i++) {
    avatars.push(`/images/team_${i}.png`);
  }
  return avatars;
});

function selectGroupAvatar(avatarPath) {
  newGroup.value.avatar = avatarPath.split('/').pop();
}

// 从 App.vue 注入刷新函数
const fetchUserInfo = inject('fetchUserInfo');

// 监听 userStore 的变化，并更新 newNickname
watch(() => userStore.user.nickname, (newVal) => {
  newNickname.value = newVal;
}, { immediate: true });

// 监听群信息变化，更新群口号输入框的初始值
watch(() => userStore.user.group, (newGroupInfo) => {
  if (newGroupInfo) {
    newGroupSlogan.value = newGroupInfo.slogan;
  }
}, { immediate: true, deep: true });

const maskedEmail = computed(() => {
  const email = userStore.user.email;
  if (!email) return '';
  const atIndex = email.indexOf('@');
  if (atIndex <= 3) {
    return email.substring(0, atIndex) + '***' + email.substring(atIndex);
  }
  return email.substring(0, 3) + '***' + email.substring(atIndex);
});

const membershipStatus = computed(() => {
  const expiry = userStore.user.subscriptionExpiry;
  if (!expiry) {
    return { text: '普通用户', expiryInfo: '开通会员，解锁全部特权！' };
  }
  const expiryDate = new Date(expiry);
  if (expiryDate < new Date()) {
    return { text: '会员已过期', expiryInfo: `您的会员已于 ${expiryDate.toLocaleDateString()} 过期` };
  }
  return { text: '尊贵会员', expiryInfo: `您的会员将于 ${expiryDate.toLocaleDateString()} 到期` };
});

const avatarUrl = computed(() => {
  const avatar = userStore.user.avatar;
  if (!avatar) {
    return '/images/bubu.png';
  }
  if (avatar.startsWith('http')) {
    return avatar;
  }
  return `/images/${avatar}`;
});

const availableAvatars = computed(() => {
  const credits = userStore.user.credits || 0;
  const allAvatarGroups = [
    { min: 0, range: [11, 19] },
    { min: 200, range: [21, 29] },
    { min: 400, range: [31, 39] },
    { min: 600, range: [41, 49] },
    { min: 800, range: [51, 59] },
    { min: 1000, range: [61, 69] }
   ];

  const result = [];
  allAvatarGroups.forEach(group => {
    for (let i = group.range[0]; i <= group.range[1]; i++) {
      result.push({
        url: `/images/penguins_${i}.png`,
        locked: credits < group.min
      });
    }
  });
  
  return result;
});

// --- 防抖函数 ---
function debounce(fn, delay) {
  let timeoutId = null;
  return function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

// --- 班级功能方法 ---
async function searchGroups() {
  searched.value = true;
  if (groupSearchQuery.value.trim() === '') {
    groupSearchResults.value = [];
    return;
  }
  try {
    const response = await fetch(`/api/groups/search?name=${groupSearchQuery.value}`);
    if (response.ok) {
      groupSearchResults.value = await response.json();
    } else {
      toast.error('搜索班级失败');
    }
  } catch (error) {
    toast.error('网络错误，搜索班级失败');
  }
}

const debouncedSearchGroups = debounce(searchGroups, 300);

async function joinGroup(groupId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/groups/${groupId}/join`, {
      method: 'POST',
      headers: { 'Authorization': token }
    });
    if (response.ok) {
      toast.success('成功加入班级！');
      if (fetchUserInfo) await fetchUserInfo();
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || '加入班级失败');
    }
  } catch (error) {
    toast.error('网络错误，加入班级失败');
  }
}

async function createGroup() {
  if (!newGroup.value.name.trim()) {
    toast.error('班级名称不能为空');
    return;
  }
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(newGroup.value)
    });
    if (response.ok) {
      toast.success('班级创建成功！');
      if (fetchUserInfo) await fetchUserInfo();
      showCreateGroupForm.value = false;
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || '创建班级失败');
    }
  } catch (error) {
    toast.error('网络错误，创建班级失败');
  }
}

async function leaveGroup() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/groups/leave', {
      method: 'POST',
      headers: { 'Authorization': token }
    });
    if (response.ok) {
      toast.success('你已成功退出该群');
      if (fetchUserInfo) await fetchUserInfo();
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || '退群失败');
    }
  } catch (error) {
    toast.error('网络错误，退群失败');
  }
}

async function updateGroupSlogan() {
  if (!newGroupSlogan.value || !newGroupSlogan.value.trim()) {
    toast.error('群口号不能为空');
    return;
  }
  if (newGroupSlogan.value === userStore.user.group.slogan) {
    toast.info('新旧口号相同，无需修改');
    return;
  }
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/groups/slogan', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ slogan: newGroupSlogan.value })
    });
    if (response.ok) {
      toast.success('群口号更新成功！');
      if (fetchUserInfo) await fetchUserInfo();
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || '群口号更新失败');
    }
  } catch (error) {
    toast.error('网络错误，更新群口号失败');
  }
}

async function disbandGroup() {
  if (confirm('确定要解散该群吗？此操作不可逆！')) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/groups/disband', {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (response.ok) {
        toast.success('群已成功解散');
        if (fetchUserInfo) await fetchUserInfo();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || '解散群失败');
      }
    } catch (error) {
      toast.error('网络错误，解散群失败');
    }
  }
}

async function updateGroupAvatar(avatarPath) {
  const avatarFilename = avatarPath.split('/').pop();
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/groups/avatar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ avatar: avatarFilename })
    });

    if (response.ok) {
      toast.success('群头像更新成功！');
      showUpdateGroupAvatar.value = false;
      if (fetchUserInfo) {
        await fetchUserInfo();
      }
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || '群头像更新失败');
    }
  } catch (error) {
    console.error('更新群头像失败:', error);
    toast.error('网络错误，更新群头像失败');
  }
}


// --- 原有方法 ---
async function selectAvatar(avatarPath) {
  const avatarFilename = avatarPath.split('/').pop();
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/setAvatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ avatar: avatarFilename })
    });

    if (response.ok) {
      toast.success('头像更新成功！');
      if (fetchUserInfo) {
        await fetchUserInfo();
      }
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || '头像更新失败');
    }
  } catch (error) {
    console.error('更新头像失败:', error);
    toast.error('网络错误，更新头像失败');
  }
}

async function updateNickname() {
  if (!newNickname.value || newNickname.value.trim() === '') {
    toast.error('昵称不能为空');
    return;
  }
  if (newNickname.value === userStore.user.nickname) {
    toast.info('新旧昵称相同，无需修改');
    return;
  }
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/user/nickname', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ nickname: newNickname.value })
    });
    if (response.ok) {
      toast.success('昵称修改成功！');
      if (fetchUserInfo) {
        await fetchUserInfo();
      }
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || '昵称修改失败');
    }
  } catch (error) {
    console.error('更新昵称失败:', error);
    toast.error('网络错误，更新昵称失败');
  }
}

async function sendVerificationCode() {
  if (!email.value || !/^\S+@\S+\.\S+$/.test(email.value)) {
    toast.error('请输入有效的邮箱地址');
    return;
  }
  try {
    const response = await fetch('/api/sendVerificationCode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value })
    });
    if (response.ok) {
      toast.success('验证码已发送，请注意查收');
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || '验证码发送失败');
    }
  } catch (error) {
    toast.error('网络错误，验证码发送失败');
  }
}

async function bindEmail() {
  if (!email.value || !verificationCode.value) {
    toast.error('邮箱和验证码不能为空');
    return;
  }
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/user/bind-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ email: email.value, verificationCode: verificationCode.value })
    });
    if (response.ok) {
      toast.success('邮箱绑定成功！');
      if (fetchUserInfo) {
        await fetchUserInfo();
      }
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || '邮箱绑定失败');
    }
  } catch (error) {
    toast.error('网络错误，邮箱绑定失败');
  }
}
</script>

<style scoped>
/* --- 全局变量定义 (模拟 Tailwind Theme) --- */
.setting-page-container {
  /* Colors */
  --primary-color: #f48c25;
  --primary-light: rgba(244, 140, 37, 0.2); /* primary/20 */
  --primary-fade: rgba(244, 140, 37, 0.5); /* primary/50 */
  
  --bg-light: #fff8f5;
  --bg-card-light: #ffffff;
  --text-main-light: #181411;
  --text-muted-light: #8a7560;
  --border-light: #e6e0db;

  /* Dark Mode Colors */
  --bg-dark: #1a202c;
  --bg-card-dark: #2d3748;
  --text-main-dark: #e2e8f0;
  --text-muted-dark: #a0aec0;
  --border-dark: #4a5568;
  --input-bg-dark: #1a202c;

  /* Status Colors */
  --green-500: #22c55e;
  --red-600: #dc2626;
  --gray-200: #e5e7eb;

  /* Font & Radius */
  --font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  --radius-md: 0.375rem; /* 6px */
  --radius-lg: 0.5rem;   /* 8px */
  --radius-full: 9999px;

  font-family: var(--font-family);
  background-color: var(--bg-light);
  color: var(--text-main-light);
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  transition: background-color 0.3s, color 0.3s;
}

/* 3. Dark Mode 样式覆盖 */
.setting-page-container.dark-mode {
  background-color: var(--bg-dark);
  color: var(--text-main-dark);
}

/* --- 布局 --- */
.layout-container {
  display: flex;
  height: 100%;
  flex-direction: column;
  flex-grow: 1;
}

.content-wrapper {
  display: flex;
  flex: 1;
  justify-content: center;
  padding: 1.25rem 1rem; /* py-5 px-4 */
}

@media (min-width: 640px) { .content-wrapper { padding-left: 1.5rem; padding-right: 1.5rem; } }
@media (min-width: 1024px) { .content-wrapper { padding-left: 2rem; padding-right: 2rem; } }

.main-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 56rem; /* max-w-4xl (896px) */
  flex: 1;
}

.settings-main {
  flex: 1;
  padding-top: 2rem;
  padding-bottom: 2rem;
}

/* 标题 */
.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 2rem;
}

.page-title {
  font-size: 2.25rem; /* text-4xl */
  font-weight: 900;
  line-height: 1.25;
  letter-spacing: -0.033em;
  min-width: 18rem;
  margin: 0;
  transition: color 0.3s;
}

/* 列表容器 */
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 2rem; /* space-y-8 */
}

/* --- 卡片样式 --- */
.card {
  background-color: var(--bg-card-light);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 1.5rem; /* p-6 */
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: background-color 0.3s, border-color 0.3s;
}

.setting-page-container.dark-mode .card {
  background-color: var(--bg-card-dark);
  border-color: var(--border-dark);
}

.card-title {
  font-size: 1.125rem; /* text-lg */
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.015em;
  padding-bottom: 1rem;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: color 0.3s;
}

.card-title.collapsible {
  cursor: pointer;
}

.chevron-icon {
  transition: transform 0.2s ease-in-out;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

/* --- 表单元素 --- */
.form-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-row.vertical {
  flex-direction: column;
  align-items: stretch;
}

@media (min-width: 640px) {
  .form-row {
    flex-direction: row;
    align-items: flex-end;
  }
}

.input-group {
  display: flex;
  flex-direction: column;
  min-width: 10rem;
  flex-grow: 1;
}

.input-label {
  font-size: 1rem;
  font-weight: 500;
  padding-bottom: 0.5rem;
  color: var(--text-muted-light);
  margin: 0;
}

.setting-page-container.dark-mode .input-label {
  color: var(--text-muted-dark);
}

.form-input {
  display: flex;
  width: 96%;
  height: 1.5rem; /* h-10 */
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  background-color: var(--bg-light);
  padding: 0.75rem;
  font-size: 1rem;
  color: var(--text-main-light);
  outline: none;
  transition: box-shadow 0.15s ease-in-out, border-color 0.15s ease-in-out, background-color 0.3s;
}

.setting-page-container.dark-mode .form-input {
  background-color: var(--input-bg-dark);
  border-color: var(--border-dark);
  color: var(--text-main-dark);
}

.form-input::placeholder {
  color: var(--text-muted-light);
}

.setting-page-container.dark-mode .form-input::placeholder {
  color: var(--text-muted-dark);
}

.form-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-fade);
}

/* 按钮 */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem; /* h-10 */
  border-radius: var(--radius-md);
  font-size: 0.875rem; /* text-sm */
  font-weight: 700;
  letter-spacing: 0.015em;
  padding: 0 1.5rem; /* px-6 */
  border: none;
  cursor: pointer;
  white-space: nowrap;
  gap: 0.5rem;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.9;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-secondary {
  background-color: var(--primary-light);
  color: var(--primary-color);
  padding: 0 1rem; /* px-4 */
}

/* Dark mode button adjustment */
.setting-page-container.dark-mode .btn-secondary {
   background-color: rgba(244, 140, 37, 0.3);
   color: #fdba74; 
}

.btn-link {
  background: none;
  color: var(--primary-color);
  text-decoration: underline;
  padding: 0;
  height: auto;
}

.btn-danger {
  background-color: var(--red-600);
  color: white;
}

/* --- 班级功能专属样式 --- */
.sub-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  transition: color 0.3s;
}
.setting-page-container.dark-mode .sub-title {
    color: var(--text-main-dark);
}

.group-search-results {
  list-style: none;
  padding: 0;
  margin-top: 1rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}

.setting-page-container.dark-mode .group-search-results {
    border-color: var(--border-dark);
}

.group-search-results li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-light);
}

.setting-page-container.dark-mode .group-search-results li {
    border-color: var(--border-dark);
}

.group-search-results li:last-child {
  border-bottom: none;
}
.actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}


/* --- 头像选择 --- */
.avatar-selection-row {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

@media (min-width: 640px) {
  .avatar-selection-row {
    flex-direction: row;
    align-items: flex-start;
  }
}

.current-avatar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-top: 20px;
}

.sub-label {
  font-size: 0.875rem; /* text-sm */
  font-weight: 500;
  color: var(--text-muted-light);
  margin: 0;
}

.setting-page-container.dark-mode .sub-label {
  color: var(--text-muted-dark);
}

.avatar {
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  border-radius: var(--radius-full);
}

.current-avatar {
  width: 6rem;  /* size-24 */
  height: 6rem;
  box-shadow: 0 0 0 4px var(--primary-fade);
}

.new-avatar-wrapper {
  flex: 1;
}

.new-avatar-wrapper .sub-label {
  padding-bottom: 0.5rem;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

@media (min-width: 640px) { .avatar-grid { grid-template-columns: repeat(4, 1fr); } }
@media (min-width: 768px) { .avatar-grid { grid-template-columns: repeat(6, 1fr); } }

.option-avatar {
  width: 5rem; /* size-20 */
  height: 5rem;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.option-avatar:hover, .option-avatar.selected {
  box-shadow: 0 0 0 2px var(--primary-color);
}

.option-avatar.locked {
  filter: grayscale(100%);
  cursor: not-allowed;
}

.option-avatar.locked:hover {
  box-shadow: none; /* 锁定时移除 hover 效果 */
}

/* --- 邮箱/验证码 --- */
.status-text {
  font-size: 0.875rem;
  padding-bottom: 1rem;
  color: var(--text-muted-light);
  margin: 0;
}

.setting-page-container.dark-mode .status-text {
  color: var(--text-muted-dark);
}

.status-bound {
  color: var(--green-500);
  font-weight: 600;
}

.status-unbound {
  color: var(--red-600);
  font-weight: 600;
}

.code-group {
  min-width: 10rem;
}

.code-input-row {
  display: flex;
  gap: 0.5rem;
}

/* --- 微信绑定 --- */
.wechat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-wechat {
  background-color: var(--green-500);
  color: white;
}

/* --- 学分 Banner --- */
.credit-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  background-color: var(--primary-light);
  padding: 1.5rem;
  border-radius: var(--radius-md);
}

@media (min-width: 640px) {
  .credit-banner {
    flex-direction: row;
  }
}

/* Dark mode banner adjustment */
.setting-page-container.dark-mode .credit-banner {
  background-color: rgba(244, 140, 37, 0.1);
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
  fill: currentColor;
}

.large-icon {
  width: 3rem; /* text-5xl approx */
  height: 3rem;
  color: var(--primary-color);
}

.credit-info {
  text-align: center;
}

@media (min-width: 640px) { .credit-info { text-align: left; } }

.credit-value {
  font-size: 2.25rem; /* text-4xl */
  font-weight: 900;
  color: var(--primary-color);
  margin: 0;
}

.credit-desc {
  font-size: 0.875rem;
  color: var(--text-muted-light);
  margin-top: 0.25rem;
}

.setting-page-container.dark-mode .credit-desc {
    color: var(--text-muted-dark);
}

.gold-banner {
  background-color: #fffbeb; /* light yellow */
}

.setting-page-container.dark-mode .gold-banner {
  background-color: rgba(245, 158, 11, 0.1);
}

.gold-banner .large-icon, .gold-banner .gold-value {
  color: #f59e0b; /* amber-500 */
}

/* --- 底部按钮 --- */
.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 2rem;
}
</style>