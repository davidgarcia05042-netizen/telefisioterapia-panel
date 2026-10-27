<template>
  <div class="scrubber-container">
    <button class="play-btn" :aria-label="isPlaying ? 'Pausar' : 'Reproducir'"
            :title="isPlaying ? 'Pausar' : 'Reproducir'" @click="$emit('toggle-play')">
      <pause v-if="isPlaying" aria-hidden="true" />
      <play v-else aria-hidden="true" />
    </button>
    <input 
      type="range" 
      min="0" 
      :max="totalFrames - 1" 
      :value="modelValue"
      @input="onInput"
      class="timeline-slider"
    />
    <span class="time-label">{{ currentTimeFormatted }} / {{ totalTimeFormatted }}</span>
  </div>
</template>

<script>
import { Pause, Play } from 'mdue';

export default {
  name: 'PlaybackControls',
  components: { Pause, Play },
  props: {
    isPlaying: Boolean,
    modelValue: Number,
    totalFrames: Number,
    currentTimeFormatted: String,
    totalTimeFormatted: String
  },
  emits: ['update:modelValue', 'toggle-play', 'scrub'],
  methods: {
    onInput(event) {
      this.$emit('update:modelValue', parseInt(event.target.value, 10));
      this.$emit('scrub');
    }
  }
}
</script>

<style scoped>
.scrubber-container {
  height: auto;
  background: transparent;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px 20px;
  gap: 15px;
}

.timeline-slider {
  flex-grow: 1;
  cursor: pointer;
  accent-color: #4BC0C0;
}

.play-btn {
  background: #4BC0C0;
  color: white;
  border: none;
  border-radius: 50%;
  width: 38px;
  height: 38px;
  font-size: 1.4em;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
  flex-shrink: 0;
}
.play-btn:hover { transform: scale(1.05); }

.time-label {
  font-size: 0.9em;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  min-width: 80px;
  text-align: right;
  flex-shrink: 0;
}
</style>
