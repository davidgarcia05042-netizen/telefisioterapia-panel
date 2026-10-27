  <template>
  <ListModel
    ref="list"
    title="Ejercicios"
    new_label="Nuevo ejercicio"
    :table_info="{
      columns: [
        { query: 'id', verbose: 'ID', hidden: true },
        { query: 'name', verbose: 'Nombre' },
        { query: 'description', verbose: 'Descripción' },
        { query: 'status', verbose: 'Estado', format: 'status' },
      ],
      actions: ['detail', 'update', 'delete'],
      api_endpoint: '/exercises/',
      sorting_column: 'id',
    }"
    @go-to-create="$router.push({ name: 'new_exercise' })"
    @go-to-update="goToUpdate"
    @go-to-delete="goToDelete"
    @go-to-detail="goToDetail"
  />
</template>

<script>
import ListModel from "../../../components/listModel";
import Http from "@/lib/http";
import toast from "@/lib/toast";

export default {
  name: "Exercises",
  components: {
    ListModel,
  },
  methods: {
    goToUpdate(exercise_id) {
      this.$router.push({
        name: "edit_exercise",
        params: { exercise_id },
      });
    },
    // La confirmación la pide ListModel (ConfirmDialog) antes de emitir.
    async goToDelete(id) {
      try {
        const http = new Http();
        const response = await http.authDelete(`/exercises/${id}/`);
        const status = response.request?.status ?? response.status;
        if (status === 204 || status === 200) {
          toast.success('Ejercicio eliminado.');
          this.$refs.list.reload();
        } else {
          toast.error(`No se pudo eliminar el ejercicio${status ? ` (error ${status})` : ''}.`);
        }
      } catch (error) {
        console.error('Error al eliminar ejercicio:', error);
        toast.error('Error inesperado al eliminar el ejercicio.');
      }
    },
    goToDetail(exercise_id) {
      this.$router.push({
        name: "view_exercise",
        params: { exercise_id },
      });
    },
  },
};
</script>

