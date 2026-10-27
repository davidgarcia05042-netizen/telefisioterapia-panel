<template>
  <div class="table" :style="{ '--table-columns': grid_columns }">
    <!-- Encabezado en una sola franja; las filas usan la misma grilla, así las columnas quedan alineadas. -->
    <div class="table__header dark-bg" role="row">
      <div
        :class="['table__header--item', { 'table__header--actions': has_actions && idx === columns_header.length - 1 }]"
        v-for="(column, idx) in columns_header"
        :key="idx"
        role="columnheader"
      >
        <span class="header--title light-text regular-font">{{ column }}</span>
      </div>
    </div>
    <!-- G8/G9: un solo estado a la vez. "No hay información" solo si la carga terminó sin datos. -->
    <div class="table__loading" v-if="loading" role="status">
      <span class="dark-text regular-font">Cargando...</span>
    </div>
    <div class="table__loading table__loading--error" v-else-if="load_error" role="alert">
      <span class="dark-text regular-font">No se pudo cargar la información.</span>
      <button type="button" class="btn btn-dark table__retry" @click="callAPI()">
        <span>Reintentar</span>
      </button>
    </div>
    <div class="table__loading" v-else-if="table_data.length === 0">
      <span class="dark-text regular-font">No hay información</span>
    </div>
    <div class="table__data" v-else>
      <div
        class="table__data__row"
        v-for="(row, idx) in table_data"
        :key="idx"
        role="row"
      >
        <div
          class="table__data__cell"
          v-for="cell in row.cells"
          :key="cell.index"
          role="cell"
        >
          <span v-if="isStatus(cell.index)" :class="['status-badge', statusClass(cell.value)]">{{ cell.value }}</span>
          <span v-else class="dark-text light-font">{{ cell.value }}</span>
        </div>
        <!-- Acciones como botones de icono con tooltip (el texto va también en aria-label). -->
        <div
          class="table__data__cell table__data__cell--action"
          v-if="has_actions"
          role="cell"
        >
          <button
            type="button"
            class="icon-btn"
            :id="'detail-' + row.id"
            aria-label="Ver detalle"
            data-tooltip="Ver detalle"
            @click="() => $emit('detail', row.id)"
            v-if="actions.includes('detail')"
          >
            <eye aria-hidden="true" />
          </button>
          <button
            type="button"
            class="icon-btn"
            :id="'update-' + row.id"
            aria-label="Editar"
            data-tooltip="Editar"
            @click="() => $emit('update', row.id)"
            v-if="actions.includes('update')"
          >
            <pencil aria-hidden="true" />
          </button>
          <button
            type="button"
            class="icon-btn icon-btn--danger"
            :id="'delete-' + row.id"
            aria-label="Eliminar"
            data-tooltip="Eliminar"
            @click="() => $emit('delete', row.id, row.full)"
            v-if="actions.includes('delete')"
          >
            <delete-outline aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
    <!-- G10: la API pagina (count/next/previous); antes solo se leía la primera página. -->
    <div class="table__pagination" v-if="!loading && !load_error && (next_page || previous_page)">
      <button type="button" class="btn btn-dark" :disabled="!previous_page" @click="goToPage(previous_page)">
        <chevron-left class="light-text" />
        <span>Anterior</span>
      </button>
      <span class="dark-text light-font">Página {{ page }}<template v-if="total_pages"> de {{ total_pages }}</template></span>
      <button type="button" class="btn btn-dark" :disabled="!next_page" @click="goToPage(next_page)">
        <span>Siguiente</span>
        <chevron-right class="light-text" />
      </button>
    </div>
  </div>
</template>

<script>
import Http from "../lib/http";
import { formatDateTime, statusClass } from "../lib/format";
import { Pencil, DeleteOutline, Eye, ChevronLeft, ChevronRight } from "mdue";
import { get } from "simple-object-query";

/**
 * Columnas: { query, verbose, format?, hidden? }.
 *   - La PRIMERA columna da el id que reciben las acciones (detail, update,
 *     delete), aunque esté oculta.
 *   - `hidden: true`: la columna no se muestra (p. ej. el ID, que no le dice
 *     nada al terapeuta).
 * `format` es opcional:
 *   - 'datetime': fecha y hora de Bogotá (lib/format.js);
 *   - 'fullName': `query` apunta a un usuario; muestra nombre y apellido
 *     (o el usuario si no tiene nombre);
 *   - 'status': insignia con color según el estado.
 */
const FORMATTERS = {
  datetime: (value) => formatDateTime(value),
  fullName: (user) => {
    if (!user) return "—";
    const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return name || user.username || "—";
  },
};

export default {
  name: "Table",
  // empty_on_404: el endpoint responde 404 cuando la lista está vacía
  // (/scheduled_training): se muestra "No hay información", no un error.
  props: ["columns", "actions", "api_endpoint", "sorting_column", "empty_on_404"],
  emits: ["detail", "update", "delete", "loaded"],

  components: {
    Pencil,
    DeleteOutline,
    Eye,
    ChevronLeft,
    ChevronRight,
  },

  methods: {
    /**
     * Carga la página actual. `silent`: sin "Cargando..." (actualización
     * automática de la rutina del paciente, que no debe parpadear).
     */
    async callAPI({ silent = false } = {}) {
      if (!silent) this.loading = true;
      const http = new Http();
      const response = await http.authGet(this.pageEndpoint(this.page));
      this.mapData(response, { silent });
      this.loading = false;
    },
    refresh() {
      return this.callAPI({ silent: true });
    },
    pageEndpoint(page) {
      if (page <= 1) return this.api_endpoint;
      const separator = this.api_endpoint.includes("?") ? "&" : "?";
      return `${this.api_endpoint}${separator}page=${page}`;
    },
    // Número de página de un enlace next/previous de DRF (sin parámetro = página 1).
    pageFromLink(link) {
      if (!link) return null;
      try {
        return Number(new URL(link).searchParams.get("page")) || 1;
      } catch (e) {
        return null;
      }
    },
    goToPage(page) {
      if (!page) return;
      this.page = page;
      this.callAPI();
    },
    mapHeader() {
      const visible = this.columns.filter((column) => !column.hidden);
      this.columns_header = visible.map((column) => column.verbose);
      if (this.has_actions) {
        this.columns_header.push("Acciones");
      }
      // Columnas de datos en partes iguales. La de acciones tiene un ancho fijo
      // (botones de 34 px y 4 px entre ellos, al menos lo que ocupa "Acciones"):
      // con max-content cada fila calculaba la suya y las columnas no coincidían.
      const actionsWidth = Math.max(this.actions.length * 34 + (this.actions.length - 1) * 4, 76);
      this.grid_columns = `repeat(${visible.length}, minmax(0, 1fr))${this.has_actions ? ` ${actionsWidth}px` : ""}`;
    },
    cellValue(row, column) {
      const value = get(row, column.query);
      const formatter = FORMATTERS[column.format];
      return formatter ? formatter(value) : value;
    },
    mapData(response, { silent = false } = {}) {
      if (response.status === 404 && this.empty_on_404) {
        response = { status: 200, data: [] };
      }
      if (response.status !== 200 || !response.data) {
        // En una recarga silenciosa se conservan los datos que ya se veían.
        if (!silent) {
          this.load_error = true;
          this.table_data = [];
        }
        return;
      }
      this.load_error = false;
      const paginated = Object.prototype.hasOwnProperty.call(response.data, "results");
      const rows = paginated ? response.data.results : response.data;
      this.next_page = paginated ? this.pageFromLink(response.data.next) : null;
      this.previous_page = paginated ? this.pageFromLink(response.data.previous) : null;
      // El tamaño de página se conoce en una página llena (una que tiene siguiente).
      if (paginated && this.next_page) this.page_size = rows.length;
      this.total_pages = paginated && this.page_size && response.data.count
        ? Math.ceil(response.data.count / this.page_size)
        : null;
      const sorted = [...rows].sort((a, b) => a[this.sorting_column] - b[this.sorting_column]);
      // full: todas las columnas (también las ocultas), para el id y la confirmación de borrado.
      this.table_data = sorted.map((row) => {
        const full = this.columns.map((column) => this.cellValue(row, column));
        return {
          id: full[0],
          full,
          cells: full
            .map((value, index) => ({ value, index }))
            .filter((cell) => !this.columns[cell.index].hidden),
        };
      });
      this.$emit("loaded", sorted);
    },
    isStatus(cellIdx) {
      return this.columns[cellIdx] && this.columns[cellIdx].format === "status";
    },
    statusClass,
  },

  beforeMount() {
    if (!this.columns || !this.api_endpoint) {
      console.error("Tabla mal configurada: faltan las columnas o el endpoint.");
      return;
    }
    this.has_actions = this.actions.length !== 0;
    this.mapHeader();
    this.callAPI();
  },

  data() {
    return {
      loading: true,
      load_error: false,
      columns_header: [],
      grid_columns: "",
      has_actions: false,
      table_data: [],
      page: 1,
      next_page: null,
      previous_page: null,
      total_pages: null,
      page_size: null,
    };
  },
};
</script>

<style>
.table {
  width: 100%;
  display: flex;
  flex-direction: column;
}
.table__header,
.table__data__row {
  display: grid;
  grid-template-columns: var(--table-columns);
  align-items: center;
  column-gap: 16px;
  padding: 0 16px;
}
.table__header {
  border-radius: 10px 10px 0 0;
  min-height: 42px;
}
.table__header--item {
  padding: 8px 0;
}
.table__header--actions {
  text-align: right;
}
.table__data__row {
  min-height: 48px;
  background: #fff;
  border-bottom: 1px solid #e3e8f0;
}
.table__data__row:nth-child(even) {
  background: #f7f9fd;
}
.table__data__row:hover {
  background: #eef3fb;
}
.table__data__cell {
  padding: 8px 0;
  min-width: 0;
  overflow-wrap: anywhere;
}
.table__data__cell--action {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}
.table__loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px;
}
.table__retry {
  height: auto;
  padding: 4px 12px;
}
.table__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 0;
}
.table__pagination .btn {
  height: auto;
  padding: 4px 12px;
}
.table__pagination .btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
