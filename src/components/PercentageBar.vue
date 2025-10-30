<template>
  <div class="percentage-bar-container">
    <div
      class="percentage-bar-fill"
      :class="variant"
      :style="{ width: `${clampedPercentage}%` }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  percentage: number;
  variant?: 'white' | 'black';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'white'
});

const clampedPercentage = computed(() => {
  return Math.max(0, Math.min(100, props.percentage));
});
</script>

<style scoped>
.percentage-bar-container {
  width: 100%;
  height: 16px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.percentage-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 2px;
}

.percentage-bar-fill.white {
  background-color: #ffffff;
}

.percentage-bar-fill.black {
  background-color: #000000;
}
</style>
