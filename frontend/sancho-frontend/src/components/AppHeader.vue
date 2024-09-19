<!-- src/components/AppHeader.vue -->

<template>
  <header class="header">
    <img src="@/assets/logo.png" alt="Sancho Logo" class="logo" />
    <h1 class="app-name">Sancho</h1>
  </header>
</template>

<script>
export default {
  name: 'AppHeader'
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo {
  height: 40px;
  margin-right: 10px;
}

.app-name {
  font-size: 24px;
  color: #333333;
}
</style>
