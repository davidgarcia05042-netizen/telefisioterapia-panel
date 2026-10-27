<template>
  <!--
    Contraseña temporal de una cuenta recién creada (F3 y M1,
    docs/DECISIONES_TECNICAS.md). El backend la devuelve una sola vez: se muestra aquí y se
    borra al cerrar. Se usa con una referencia y una promesa:
      const closedByUser = await this.$refs.password.show({ username, password, role });
    La contraseña vive solo en el estado de este diálogo, nunca en el
    formulario, el almacenamiento del navegador ni el historial.
  -->
  <teleport to="body">
    <div v-if="open" class="temp-password-overlay">
      <div class="temp-password-dialog" role="alertdialog" aria-modal="true"
           :aria-labelledby="titleId" :aria-describedby="warningId">
        <h3 :id="titleId" class="regular-font dark-text">{{ role }} creado</h3>
        <p class="light-font dark-text">
          Usuario: <strong>{{ username }}</strong>
        </p>
        <label :for="inputId" class="light-font dark-text">Contraseña temporal</label>
        <div class="temp-password-row">
          <input :id="inputId" ref="input" class="temp-password-value" type="text" readonly :value="password"
                 @focus="$event.target.select()" />
          <button type="button" class="btn btn-dark temp-password-copy" @click="copy">
            <ContentCopy aria-hidden="true" />
            <span>{{ copied ? 'Copiada' : 'Copiar' }}</span>
          </button>
        </div>
        <p :id="warningId" class="temp-password-warning light-font">
          Cópiela ahora, no se volverá a mostrar. Entréguela al usuario por un medio seguro.
        </p>
        <p v-if="copyError" class="temp-password-error light-font">
          No se pudo copiar automáticamente: selecciónela y cópiela a mano.
        </p>
        <div class="temp-password-actions">
          <button ref="done" type="button" class="btn btn-success" @click="close(true)">
            <span>Ya la copié</span>
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import { ContentCopy } from 'mdue';

let nextId = 0;

export default {
  name: 'TemporaryPasswordDialog',
  components: { ContentCopy },
  data() {
    nextId += 1;
    return {
      open: false,
      username: '',
      password: '',
      role: '',
      copied: false,
      copyError: false,
      titleId: `temp-password-title-${nextId}`,
      warningId: `temp-password-warning-${nextId}`,
      inputId: `temp-password-input-${nextId}`,
    };
  },
  beforeUnmount() {
    // Si se navega con el diálogo abierto, la contraseña no queda en memoria
    // (y quien lo abrió sabe que no lo cerró el usuario: no debe navegar).
    this.close(false);
  },
  methods: {
    show({ username, password, role }) {
      this.username = username;
      this.password = password;
      this.role = role;
      this.copied = false;
      this.copyError = false;
      this.open = true;
      this.$nextTick(() => this.$refs.input && this.$refs.input.focus());
      return new Promise((resolve) => { this._resolve = resolve; });
    },
    async copy() {
      this.copyError = false;
      try {
        await navigator.clipboard.writeText(this.password);
        this.copied = true;
      } catch (e) {
        // Sin portapapeles (contexto no seguro o permiso negado): queda seleccionada.
        this.$refs.input.select();
        this.copyError = true;
      }
    },
    // Resuelve la promesa de show(): true si lo cerró el usuario.
    close(byUser) {
      this.open = false;
      this.password = '';
      this.username = '';
      const resolve = this._resolve;
      this._resolve = null;
      if (resolve) resolve(byUser);
    },
  },
};
</script>

<style lang="scss">
.temp-password-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.6);
}
.temp-password-dialog {
  width: min(480px, 100%);
  padding: 24px;
  border-radius: 12px;
  background: $white;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  h3 { margin-top: 0; }
  label { display: block; margin-bottom: 6px; }
}
.temp-password-row {
  display: flex;
  gap: 8px;
}
.temp-password-value {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 1.1em;
  letter-spacing: 0.05em;
}
.temp-password-copy {
  display: flex;
  align-items: center;
  gap: 6px;
  height: auto;
  padding: 6px 12px;
}
.temp-password-warning {
  margin: 12px 0 0;
  padding: 8px 12px;
  border: 1px solid #e0a030;
  border-radius: 8px;
  background: #fff4e0;
  color: #7a5410;
}
.temp-password-error {
  margin: 8px 0 0;
  color: $danger;
}
.temp-password-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  .btn { height: auto; padding: 6px 16px; }
}
</style>
