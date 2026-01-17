<template>
  <router-view></router-view>
</template>

<script setup>
import { onMounted, provide } from 'vue';
import { useRouter } from 'vue-router';
import { userStore } from './store/user.js';
import { useToast } from 'vue-toastification';

const router = useRouter();
const toast = useToast();

async function fetchUserInfo() {
  const token = localStorage.getItem('token');
  if (!token) {
    userStore.clearUser();
    return;
  }
  
  try {
    const response = await fetch(`/api/userinfo?t=${Date.now()}`, {
      headers: { 'Authorization': token }
    });
    if (response.ok) {
      const userData = await response.json();
      userStore.setUser(userData);
    } else if (response.status === 401) {
      localStorage.removeItem('token');
      userStore.clearUser();
      // Only toast error if we actually had a token that failed
      if (token) {
        toast.error('会话已过期，请重新登录');
      }
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

  // 1. 优先处理 SSO 登录
  console.log('Current URL params:', urlParams.toString());
  if (ssoCode) {
    console.log('Detected sso_code, verifying...');
    try {
      const response = await fetch('/api/verify-sso-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ssoCode })
      });
      const data = await response.json();
      if (data.token) {
        console.log('SSO verification successful, setting token');
        localStorage.setItem('token', data.token);
        toast.success('登录成功！');
        
        // 清除 URL 中的 code，不触发刷新
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);

        // 如果在登录页，跳转到首页
        if (window.location.pathname === '/login') {
          router.push('/');
        }
      } else {
        console.error('SSO verification failed:', data.message);
        toast.error(data.message || '单点登录失败');
      }
    } catch (error) {
      console.error('SSO 验证请求失败:', error);
      toast.error('登录验证请求失败');
    }
  }

  // 2. 然后处理邀请码
  if (invitationCode) {
    localStorage.setItem('invitationCode', invitationCode);
  }

  // 3. 最后获取用户信息
  fetchUserInfo();
});
</script>

<style>
@import 'vue-toastification/dist/index.css';
</style>