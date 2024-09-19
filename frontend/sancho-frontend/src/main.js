// src/main.js

import { createApp } from 'vue';                  // Vue framework
import App from './App.vue';                      // Root App component
import PrimeVue from 'primevue/config';           // PrimeVue for UI components
import Aura from '@primevue/themes/aura';         // PrimeVue Aura theme
import 'primeicons/primeicons.css';               // PrimeVue Icons
import 'primeflex/primeflex.css';                 // PrimeFlex for utility classes

// Import Vue Router for routing
import router from './router';

// Create the Vue application instance
const app = createApp(App);

// Use PrimeVue with the Aura theme
app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});

// Use Vue Router for managing routes
app.use(router);

// Mount the application to the DOM element with id 'app'
app.mount('#app');
