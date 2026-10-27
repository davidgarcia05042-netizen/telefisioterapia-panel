<template>
  <ListModel
    title="Pacientes"
    new_label="Nuevo paciente"
    :table_info="{
      columns: [
        { query: 'id', verbose: 'ID', hidden: true },
        { query: 'user.username', verbose: 'Nombre de usuario' },
        { query: 'user.first_name', verbose: 'Nombre' },
        { query: 'user.email', verbose: 'Correo electrónico' },
      ],
      api_endpoint: '/patients',
      actions: [],
      sorting_column: 'id'
    }"
    @go-to-create="$router.push({ name: 'new-patient' })"
    @go-to-update="goToUpdate"
    @go-to-delete="goToDelete"
    @go-to-detail="goToDetail"
    v-if="therapist_id"
  />
</template>

<script>
import ListModel from '@/components/listModel';
import Http from '@/lib/http';
export default {
  name: 'Patients',
  components: {
    ListModel
  },
  beforeMount() {
    const user = JSON.parse(localStorage.getItem('user'));
    this.therapist_id = user.id;
  },
  methods: {
    goToDelete(therapy_id) {
      // const http = new Http();
      // http.authDelete(`/therapies/${therapy_id}/`)
      //   .then(response => this.$router.go())
      //   .catch(response => console.error(response))
    },
    goToUpdate(therapy_id) {
      this.$router.push({ name: 'edit_therapy', params: { therapy_id } });
    },
    goToDetail(patient_id) {
      this.$router.push({ name: 'view_patient', params: { patient_id } });
    }
  },
  data() {
    return {
      therapist_id: null
    }
  }
};
</script>
