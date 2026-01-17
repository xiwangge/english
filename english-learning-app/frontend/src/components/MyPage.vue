<template>
  <div id="learning-books" :class="{ 'dark-mode': userStore.theme === 'dark' }">
    <div class="teacher-selection-bar">
      <div class="bar-header">
        <h3>发音老师</h3>
        <span class="current-teacher-name">当前: {{ userStore.user.preferredTeacher?.name || 'Sydney' }}</span>
      </div>
      <div class="teacher-scroll-container">
        <div class="teacher-item" 
             :class="{ 'active': !userStore.user.preferredTeacher }"
             @click="handleTeacherClick(null)">
          <div class="teacher-avatar-small" style="background-image: url('/images/ai.png')"></div>
          <span>默认</span>
        </div>
        <div v-for="teacher in teachers" :key="teacher._id"
             class="teacher-item"
             :class="{ 'active': userStore.user.preferredTeacher?._id === teacher._id }"
             @click="handleTeacherClick(teacher)">
          <div class="teacher-avatar-small" :style="{ backgroundImage: `url('${teacher.avatar || '/images/ai.png'}')` }"></div>
          <span>{{ teacher.name }}</span>
        </div>
      </div>
      <audio ref="audioPlayer" hidden></audio>
    </div>

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
              <span>{{ (book.progress || 0).toFixed(2) }}%</span>
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
import { useToast } from 'vue-toastification';
// 引入 userStore
import { userStore } from '../store/user.js';

const router = useRouter();
const toast = useToast();
const learningBooks = ref([]);
const teachers = ref([]);
const audioPlayer = ref(null);

// 注入全局刷新用户信息的方法
const fetchUserInfo = inject('fetchUserInfo');

// 2. 注入 Header 颜色控制
const setHeaderBgColor = inject('setHeaderBgColor');

const updateHeaderColor = () => {
    if (setHeaderBgColor) {
        // 浅色模式 #fff8f5，深色模式 #1a202c
        setHeaderBgColor(userStore.theme === 'dark' ? '#1a202c' : '#fff8f5');
    }
};

function toPractice(bookId) {
  const book = learningBooks.value.find(b => b.id === bookId);
  // 订阅检查
  if (book && !book.isFree) {
    const expiry = userStore.user.subscriptionExpiry;
    if (!expiry || new Date(expiry) < new Date()) {
      toast.info('订阅已过期，请前往国际站续费后继续使用。');
      //setTimeout(() => {
      //  window.open('http://43.173.248.180:5001', '_blank');
      //}, 2000);
      return;
    }
  }
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

  // 获取老师列表
  try {
    const res = await fetch('/api/teachers', {
      headers: { 'Authorization': token }
    });
    if (res.ok) {
      teachers.value = await res.json();
    }
  } catch (err) {
    console.error('获取老师列表失败:', err);
  }
});

async function updateTeacher(teacherId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/user/preferred-teacher', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ teacherId })
    });
    if (response.ok) {
      toast.success('发音老师已切换');
      if (fetchUserInfo) await fetchUserInfo();
    }
  } catch (error) {
    toast.error('网络错误');
  }
}

function handleTeacherClick(teacher) {
  const teacherId = teacher ? teacher._id : null;
  const pathDir = teacher ? teacher.pathDir : null;
  const exampleSentence = teacher ? teacher.exampleSentence : 'Sydney';

  // 播放例句音频：使用 exampleSentence 字段作为文件名
  let audioUrl;
  if (pathDir && exampleSentence) {
    // audioUrl = `https://assets.xuebubu.com/mp3/${pathDir}/${exampleSentence}.mp3`;
    audioUrl = `${exampleSentence}`;
  } else {
    audioUrl = `${exampleSentence}`;
  }

  if (audioPlayer.value) {
    audioPlayer.value.src = audioUrl;
    audioPlayer.value.play().catch(e => console.error('播放发音老师例句失败:', e));
  }

  // 更新后端设置
  updateTeacher(teacherId);
}

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

/* 📱 移动端适应 (Mobile Adaptation) */
@media (max-width: 1100px) {
    #learning-books {
        padding: 20px 15px;
    }

    #learning-books h2 {
        font-size: 1.5rem;
        margin-bottom: 15px;
    }
}

/* --- 老师选择栏样式 --- */
.teacher-selection-bar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: 1rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.bar-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.current-teacher-name {
  font-size: 0.8rem;
  color: var(--primary-color);
  font-weight: 500;
  background: var(--primary-light);
  padding: 2px 8px;
  border-radius: 999px;
}

.teacher-scroll-container {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  padding-bottom: 5px;
  -webkit-overflow-scrolling: touch;
}

/* 隐藏滚动条但保留功能 */
.teacher-scroll-container::-webkit-scrollbar {
  display: none;
}

.teacher-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.teacher-item:active {
  transform: scale(0.9);
}

.teacher-avatar-small {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 3px solid transparent;
  transition: all 0.2s;
}

.teacher-item.active .teacher-avatar-small {
  border-color: var(--primary-color);
  box-shadow: 0 0 10px var(--primary-fade);
}

.teacher-item span {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-color);
}

.teacher-item.active span {
  color: var(--primary-color);
}
</style>