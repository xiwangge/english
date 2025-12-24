<template>
  <div id="all-books" :class="{ 'dark-mode': userStore.theme === 'dark' }">
    <h2>所有课程</h2>
    <ul id="all-list">
      <li v-for="book in allBooks" :key="book._id">
        <a href="#" @click.prevent="loadCourseDetail(book._id, isSubscribed(book._id))" style="display: block; text-decoration: none; color: inherit; position: relative;">
          <span v-if="isSubscribed(book._id)" class="subscribed-check">✓ 已添加</span>
          <div class="book-card-image">
            <img :src="book.coverImage || '/images/default-course-cover.png'" :alt="book.bookName">
          </div>
          <div class="card-content">
            <h3>{{ book.bookName }}</h3>
            <p class="description">{{ book.description }}</p>
            <div class="book-stats">
              <span>🔥 {{ book.addedCount || 0 }} 人在学</span>
              <span style="margin-left: 10px;">🏆 {{ book.completedCount || 0 }} 人完成</span>
            </div>
            <div style="font-size: 0.9em; color: #e59f42; margin-top: 10px;">点击查看详情</div>
          </div>
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, inject, watch } from 'vue';
import { useRouter } from 'vue-router';
// 2. 引入 userStore
import { userStore } from '../store/user.js';

const router = useRouter();
const allBooks = ref([]);
const subscribedBookIds = ref(new Set());

// 3. 注入 Header 颜色控制
const setHeaderBgColor = inject('setHeaderBgColor');

const updateHeaderColor = () => {
    if (setHeaderBgColor) {
        // 浅色模式 #fff8f5，深色模式 #1a202c
        setHeaderBgColor(userStore.theme === 'dark' ? '#1a202c' : '#fff8f5');
    }
};

function loadCourseDetail(bookId, isSubscribed) {
  router.push({ name: 'book_detail', params: { id: bookId }, query: { isSubscribed } });
}

function isSubscribed(bookId) {
  return subscribedBookIds.value.has(bookId);
}

// 4. 监听主题变化
watch(() => userStore.theme, () => {
    updateHeaderColor();
});

onMounted(async () => {
  updateHeaderColor(); // 初始化 Header 颜色

  const token = localStorage.getItem('token');
  if (!token) {
    console.error('Token not found.');
    return;
  }

  try {
    const [allBooksResponse, learningBookResponse] = await Promise.all([
      fetch('/api/allBooks', {
        method: 'GET',
        headers: { 'Authorization': token }
      }),
      fetch('/api/learning-bookIds', {
        method: 'GET',
        headers: { 'Authorization': token }
      })
    ]);

    const books = await allBooksResponse.json();
    allBooks.value = books;
    
    if (learningBookResponse.ok) {
      const learningBooks = await learningBookResponse.json();
      subscribedBookIds.value = new Set(learningBooks.map(b => b.id));
    }
  } catch (error) {
    console.error('获取所有课程失败:', error);
  }
});

onUnmounted(() => {
    // 离开页面时重置 Header 为透明
    if (setHeaderBgColor) setHeaderBgColor('transparent');
});
</script>

<style scoped>
@import '../assets/style.css';
@import '../assets/book.css';

#all-books {
  padding: 40px;
  box-sizing: border-box;
  min-height: 100vh;
  
  /* 5. 定义默认(浅色)样式变量 */
  background-color: #fff8f5; 
  color: #333;
  --card-bg: #fff;
  --text-color: #333;
  --border-color: #eee;
  
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* 6. 暗夜模式适配 (通过覆盖变量自动适配 book.css) */
#all-books.dark-mode {
  background-color: #1a202c;
  color: #e2e8f0;
  
  --card-bg: #2d3748;
  --text-color: #e2e8f0;
  --border-color: #4a5568;
}

/* 针对本页特有的统计文字颜色适配 */
.book-stats {
  font-size: 0.85em;
  color: var(--text-color, #888);
  opacity: 0.8;
  margin-top: 8px;
  display: flex;
  align-items: center;
}
</style>