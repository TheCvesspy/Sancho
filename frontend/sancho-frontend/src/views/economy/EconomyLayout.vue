<!-- src/views/economy/EconomyLayout.vue -->

<template>
  <div class="economy-container">
    <EconomySidebar />
    <div class="content">
      <router-view />
    </div>
  </div>
</template>

<script>
import EconomySidebar from '../../components/economy/EconomySidebar.vue';

export default {
  name: 'EconomyLayout',
  components: {
    EconomySidebar,
  },
};
</script>

<style scoped>
.economy-container {
  display: flex;
  height: 100vh;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
