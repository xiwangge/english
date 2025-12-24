<template>
  <router-view></router-view>
</template>

<script setup>
import { onMounted, provide } from 'vue';
import { userStore } from './store/user.js';
import { useToast } from 'vue-toastification';

import RaceDemo from './components/raceDemo.vue';

const toast = useToast();

async function fetchUserInfo() {
  const token = localStorage.getItem('token');
  if (!token) {
    userStore.clearUser();
    return;
  }
  
  try {
    const response = await fetch('/api/userinfo', {
      headers: { 'Authorization': token }
    });
    if (response.ok) {
      const userData = await response.json();
      userStore.setUser(userData);
    } else {
      localStorage.removeItem('token');
      userStore.clearUser();
      toast.error('会话已过期，请重新登录');
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
    userStore.clearUser();
  }
}

provide('fetchUserInfo', fetchUserInfo);

onMounted(() => {
  // 首次加载时获取用户信息
  fetchUserInfo();

  // 处理邀请码
  const urlParams = new URLSearchParams(window.location.search);
  const invitationCode = urlParams.get('ref');
  if (invitationCode) {
    localStorage.setItem('invitationCode', invitationCode);
    console.log('Invitation code from URL saved:', invitationCode);
  }
});
</script>

<style>
/* 全局导入 vue-toastification 样式 */
@import 'vue-toastification/dist/index.css';
</style>
