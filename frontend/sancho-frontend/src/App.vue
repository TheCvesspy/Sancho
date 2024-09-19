<!-- src/App.vue -->

<template>
  <div id="app">
    <PrimeToast />
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
};
</script>

<style>
/* Global styles */
body {
  margin: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  background-color: #f5f5f5;
}
</style>
