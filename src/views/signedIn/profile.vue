<template>
  <div class="main-container">
    <div class="header">
      <h2 class="header__title dark-text regular-font">Perfil</h2>
    </div>
    <div class="body">
      <p class="dark-text regular-font"><span class="bold-font">Nombre:</span> {{ `${user.first_name} ${user.last_name}` }}</p>
      <p class="dark-text regular-font"><span class="bold-font">Correo electrónico:</span> {{ user.email}}</p>
      <p class="dark-text regular-font"><span class="bold-font">Nombre de usuario:</span> {{ user.username}}</p>
    </div>
    <div class="actions">
      <button class="btn btn-lg btn-dark" v-on:click="() => $router.push({name: 'ChangePassword'})" >
        <KeyChange />
        <span>Cambiar contraseña</span>
      </button>
    </div>
  </div>
</template>

<script>
import Storage from "@/lib/storage";
import { KeyChange } from "mdue";
export default {
  name: 'Profile',
  beforeMount() {
    this.user = JSON.parse(localStorage.getItem('user'))
  },
  components: {
    KeyChange
  },
  data() {
    return {
      user: {}
    }
  }
}
</script>

<style lang="scss">
.main-container {
  height: calc(100vh - 50px);
  width: 100%;
  overflow-y: scroll;
  padding: 10px;
}
.header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header__title {
  margin: 0;
}
.actions {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>