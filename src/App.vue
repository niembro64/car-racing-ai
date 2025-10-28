<template>
  <div id="app">
    <CarSimulator />
  </div>
</template>

<script setup lang="ts">
import CarSimulator from './components/CarSimulator.vue';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
  background: #4a7c4e; /* Grass green background */
  color: #2c3e50;
}

#app {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4a7c4e; /* Grass green background */
}
</style>
