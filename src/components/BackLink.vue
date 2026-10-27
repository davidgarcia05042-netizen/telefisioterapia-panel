<template>
  <!--
    "Volver" de las vistas de detalle (G12, docs/DECISIONES_TECNICAS.md). Lleva a la vista padre
    y no al historial: así funciona igual si se entró por un enlace directo.
    Es un enlace: se puede usar con teclado y abrir en otra pestaña.
  -->
  <router-link :to="to" class="back-link light-font">
    <ArrowLeft class="back-link__icon" aria-hidden="true" />
    <span>{{ label }}</span>
  </router-link>
</template>

<script>
import { ArrowLeft } from 'mdue';

export default {
  name: 'BackLink',
  components: { ArrowLeft },
  props: {
    to: { type: [String, Object], required: true },
    label: { type: String, default: 'Volver' },
  },
};
</script>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0 8px;
  color: #2f2f2f;
  text-decoration: none;
  font-size: 0.95em;
}
.back-link:hover {
  text-decoration: underline;
}
.back-link__icon {
  font-size: 1.2em;
}
</style>
