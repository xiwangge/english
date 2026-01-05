<template>
  <router-view></router-view>
</template>

<script setup>
import { onMounted, provide } from 'vue';
import { useRouter } from 'vue-router';
import { userStore } from './store/user.js';
import { useToast } from 'vue-toastification';

import RaceDemo from './components/raceDemo.vue';

const router = useRouter();
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

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const ssoCode = urlParams.get('sso_code');
  const invitationCode = urlParams.get('ref');

  // 优先处理 SSO 登录
  if (ssoCode) {
    try {
      const response = await fetch('/api/verify-sso-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ssoCode })
      });
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        toast.success('登录成功！');
        // 登录成功后，清除 URL 中的 code，避免刷新时重复验证
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 如果在登录页，跳转到首页
        if (window.location.pathname === '/login') {
          router.push('/');
        }
      } else {
        toast.error(data.message || '单点登录失败');
      }
    } catch (error) {
      console.error('SSO 验证失败:', error);
      toast.error('登录验证请求失败');
    }
  }

  // 然后处理邀请码
  if (invitationCode) {
    localStorage.setItem('invitationCode', invitationCode);
    console.log('Invitation code from URL saved:', invitationCode);
  }

  // 最后，在所有逻辑处理完毕后获取用户信息
  // 无论 SSO 是否成功，都尝试获取用户信息（如果本地有 token 的话）
  fetchUserInfo();
});
</script>

<style>
/* 全局导入 vue-toastification 样式 */
@import 'vue-toastification/dist/index.css';
</style>
