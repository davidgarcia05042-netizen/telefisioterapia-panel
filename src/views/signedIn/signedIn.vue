<template>
  <navbar @toggle-sidebar="toggle_sidebar" :key="$router" />
  <div class="content">
    <sidebar :open="open_sidebar" :key="$router" />
    <router-view />
  </div>
</template>

<script>
import Navbar from "../../components/navbar";
import Sidebar from "../../components/sidebar";

export default {
  name: "SignedIn",
  components: {
    Navbar,
    Sidebar,
  },
  methods: {
    toggle_sidebar() {
      this.open_sidebar = !this.open_sidebar;
    },
  },
  data() {
    return {
      open_sidebar: false,
    };
  },
};
</script>

<style scoped>
.content {
  margin-top: 30px;
  display: flex;
  height: 100%;
}
</style>