<template>
  <router-view/>
  <ToastHost />
</template>

<script>
import './styles/styles.scss';
import ToastHost from '@/components/ToastHost.vue';

export default {name: 'App', components: { ToastHost }};
</script>
