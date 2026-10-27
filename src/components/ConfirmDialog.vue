<template>
  <!--
    Diálogo de confirmación propio (T1, docs/DECISIONES_TECNICAS.md): reemplaza los confirm()
    nativos. Se usa con una referencia y una promesa:
      const ok = await this.$refs.confirm.ask({ title, message, confirmLabel });
    Va a <body> para que ningún contenedor con overflow lo recorte.
  -->
  <teleport to="body">
    <div v-if="open" class="confirm-overlay" @click.self="answer(false)" @keydown.esc="answer(false)">
      <div
        class="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
      >
        <h3 :id="titleId" class="confirm-title regular-font dark-text">{{ title }}</h3>
        <p :id="messageId" class="confirm-message light-font dark-text">{{ message }}</p>
        <div class="confirm-actions">
          <!-- El foco arranca en Cancelar: un Enter por reflejo no borra nada. -->
          <button ref="cancel" type="button" class="btn btn-light confirm-btn" @click="answer(false)">
            <span>Cancelar</span>
          </button>
          <button type="button" :class="['btn', 'confirm-btn', danger ? 'btn-danger' : 'btn-dark']" @click="answer(true)">
            <span>{{ confirmLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
let nextId = 0;

export default {
  name: 'ConfirmDialog',
  data() {
    nextId += 1;
    return {
      open: false,
      title: '',
      message: '',
      confirmLabel: 'Confirmar',
      danger: true,
      titleId: `confirm-title-${nextId}`,
      messageId: `confirm-message-${nextId}`,
    };
  },
  beforeUnmount() {
    // Si la vista se va con el diálogo abierto, la promesa no queda colgada.
    this.answer(false);
  },
  methods: {
    /** Abre el diálogo y resuelve true (confirmó) o false (canceló). */
    ask({ title = '¿Confirmar?', message = '', confirmLabel = 'Confirmar', danger = true } = {}) {
      this.answer(false); // una pregunta a la vez
      Object.assign(this, { title, message, confirmLabel, danger, open: true });
      this.$nextTick(() => this.$refs.cancel && this.$refs.cancel.focus());
      return new Promise((resolve) => { this._resolve = resolve; });
    },
    answer(value) {
      const resolve = this._resolve;
      this._resolve = null;
      this.open = false;
      if (resolve) resolve(value);
    },
  },
};
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.45);
}
.confirm-dialog {
  width: 100%;
  max-width: 440px;
  padding: 20px 24px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}
.confirm-title {
  margin: 0 0 8px;
}
.confirm-message {
  margin: 0 0 20px;
  line-height: 1.4;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.confirm-btn {
  height: auto;
  margin-right: 0;
  padding: 8px 16px;
  border-radius: 6px;
}
.confirm-btn span {
  margin-left: 0;
}
</style>
