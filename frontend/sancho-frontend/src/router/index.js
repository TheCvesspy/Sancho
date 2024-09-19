// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';
import LandingPage from '../views/LandingPage.vue';
import EconomyLayout from '../views/economy/EconomyLayout.vue';
import BasicItems from '../views/economy/BasicItems.vue';
import BasicItemsList from '../views/economy/BasicItemsList.vue'; // Import the list component
import NotFound from '../views/NotFound.vue';

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage,
  },
  {
    path: '/economy',
    component: EconomyLayout,
    children: [
      {
        path: 'basic-items',
        name: 'BasicItems',
        component: BasicItems,
      },
      {
        path: 'basic-items-list',
        name: 'BasicItemsList',
        component: BasicItemsList,
      },
      // Future Complex Items route can be added here
    ],
  },
  // Catch-all route for 404 Not Found
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
