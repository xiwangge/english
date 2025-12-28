import { createRouter, createWebHistory } from 'vue-router'
import IndexPage from '../components/IndexPage.vue' // 这个现在是新的首页（原 WelcomePage）
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../components/LoginPage.vue')
  },
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
        path: 'reward',
        name: 'reward',
        component: () => import('../components/RewardPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'setting',
        name: 'setting',
        component: () => import('../components/SettingPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'messages',
        name: 'messages',
        component: () => import('../components/MessageBoard.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'games',
        name: 'games',
        component: () => import('../components/GamesPage.vue')
      },
      {
        path: 'bubble-game',
        name: 'BubbleGame',
        component: () => import('../components/BubbleGame.vue')
      }
    ]
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// router.beforeEach((to, from, next) => {
//   const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
//   const isAuthenticated = localStorage.getItem('token'); // 假设登录状态存储在 localStorage 中

//   if (requiresAuth && !isAuthenticated) {
//     // 如果路由需要认证但用户未登录，则重定向到登录页
//     next('/login');
//   } else {
//     // 否则，正常放行
//     next();
//   }
// });

export default router