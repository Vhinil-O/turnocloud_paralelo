<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { TicketWithService } from '@turnocloud/shared';

const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const tickets = ref<TicketWithService[]>([]);
const loading = ref<boolean>(true);
const errorMsg = ref<string>('');
const lastUpdated = ref<string>('');

let pollingTimer: ReturnType<typeof setInterval> | null = null;

const inAttentionTickets = computed(() =>
  tickets.value
    .filter((t) => t.status === 'en_atencion')
    .sort((a, b) => {
      const timeA = a.called_at ? new Date(a.called_at).getTime() : 0;
      const timeB = b.called_at ? new Date(b.called_at).getTime() : 0;
      return timeB - timeA;
    })
);

const pendingTickets = computed(() =>
  tickets.value.filter((t) => t.status === 'pendiente')
);

const fetchTickets = async () => {
  try {
    const data = await $fetch<TicketWithService[]>(`${apiBase}/api/tickets`);
    tickets.value = data;
    errorMsg.value = '';
    lastUpdated.value = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (err) {
    console.error('Error al actualizar monitor de turnos:', err);
    errorMsg.value = 'Sin conexión con el servidor. Reintentando automáticamente...';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchTickets();
  pollingTimer = setInterval(fetchTickets, 5000);
});

onUnmounted(() => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
  }
});
</script>

<template>
  <section>
    <div class="monitor-header">
      <div>
        <h2 class="section-title">Monitor de Turnos en Tiempo Real</h2>
        <p class="section-subtitle">Actualización automática cada 5 segundos</p>
      </div>
      <div v-if="lastUpdated" class="sync-badge">
        Última actualización: {{ lastUpdated }}
      </div>
    </div>

    <div v-if="errorMsg" class="alert-warning">
      {{ errorMsg }}
    </div>

    <div v-if="loading" class="state-box">
      Cargando cola de turnos...
    </div>

    <div v-else class="monitor-grid">
      <!-- Columna izquierda: Turnos en atención -->
      <div class="panel">
        <div class="panel-header panel-active">
          <h3>En Atención ({{ inAttentionTickets.length }})</h3>
        </div>

        <div v-if="inAttentionTickets.length === 0" class="empty-state">
          Ningún turno siendo atendido en este momento.
        </div>

        <ul v-else class="ticket-list">
          <li
            v-for="ticket in inAttentionTickets"
            :key="ticket.id"
            class="ticket-item ticket-calling"
          >
            <div class="ticket-main">
              <span class="folio-large">{{ ticket.ticket_number }}</span>
              <span class="service-tag">{{ ticket.service_name }}</span>
            </div>
            <div class="window-badge">
              Ventanilla #{{ ticket.operator_id ?? '-' }}
            </div>
          </li>
        </ul>
      </div>

      <!-- Columna derecha: Próximos en espera -->
      <div class="panel">
        <div class="panel-header panel-waiting">
          <h3>Próximos en Espera ({{ pendingTickets.length }})</h3>
        </div>

        <div v-if="pendingTickets.length === 0" class="empty-state">
          No hay turnos pendientes en la fila.
        </div>

        <ul v-else class="ticket-list">
          <li
            v-for="(ticket, index) in pendingTickets"
            :key="ticket.id"
            class="ticket-item"
          >
            <div class="ticket-main">
              <span class="folio-medium">{{ ticket.ticket_number }}</span>
              <span class="service-tag">{{ ticket.service_name }}</span>
              <span class="requester-text">{{ ticket.requester_name }}</span>
            </div>
            <span class="queue-pos">#{{ index + 1 }} en fila</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
}

.section-subtitle {
  color: #64748b;
  font-size: 0.95rem;
}

.sync-badge {
  background-color: #e2e8f0;
  color: #334155;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
}

.alert-warning {
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.state-box {
  text-align: center;
  padding: 3rem;
  color: #64748b;
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.panel {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
}

.panel-header {
  padding: 1rem 1.25rem;
  color: #ffffff;
}

.panel-active {
  background-color: #16a34a;
}

.panel-waiting {
  background-color: #1e293b;
}

.empty-state {
  padding: 2.5rem 1.5rem;
  text-align: center;
  color: #64748b;
}

.ticket-list {
  list-style: none;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ticket-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background-color: #f8fafc;
}

.ticket-calling {
  border-left: 5px solid #16a34a;
  background-color: #f0fdf4;
}

.ticket-main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.folio-large {
  font-size: 1.65rem;
  font-weight: 800;
  color: #15803d;
}

.folio-medium {
  font-size: 1.3rem;
  font-weight: 700;
  color: #0f172a;
}

.service-tag {
  font-size: 0.82rem;
  font-weight: 600;
  color: #2563eb;
}

.requester-text {
  font-size: 0.9rem;
  color: #475569;
}

.window-badge {
  background-color: #16a34a;
  color: #ffffff;
  font-weight: 700;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.queue-pos {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
}
</style>