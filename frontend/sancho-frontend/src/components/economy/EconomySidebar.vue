<!-- src/components/economy/EconomySidebar.vue -->

<template>
  <div class="sidebar">
    <h2>Economy</h2>
    <nav>
      <ul>
        <li>
          <router-link to="/economy/basic-items">Add Basic Item</router-link>
        </li>
        <li>
          <router-link to="/economy/basic-items-list">View Basic Items</router-link>
        </li>
        <li>
          <router-link to="/economy/complex-items">Complex Items</router-link>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script>
export default {
  name: 'EconomySidebar',
};
</script>

<style scoped>
.sidebar {
  width: 200px;
  background-color: #f0f0f0;
  padding: 20px;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

.sidebar h2 {
  margin-bottom: 20px;
  font-size: 24px;
  color: #333;
}

.sidebar nav ul {
  list-style: none;
  padding: 0;
}

.sidebar nav ul li {
  margin-bottom: 10px;
}

.sidebar nav ul li a {
  text-decoration: none;
  color: #007bff;
  font-size: 18px;
}

.sidebar nav ul li a.router-link-active {
  font-weight: bold;
  color: #0056b3;
}
</style>
