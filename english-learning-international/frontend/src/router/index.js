import { createRouter, createWebHistory } from 'vue-router'
import IndexPage from '../components/IndexPage.vue'

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
        path: 'about',
        name: 'about',
        component: () => import('../components/AboutPage.vue')
      },
      {
        path: 'privacy',
        name: 'privacy',
        component: () => import('../components/PrivacyPage.vue')
      }
    ]
  },
  {
    path: '/index',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Basic auth guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('token');
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router
