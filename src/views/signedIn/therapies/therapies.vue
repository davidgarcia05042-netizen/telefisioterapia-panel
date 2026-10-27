<template>
  <ListModel
    ref="list"
    title="Terapias"
    new_label="Nueva terapia"
    :table_info="{
      columns: [
        { query: 'id', verbose: 'ID', hidden: true },
        { query: 'name', verbose: 'Nombre' },
        { query: 'description', verbose: 'Descripción' }
      ],
      actions: ['detail', 'update', 'delete'],
      api_endpoint: '/therapies/',
      sorting_column: 'id'
    }"
    @go-to-create="$router.push({ name: 'new_therapy' })"
    @go-to-update="goToUpdate"
    @go-to-delete="goToDelete"
    @go-to-detail="goToDetail"
  />
</template>

<script>
import ListModel from '../../../components/listModel';
import Http from '@/lib/http';
import toast from '@/lib/toast';
export default {
  name: 'Therapies',
  components: {
    ListModel
  },
  methods: {
    // La confirmación la pide ListModel (T1); acá se borra y se avisa el resultado.
    async goToDelete(therapy_id) {
      const response = await new Http().authDelete(`/therapies/${therapy_id}/`);
      const status = response.request ? response.request.status : null;
      if (status === 204 || status === 200) {
        toast.success('Terapia eliminada.');
        this.$refs.list.reload();
      } else {
        toast.error(`No se pudo eliminar la terapia${status ? ` (error ${status})` : ''}.`);
      }
    },
    goToUpdate(therapy_id) {
      this.$router.push({ name: 'edit_therapy', params: { therapy_id } });
    },
    goToDetail(therapy_id) {
      this.$router.push({ name: 'view_therapy', params: { therapy_id } });
    }
  }
};
</script>
