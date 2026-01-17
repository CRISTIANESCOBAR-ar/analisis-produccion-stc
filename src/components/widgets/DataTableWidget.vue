<template>
  <div class="data-table-widget">
    <div class="widget-header">
      <h3 class="widget-title">{{ title }}</h3>
      <div class="widget-actions">
        <button v-if="sortable" @click="cycleSortDirection" class="btn-icon" title="Ordenar">
          📊
        </button>
      </div>
    </div>

    <div class="widget-content">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else-if="displayData.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th 
                v-for="(column, idx) in columns" 
                :key="idx"
                @click="sortable && sortBy(column.key)"
                :class="{ sortable: sortable }"
              >
                {{ column.label }}
                <span v-if="sortable && sortColumn === column.key" class="sort-icon">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(row, idx) in displayData" 
              :key="idx"
            >
              <td 
                v-for="(column, cidx) in columns" 
                :key="cidx"
                :class="column.align || 'left'"
              >
                <span v-if="column.type === 'badge'" class="badge" :class="`badge-${row[column.key]}`">
                  {{ row[column.key] }}
                </span>
                <span v-else-if="column.type === 'percentage'" class="percentage">
                  {{ formatPercentage(row[column.key]) }}%
                </span>
                <span v-else-if="column.type === 'number'" class="number">
                  {{ formatNumber(row[column.key]) }}
                </span>
                <span v-else>{{ row[column.key] }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <p>📋 Sin datos disponibles</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  columns: {
    type: Array,
    required: true
    // Esperado: [{ key: 'name', label: 'Nombre', type: 'text' }, ...]
  },
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  sortable: {
    type: Boolean,
    default: true
  },
  maxRows: {
    type: Number,
    default: 10
  }
})

const sortColumn = ref(null)
const sortDirection = ref('desc')

const sortBy = (key) => {
  if (sortColumn.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = key
    sortDirection.value = 'desc'
  }
}

const cycleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

const displayData = computed(() => {
  let data = [...props.data]

  // Ordenar si aplica
  if (sortColumn.value) {
    data.sort((a, b) => {
      const aVal = a[sortColumn.value]
      const bVal = b[sortColumn.value]

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      
      if (sortDirection.value === 'asc') {
        return aStr.localeCompare(bStr)
      } else {
        return bStr.localeCompare(aStr)
      }
    })
  }

  // Limitar filas
  return data.slice(0, props.maxRows)
})

const formatNumber = (value) => {
  if (typeof value !== 'number') return value
  if (value > 999) return (value / 1000).toFixed(1) + 'k'
  return value.toFixed(2)
}

const formatPercentage = (value) => {
  if (typeof value === 'string') return value
  return parseFloat(value).toFixed(1)
}
</script>

<style scoped>
.data-table-widget {
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.data-table-widget:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.widget-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.widget-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.widget-content {
  padding: 16px;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table thead {
  background: #f3f4f6;
  border-bottom: 2px solid #d1d5db;
}

.data-table th {
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  color: #1f2937;
  user-select: none;
}

.data-table th.sortable {
  cursor: pointer;
  transition: background 0.2s;
}

.data-table th.sortable:hover {
  background: #e5e7eb;
}

.sort-icon {
  margin-left: 4px;
  font-size: 11px;
  color: #3b82f6;
}

.data-table tbody tr {
  border-bottom: 1px solid #e5e7eb;
  transition: background 0.2s;
}

.data-table tbody tr:hover {
  background: #f9fafb;
}

.data-table td {
  padding: 12px 8px;
  color: #374151;
}

.data-table td.center {
  text-align: center;
}

.data-table td.right {
  text-align: right;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-normal {
  background: #dbeafe;
  color: #1e40af;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-danger {
  background: #fee2e2;
  color: #991b1b;
}

.badge-success {
  background: #dcfce7;
  color: #166534;
}

.percentage {
  font-weight: 600;
  color: #10b981;
}

.number {
  font-family: 'Monaco', 'Menlo', monospace;
  font-weight: 500;
  color: #1f2937;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
  font-size: 14px;
}
</style>
