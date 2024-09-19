<!-- src/views/NotFound.vue -->

<template>
  <div class="not-found">
    <h1>404 - Page Not Found</h1>
    <p>The page you are looking for does not exist.</p>
    <router-link to="/">Go Back Home</router-link>
  </div>
</template>

<script>
export default {
  name: 'NotFound',
};
</script>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
}

.not-found h1 {
  font-size: 48px;
  margin-bottom: 20px;
  color: #333;
}

.not-found p {
  font-size: 18px;
  margin-bottom: 20px;
}

.not-found a {
  font-size: 16px;
  color: #007bff;
  text-decoration: none;
}

.not-found a:hover {
  text-decoration: underline;
}
</style>
