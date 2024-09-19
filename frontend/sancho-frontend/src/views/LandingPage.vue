<!-- src/views/LandingPage.vue -->

<template>
  <div>
    <AppHeader />
    <main class="landing-page">
      <h2>Welcome to Sancho!</h2>
      <div class="tiles">
        <Card class="tile" @click="navigateToEconomy">
          <h3>Economy Module</h3>
          <p>Manage your in-game economy.</p>
          <Button label="Go to Economy" icon="pi pi-arrow-right" class="p-mt-2" />
        </Card>
        <!-- Future tiles for other modules can be added here -->
      </div>
    </main>
  </div>
</template>

<script>
import AppHeader from '@/components/AppHeader.vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

export default {
  name: 'LandingPage',
  components: {
    AppHeader,
    Card,
    Button,
  },
  setup() {
    const router = useRouter();

    const navigateToEconomy = () => {
      router.push('/economy/basic-items');
    };

    return {
      navigateToEconomy,
    };
  },
};
</script>

<style scoped>
.landing-page {
  padding: 20px;
  text-align: center;
}

.tiles {
  margin-top: 40px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20px;
}

.tile {
  width: 250px;
  cursor: pointer;
  transition: transform 0.2s;
}

.tile:hover {
  transform: scale(1.05);
}
</style>
