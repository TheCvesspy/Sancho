<!-- frontend/sancho-frontend/src/views/LandingPage.vue -->

<template>
  <div>
    <AppHeader />
    <main class="landing-page">
      <h2>{{ message }}</h2>
      <div class="tiles">
        <!-- Future tiles will be added here -->
        <p>Landing page content goes here.</p>
      </div>
    </main>
  </div>
</template>

<script>
import AppHeader from '@/components/AppHeader.vue'

export default {
  name: 'LandingPage',
  components: {
    AppHeader
  },
  data() {
    return {
      message: ''
    }
  },
  mounted() {
    fetch('http://127.0.0.1:5000/api/landing')
      .then(response => response.json())
      .then(data => {
        this.message = data.message
      })
      .catch(error => {
        console.error('Error fetching landing message:', error)
      })
  }
}
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
</style>
