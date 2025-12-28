<template>
  <div class="book-page-container" :class="{ 'dark-mode': userStore.theme === 'dark' }">
    
    <div class="book-detail-layout" v-if="bookData">
      <div class="book-hero-section">
        <div class="book-hero-image">
          <img src="/images/banner.jpeg" alt="课程封面">
        </div>
        <div class="book-header">
          <h2>{{ bookData.bookName }}</h2>
        </div>
      </div>
  
      <div class="book-content-layout">
        <div class="book-detail-main">
          <div class="book-tabs">
            <div 
              class="tab" 
              :class="{ active: currentTab === 'intro' }" 
              @click="switchTab('intro')"
            >
              课程介绍
            </div>
            </div>
          
          <div class="book-tab-content">
            <div v-if="currentTab === 'intro'">
              <p>{{ bookData.description }}</p>
            </div>
          </div>
  
          <div class="sidebar-widget chapter-list-box">
            <h3>章节列表</h3>
            <ul class="chapter-list">
              <li v-if="!bookData.units || bookData.units.length === 0">暂无章节</li>
              <li v-for="unit in processedUnits" :key="unit._id" class="chapter-item">
                <span :class="['chapter-icon', unit.status]">{{ unit.icon }}</span>
                <span class="chapter-title">{{ unit.unit }}</span>
                <span :class="['chapter-status', unit.status]">{{ unit.statusText }}</span>
              </li>
            </ul>
          </div>
        </div>
  
        <div class="book-detail-sidebar">
          <div class="sidebar-widget">
             <button v-if="isSubscribed" class="cta-button" @click="continueLearning">
                继续学习
             </button>
             <button v-else class="cta-button" @click="addToMyBooks">
                加入书架
             </button>
          </div>
  
          <div class="sidebar-widget info-widget">
            <ul>
              <li><strong>作者:</strong> {{ bookData.author || '官方课程' }}</li>
              <li><strong>难度:</strong> {{ bookData.difficulty || '中等' }}</li>
              <li><strong>学习人数:</strong> {{ bookData.addedCount || 0 }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="loading-state">
      Loading...
    </div>

  </div>

  <!-- 新增：跳转国际站登录提示模态框 -->
</template>
  
<script setup>
import { ref, onMounted, onUnmounted, computed, inject, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
// 2. 引入 userStore
import { userStore } from '../store/user.js';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const bookData = ref(null);
const userBook = ref(null);
const currentTab = ref('intro');

// 计算属性：处理章节状态
const processedUnits = computed(() => {
  if (!bookData.value || !bookData.value.units) return [];
  
  // 如果已订阅，需要结合 userBook 的学习进度
  // 这里简单模拟，实际需根据 userBook.learningProgress 匹配
  return bookData.value.units.map((unit, index) => {
    let status = 'locked'; // locked, unlocked, completed
    let icon = '🔒';
    let statusText = '未解锁';

    // 默认第一章解锁
    if (index === 0) {
        status = 'unlocked';
        icon = '🔓';
        statusText = '进行中';
    }
    
    // 如果有 userBook 数据，可以在这里进一步判断 status

    return {
      ...unit,
      status,
      icon,
      statusText
    };
  });
});

// 计算属性：判断是否已订阅（通过路由参数或本地状态）
const isSubscribed = computed(() => {
    // 优先使用路由参数，或者根据 userBook 是否存在判断
    return route.query.isSubscribed === 'true' || !!userBook.value;
});

function switchTab(tab) {
  currentTab.value = tab;
}

// 3. 注入 Header 颜色控制
const setHeaderBgColor = inject('setHeaderBgColor');

const updateHeaderColor = () => {
    if (setHeaderBgColor) {
        // 浅色模式 #fff8f5，深色模式 #1a202c
        setHeaderBgColor(userStore.theme === 'dark' ? '#1a202c' : '#fff8f5');
    }
};

async function addToMyBooks() {
  const token = localStorage.getItem('token');
  if (!token) {
    userStore.triggerLoginModal();
    return;
  }
  
  try {
    const response = await fetch('/api/userBook/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ bookId: bookData.value._id })
    });

    if (response.ok) {
      toast.success('成功加入书架！');
      // 刷新页面或重新获取状态
      router.replace({ 
          name: 'book_detail', 
          params: { id: bookData.value._id }, 
          query: { isSubscribed: 'true' } 
      });
      // 简单处理：直接设置 userBook 占位，触发 UI 更新
      userBook.value = { bookId: bookData.value._id };
    } else {
      const err = await response.json();
      toast.error(err.message || '加入失败');
    }
  } catch (error) {
    console.error('添加课程失败:', error);
    toast.error('添加课程失败，请检查网络。');
  }
}

function continueLearning() {
  router.push({ name: 'practice', query: { bookId: route.params.id } });
}

// 4. 监听主题变化
watch(() => userStore.theme, () => {
    updateHeaderColor();
});

onMounted(async () => {
  updateHeaderColor(); // 初始化 Header 颜色

  const { id: bookId } = route.params;
  
  if (!bookId) {
    console.error('Missing bookId');
    return;
  }

  const { isSubscribed } = route.query;
  const token = localStorage.getItem('token');

  try {
    const isSubscribedBool = isSubscribed === 'true';
    let response;
    if (isSubscribedBool) {
      response = await fetch(`/api/userBook/getUserBook?bookId=${bookId}`, {
        headers: { 'Authorization': token }
      });
    } else {
      response = await fetch(`/api/book/getBook?bookId=${bookId}`);
    }

    if (!response.ok) throw new Error('获取课程信息失败');
    
    const data = await response.json();
    if (isSubscribedBool) {
      // 结构可能不同，视后端返回而定
      bookData.value = data.bookId || data; 
      userBook.value = data;
    } else {
      bookData.value = data;
    }
  } catch (error) {
    console.error('加载课程详情失败:', error);
  }
});

onUnmounted(() => {
    if (setHeaderBgColor) setHeaderBgColor('transparent');
});

</script>
  
<style scoped>
/* 引入外部 CSS */
@import '../assets/book_detail.css';

/* 5. 页面容器样式与变量定义 */
.book-page-container {
    padding: 40px;
    box-sizing: border-box;
    min-height: 100vh; /* 占满全屏 */
    
    /* 默认(浅色)变量 */
    --bg-color: #fff8f5;
    --text-color: #333;
    --card-bg: #ffffff;
    --border-color: #e6e0db;
    --primary-color: #f48c25;
    
    /* 应用背景色和文字颜色 */
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: background-color 0.3s ease, color 0.3s ease;
}

/* 6. 暗夜模式适配 (通过覆盖变量) */
.book-page-container.dark-mode {
    --bg-color: #1a202c;
    --text-color: #e2e8f0;
    --card-bg: #2d3748;
    --border-color: #4a5568;
    /* primary-color 通常保持不变或微调 */
}

/* 加载状态样式 */
.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 50vh;
    font-size: 1.2em;
    color: var(--text-color);
    opacity: 0.6;
}

/* 补充：确保 Tab 在暗夜模式下的样式正确 */
.tab {
    cursor: pointer;
    padding: 10px 20px;
    font-weight: bold;
    color: var(--text-color);
    border-bottom: 2px solid transparent;
    transition: all 0.3s;
}
.tab.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
}
</style>