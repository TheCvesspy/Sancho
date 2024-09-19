// src/main.js

import { createApp } from 'vue';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

import router from './router';

// PrimeVue Components
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';

const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
});

app.use(router);
app.use(ToastService);

// Register Toast with a multi-word name
app.component('PrimeToast', Toast);

app.mount('#app');
