<template>
  <div class="main-container">
    <div class="header">
      <h2 class="header__title dark-text regular-font">{{ title }}</h2>
      <button class="btn btn-success" @click="() => $emit('go-to-create')" v-if="has_new_var">
        <plus class="light-text" />
        <span class="btn__label font-family light-font light-text"
          >{{ new_label || "Añadir elemento" }}</span
        >
      </button>
    </div>
    <Table
      ref="table"
      :columns="table_info.columns"
      :actions="table_info.actions"
      :api_endpoint="table_info.api_endpoint"
      :sorting_column="table_info.sorting_column"
      @update="goToUpdate"
      @delete="goToDelete"
      @detail="goToDetail"
    />
    <ConfirmDialog ref="confirm" />
  </div>
</template>

<script>
import { Plus } from "mdue";
import Table from "./table";
import ConfirmDialog from "./ConfirmDialog.vue";
export default {
  name: "ListModel",
  // new_label: texto de la acción principal ("Nueva terapia"...).
  props: ["title", "has_new", "table_info", "new_label"],

  beforeMount() {
    const errorMessages = [];
    if (typeof this.has_new === 'undefined') this.has_new_var=true;
    else this.has_new_var=this.has_new;
    if (!this.title || typeof this.title !== "string") {
      errorMessages.push(
        "You have to pass a valid title! (It most be a string)"
      );
    }
    if (!this.table_info || typeof this.table_info !== "object") {
      errorMessages.push(
        "You have to pass a valid table info object! (It most be an object)"
      );
    } else {
      if (!Object.prototype.hasOwnProperty.call(this.table_info, "columns")) {
        errorMessages.push(
          "The table_info object have to have an array of columns"
        );
      } else if (
        !this.table_info.columns
          .map(
            (column) =>
              Object.prototype.hasOwnProperty.call(column, "query") &&
              typeof column.query === "string" &&
              Object.prototype.hasOwnProperty.call(column, "verbose") &&
              typeof column.verbose === "string"
          )
          .reduce((acc, curr) => acc && curr)
      ) {
        errorMessages.push(
          "The columns object have to have the form {query: string, verbose: string}"
        );
      }

      if (!Object.prototype.hasOwnProperty.call(this.table_info, "actions")) {
        errorMessages.push(
          "The table_info object have to have an array of actions"
        );
      } else if (
        this.table_info.actions !== [] &&
        !this.table_info.actions
          .map((action) => ["detail", "update", "delete"].includes(action))
          .reduce((acc, curr) => acc && curr, true)
      ) {
        errorMessages.push(
          "The actions list have to be one of: [detail, update, delete]"
        );
      }

      if (
        !Object.prototype.hasOwnProperty.call(
          this.table_info,
          "api_endpoint"
        ) ||
        typeof this.table_info.api_endpoint !== "string"
      ) {
        errorMessages.push(
          "You have to pass a valid api endpoint! (It most be a string)"
        );
      }

      if (
        !Object.prototype.hasOwnProperty.call(
          this.table_info,
          "sorting_column"
        ) ||
        typeof this.table_info.api_endpoint !== "string"
      ) {
        errorMessages.push(
          "You have to pass a valid sorting column! (It most be a string)"
        );
      }
    }
    if (errorMessages.length !== 0) {
      throw new Error(errorMessages.join("\n"));
    }
  },

  components: {
    Table,
    Plus,
    ConfirmDialog,
  },

  methods: {
    goToUpdate(id) {
      this.$emit("go-to-update", id);
    },
    // T1 (docs/DECISIONES_TECNICAS.md): eliminar siempre confirma, en todas las listas. La vista
    // recibe "go-to-delete" solo si el usuario confirmó.
    async goToDelete(id, row) {
      const confirmed = await this.$refs.confirm.ask({
        title: "¿Eliminar este registro?",
        message: `Se eliminará ${this.rowLabel(id, row)}. Esta acción no se puede deshacer.`,
        confirmLabel: "Eliminar",
      });
      if (confirmed) this.$emit("go-to-delete", id);
    },
    // "«Nombre»" si la lista tiene columna de nombre; si no, el ID.
    rowLabel(id, row) {
      const nameIndex = this.table_info.columns.findIndex((column) => column.query === "name");
      const name = nameIndex >= 0 && row ? row[nameIndex] : null;
      return name ? `«${name}»` : `el registro #${id}`;
    },
    goToDetail(id) {
      this.$emit("go-to-detail", id);
    },
    // Recarga la tabla sin recargar la página (así no se pierde el aviso).
    reload() {
      return this.$refs.table.callAPI();
    },
  },

  data() {
    return {
      has_new_var: true,
    }
  }
};
</script>

<style scoped>
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
</style>
