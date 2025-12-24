<template>
  <div id="learning-books" :class="{ 'dark-mode': userStore.theme === 'dark' }">
    <h2>正在学习</h2>
    <ul id="learning-list">
      <li v-for="book in learningBooks" :key="book.id">
        <div class="book-card-image">
          <img :src="book.coverImage || '/images/default-course-cover.png'" :alt="book.name">
        </div>
        <div class="card-content">
          <h3>{{ book.name }}</h3>
          <p class="description">{{ book.description }}</p>
          <div class="progress-bar-container">
            <div class="progress-label">
              <span>Progress</span>
              <span>{{ book.progress || 0 }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (book.progress || 0) + '%' }"></div>
            </div>
          </div>
          <a href="#" @click.prevent="toPractice(book.id)" class="card-button">继续学习</a>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, inject, watch } from 'vue';
import { useRouter } from 'vue-router';
// 引入 userStore
import { userStore } from '../store/user.js';

const router = useRouter();
const learningBooks = ref([]);

// 2. 注入 Header 颜色控制
const setHeaderBgColor = inject('setHeaderBgColor');

const updateHeaderColor = () => {
    if (setHeaderBgColor) {
        // 浅色模式 #fff8f5，深色模式 #1a202c
        setHeaderBgColor(userStore.theme === 'dark' ? '#1a202c' : '#fff8f5');
    }
};

function toPractice(bookId) {
  router.push({ name: 'practice', query: { bookId } });
}

onMounted(async () => {
  // 初始化 Header 颜色
  updateHeaderColor();

  const token = localStorage.getItem('token');
  if (!token) {
    console.error('Token not found.');
    return;
  }

  try {
    const response = await fetch('/api/learning-books', {
      method: 'GET',
      headers: { 'Authorization': token }
    });
    const data = await response.json();
    learningBooks.value = data;
  } catch (error) {
    console.error('获取正在学习的课程失败:', error);
  }
});

// 监听主题变化，实时更新 Header
watch(() => userStore.theme, () => {
    updateHeaderColor();
});

onUnmounted(() => {
    // 离开时重置 Header 为透明
    if (setHeaderBgColor) setHeaderBgColor('transparent');
});
</script>

<style scoped>
@import '../assets/style.css';
@import '../assets/book.css';

#learning-books {
  padding: 40px;
  box-sizing: border-box;
  min-height: 100vh;
  transition: background-color 0.3s ease, color 0.3s ease;
  
  /* 3. 修正默认背景色 */
  background-color: #fff8f5; 
  color: #333;
  
  /* 定义默认(浅色)变量，传递给子组件 book.css */
  --card-bg: #ffffff;
  --text-color: #333;
  --border-color: #e6e0db;
}

#learning-books h2 {
  color: #333;
  transition: color 0.3s ease;
}

/* 4. 暗夜模式 (Data Driven) */
#learning-books.dark-mode {
  background-color: #1a202c; /* 深色背景 */
  color: #e2e8f0;
  
  /* 重写变量，影响内部的 book.css 样式 */
  --card-bg: #2d3748;
  --text-color: #e2e8f0;
  --border-color: #4a5568;
}

#learning-books.dark-mode h2 {
  color: #e2e8f0;
}
</style>