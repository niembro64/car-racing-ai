<template>
  <div :class="['percentage-bar-container', { compact }]">
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
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'white',
  compact: false
});

const clampedPercentage = computed(() => {
  return Math.max(0, Math.min(100, props.percentage));
});
</script>

<style scoped>
.percentage-bar-container {
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
  min-height: 8px;
}

.percentage-bar-container.compact {
  border-radius: 1px;
  min-height: 6px;
}

.percentage-bar-fill {
  height: 100%;
  border-radius: 2px;
}

.compact .percentage-bar-fill {
  border-radius: 1px;
}

.percentage-bar-fill.white {
  background-color: #ffffff;
}

.percentage-bar-fill.black {
  background-color: #000000;
}
</style>
