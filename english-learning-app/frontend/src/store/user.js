import { reactive } from 'vue';

// 创建一个响应式的全局用户状态
export const userStore = reactive({
  user: {
    nickname: '',
    avatar: '',
    credits: 0,
    golds: 0,
    subscriptionExpiry: null,
    // 可以根据需要添加更多用户信息字段
  },
  theme: localStorage.getItem('theme') || 'light', // 'light' or 'dark'
  showLoginModal: false,

  triggerLoginModal() {
    this.showLoginModal = true;
  },

  closeLoginModal() {
    this.showLoginModal = false;
  },

  // 设置用户信息
  setUser(userData) {
    this.user = { ...userData };
  },

  // 清除用户信息（例如，退出登录时）
  clearUser() {
    this.user = {
      nickname: '',
      avatar: '',
      credits: 0,
      golds: 0,
    };
  },

  // 切换主题
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', this.theme);
    document.documentElement.classList.toggle('dark', this.theme === 'dark');
  }
});

// Initialize theme on load
document.documentElement.classList.toggle('dark', userStore.theme === 'dark');