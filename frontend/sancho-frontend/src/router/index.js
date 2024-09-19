// frontend/sancho-frontend/src/router/index.js

import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../views/LandingPage.vue'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage
  },
  // Future modules can be added here as new routes
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
