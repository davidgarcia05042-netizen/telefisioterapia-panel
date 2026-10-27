<template>
  <!-- Avisos de lib/toast.js. aria-live: los lectores de pantalla los anuncian. -->
  <div class="toast-host" aria-live="polite">
    <div
      v-for="item in state.items"
      :key="item.id"
      :class="['toast', `toast--${item.kind}`]"
      :role="item.kind === 'error' ? 'alert' : 'status'"
    >
      <span class="toast__message light-font">{{ item.message }}</span>
      <button type="button" class="toast__close" aria-label="Cerrar aviso" @click="dismiss(item.id)">
        <Close />
      </button>
    </div>
  </div>
</template>

<script>
import { Close } from 'mdue';
import { dismiss, toastState } from '@/lib/toast';

export default {
  name: 'ToastHost',
  components: { Close },
  data() {
    return { state: toastState };
  },
  methods: { dismiss },
};
</script>

<style scoped>
.toast-host {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(420px, calc(100vw - 32px));
}
.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
  color: #fff;
}
.toast--success { background: #1f7a4d; }
.toast--error { background: #b42318; }
.toast__message {
  flex: 1;
  line-height: 1.35;
}
.toast__close {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1.1em;
  line-height: 1;
  padding: 0;
}
</style>
