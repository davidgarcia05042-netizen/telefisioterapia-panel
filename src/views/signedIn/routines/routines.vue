<template>
  <ListModel
    ref="list"
    title="Rutinas"
    new_label="Nueva rutina"
    :table_info="{
      columns: [
        { query: 'id', verbose: 'ID', hidden: true },
        { query: 'name', verbose: 'Nombre' },
        { query: 'description', verbose: 'Descripción' },
      ],
      actions: ['detail', 'update', 'delete'],
      api_endpoint: '/routines/',
      sorting_column: 'id',
    }"
    @go-to-create="$router.push({ name: 'new_routine' })"
    @go-to-update="goToUpdate"
    @go-to-delete="goToDelete"
    @go-to-detail="goToDetail"
  />
</template>

<script>
import ListModel from "@/components/listModel";
import Http from "@/lib/http";
import toast from "@/lib/toast";
export default {
  name: "Routines",
  components: {
    ListModel,
  },
  methods: {
    goToUpdate(routine_id) {
      this.$router.push({
        name: 'edit_routine',
        params: {
          routine_id
        }
      })
    },
    // La confirmación la pide ListModel (T1); acá se borra y se avisa el resultado.
    async goToDelete(routine_id) {
      const response = await new Http().authDelete(`/routines/${routine_id}/`);
      const status = response.request ? response.request.status : null;
      if (status === 204 || status === 200) {
        toast.success("Rutina eliminada.");
        this.$refs.list.reload();
      } else {
        toast.error(`No se pudo eliminar la rutina${status ? ` (error ${status})` : ""}.`);
      }
    },
    goToDetail(routine_id) {
      this.$router.push({
        name: 'view_routine',
        params: {
          routine_id
        }
      })
    },
  },
};
</script>
