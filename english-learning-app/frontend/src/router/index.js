import { createRouter, createWebHistory } from 'vue-router'
import IndexPage from '../components/IndexPage.vue' // 这个现在是新的首页（原 WelcomePage）
const routes = [
  {
    path: '/',
    name: 'index',
    component: IndexPage,
    children: [
      {
        path: '', // 默认子路由
        name: 'home',
        component: () => import('../components/HomePage.vue')
      },
      {
        path: 'my',
        name: 'my',
        component: () => import('../components/MyPage.vue')
      },
      {
        path: 'books',
        name: 'book',
        component: () => import('../components/BookPage.vue')
      },
      {
        path: 'books/:id',
        name: 'book_detail',
        component: () => import('../components/BookDetailPage.vue')
      },
      {
        path: 'practice',
        name: 'practice',
        component: () => import('../components/PracticePage.vue')
      },
      {
        path: 'typing',
        name: 'typing',
        component: () => import('../components/TypingPracticePage.vue')
      },
      {
        path: 'race',
        name: 'race',
        component: () => import('../components/raceDemo.vue')
      },
      {
        path: 'setting',
        name: 'setting',
        component: () => import('../components/SettingPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'games',
        name: 'GameCenter',
        component: () => import('../components/GameCenter.vue')
      },
      {
        path: 'bubble-game',
        name: 'BubbleGame',
        component: () => import('../components/BubbleGame.vue')
      },
      {
        path: 'sword-game',
        name: 'SwordGame',
        component: () => import('../components/SwordGame.vue')
      },
      {
        path: 'carrot-game',
        name: 'CarrotGame',
        component: () => import('../components/CarrotGame.vue')
      }
    ]
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.onError((error) => {
  const errorMsg = error?.message || error?.toString() || '';
  const isChunkError = /Failed to fetch dynamically imported module|Loading chunk|error loading dynamically imported module|Importing a module script failed/i.test(errorMsg);

  if (isChunkError) {
    console.warn('Router error: Chunk load failed, reloading...', errorMsg);
    // Add a small delay for better user experience
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
})


export default router