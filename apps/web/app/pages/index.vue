<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Service, TicketWithService } from '@turnocloud/shared';

const STORAGE_KEY = 'turnocloud_active_ticket_id';

const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const services = ref<Service[]>([]);
const loadingServices = ref<boolean>(true);
const loadError = ref<string>('');

const selectedServiceId = ref<number | null>(null);
const requesterName = ref<string>('');
const submitting = ref<boolean>(false);
const submitError = ref<string>('');

const activeTicket = ref<TicketWithService | null>(null);
const allTickets = ref<TicketWithService[]>([]);
let pollingTimer: ReturnType<typeof setInterval> | null = null;

// Calcula cuántos turnos pendientes fueron creados antes que el turno del usuario
const peopleAhead = computed(() => {
  if (!activeTicket.value || activeTicket.value.status !== 'pendiente') {
    return 0;
  }
  return allTickets.value.filter(
    (t) => t.status === 'pendiente' && t.id < activeTicket.value!.id
  ).length;
});

const isTicketClosed = computed(() => {
  if (!activeTicket.value) return false;
  return activeTicket.value.status === 'atendido' || activeTicket.value.status === 'cancelado';
});

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
};

const syncActiveTicket = async (ticketId: number) => {
  try {
    const tickets = await $fetch<TicketWithService[]>(`${apiBase}/api/tickets`);
    allTickets.value = tickets;

    const found = tickets.find((t) => t.id === ticketId);
    if (!found) {
      // Si el turno ya no existe en BD, limpiar bloqueo
      localStorage.removeItem(STORAGE_KEY);
      activeTicket.value = null;
      stopPolling();
      return;
    }

    activeTicket.value = found;

    // Si ya terminó su ciclo, liberar el almacenamiento para permitir nuevos turnos después
    if (found.status === 'atendido' || found.status === 'cancelado') {
      localStorage.removeItem(STORAGE_KEY);
      stopPolling();
    }
  } catch (err) {
    console.error('Error al sincronizar estado del turno:', err);
  }
};

const startTracking = (ticketId: number) => {
  localStorage.setItem(STORAGE_KEY, String(ticketId));
  stopPolling();
  syncActiveTicket(ticketId);
  pollingTimer = setInterval(() => syncActiveTicket(ticketId), 5000);
};

const fetchServices = async () => {
  loadingServices.value = true;
  loadError.value = '';
  try {
    const data = await $fetch<Service[]>(`${apiBase}/api/services`);
    services.value = data.filter((s) => s.active);
    const firstService = services.value[0];
    if (firstService && selectedServiceId.value === null) {
      selectedServiceId.value = firstService.id;
    }
  } catch (err) {
    console.error('Error al cargar servicios:', err);
    loadError.value = 'No se pudieron cargar los trámites disponibles. Verifica que la API esté activa.';
  } finally {
    loadingServices.value = false;
  }
};

const handleCreateTicket = async () => {
  submitError.value = '';

  if (activeTicket.value && !isTicketClosed.value) {
    submitError.value = 'Ya tienes un turno activo en espera o en atención.';
    return;
  }

  if (selectedServiceId.value === null) {
    submitError.value = 'Por favor selecciona un tipo de trámite.';
    return;
  }

  if (!requesterName.value.trim()) {
    submitError.value = 'Por favor ingresa tu nombre completo.';
    return;
  }

  submitting.value = true;
  try {
    const ticket = await $fetch<TicketWithService>(`${apiBase}/api/tickets`, {
      method: 'POST',
      body: {
        service_id: selectedServiceId.value,
        requester_name: requesterName.value.trim()
      }
    });

    activeTicket.value = ticket;
    requesterName.value = '';
    startTracking(ticket.id);
  } catch (err: any) {
    console.error('Error al generar turno:', err);
    submitError.value = err?.data?.error || 'Ocurrió un error al generar tu turno. Intenta nuevamente.';
  } finally {
    submitting.value = false;
  }
};

const resetForNewTicket = () => {
  localStorage.removeItem(STORAGE_KEY);
  activeTicket.value = null;
  submitError.value = '';
  stopPolling();
};

onMounted(() => {
  fetchServices();
  const savedTicketId = localStorage.getItem(STORAGE_KEY);
  if (savedTicketId && !isNaN(Number(savedTicketId))) {
    startTracking(Number(savedTicketId));
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <section class="kiosk-wrapper">
    <!-- Vista de seguimiento en tiempo real cuando el usuario tiene un turno -->
    <div v-if="activeTicket" class="card ticket-tracker">
      <!-- Estado 1: Pendiente en fila -->
      <div v-if="activeTicket.status === 'pendiente'" class="status-banner status-waiting">
        En Espera · Actualizando automáticamente
      </div>

      <!-- Estado 2: Llamado a ventanilla -->
      <div v-else-if="activeTicket.status === 'en_atencion'" class="status-banner status-calling">
        ¡Es tu turno! Pasa a Ventanilla #{{ activeTicket.operator_id ?? '-' }}
      </div>

      <!-- Estado 3: Atendido -->
      <div v-else-if="activeTicket.status === 'atendido'" class="status-banner status-done">
        Turno Atendido · Gracias por tu visita
      </div>

      <!-- Estado 4: Cancelado -->
      <div v-else class="status-banner status-cancelled">
        Turno Cancelado
      </div>

      <p class="receipt-label">Tu número de turno:</p>
      <div
        class="ticket-folio"
        :class="{ 'folio-calling': activeTicket.status === 'en_atencion' }"
      >
        {{ activeTicket.ticket_number }}
      </div>

      <!-- Indicador de posición en fila mientras espera -->
      <div v-if="activeTicket.status === 'pendiente'" class="queue-box">
        <span class="queue-number">{{ peopleAhead }}</span>
        <span class="queue-text">
          {{ peopleAhead === 1 ? 'persona delante de ti' : 'personas delante de ti' }}
        </span>
      </div>

      <div class="receipt-details">
        <p><strong>Trámite:</strong> {{ activeTicket.service_name }} ({{ activeTicket.service_code }})</p>
        <p><strong>Solicitante:</strong> {{ activeTicket.requester_name }}</p>
        <p v-if="activeTicket.operator_id">
          <strong>Ventanilla asignada:</strong> #{{ activeTicket.operator_id }}
        </p>
      </div>

      <!-- Solo permite solicitar otro turno cuando el actual ya terminó -->
      <div v-if="isTicketClosed" class="receipt-actions">
        <button type="button" class="btn-primary" @click="resetForNewTicket">
          Solicitar Nuevo Turno
        </button>
      </div>

      <p v-else class="lock-notice">
        Mantén esta pantalla abierta. Podrás solicitar un nuevo turno una vez que finalice tu atención actual.
      </p>
    </div>

    <!-- Vista de formulario cuando no hay turno activo -->
    <div v-else class="card">
      <h2 class="section-title">Solicitar Nuevo Turno</h2>
      <p class="section-subtitle">Selecciona el trámite que deseas realizar e ingresa tu nombre.</p>

      <div v-if="loadingServices" class="state-box">
        Cargando trámites disponibles...
      </div>

      <div v-else-if="loadError" class="alert-error">
        <p>{{ loadError }}</p>
        <button type="button" class="btn-secondary mt-sm" @click="fetchServices">Reintentar</button>
      </div>

      <form v-else @submit.prevent="handleCreateTicket" class="ticket-form">
        <div class="form-group">
          <label class="form-label">1. Selecciona el servicio:</label>
          <div class="services-grid">
            <button
              v-for="service in services"
              :key="service.id"
              type="button"
              class="service-card"
              :class="{ selected: selectedServiceId === service.id }"
              @click="selectedServiceId = service.id"
            >
              <span class="service-code">{{ service.code }}</span>
              <strong class="service-name">{{ service.name }}</strong>
              <span v-if="service.description" class="service-desc">{{ service.description }}</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="requesterName" class="form-label">2. Nombre del solicitante:</label>
          <input
            id="requesterName"
            v-model="requesterName"
            type="text"
            class="form-input"
            placeholder="Ej. Diego Sanchez"
            maxlength="100"
            required
          />
        </div>

        <div v-if="submitError" class="alert-error">
          {{ submitError }}
        </div>

        <button type="submit" class="btn-primary btn-full" :disabled="submitting">
          {{ submitting ? 'Generando turno...' : 'Obtener Turno' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.kiosk-wrapper {
  max-width: 720px;
  margin: 0 auto;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.section-subtitle {
  color: #64748b;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.6rem;
  color: #1e293b;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.9rem;
}

.service-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s;
}

.service-card:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.service-card.selected {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.service-code {
  background: #1e293b;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.service-card.selected .service-code {
  background: #2563eb;
}

.service-name {
  font-size: 1rem;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.service-desc {
  font-size: 0.82rem;
  color: #64748b;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.btn-primary {
  display: inline-block;
  background-color: #2563eb;
  color: #ffffff;
  font-weight: 600;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #e2e8f0;
  color: #1e293b;
  font-weight: 600;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}

.btn-full {
  width: 100%;
}

.alert-error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.state-box {
  text-align: center;
  padding: 2rem;
  color: #64748b;
}

.ticket-tracker {
  text-align: center;
}

.status-banner {
  display: inline-block;
  font-weight: 700;
  font-size: 0.95rem;
  padding: 0.45rem 1.1rem;
  border-radius: 999px;
  margin-bottom: 1.25rem;
}

.status-waiting {
  background-color: #dbeafe;
  color: #1e40af;
}

.status-calling {
  background-color: #16a34a;
  color: #ffffff;
  font-size: 1.1rem;
  padding: 0.6rem 1.35rem;
}

.status-done {
  background-color: #dcfce7;
  color: #166534;
}

.status-cancelled {
  background-color: #fee2e2;
  color: #991b1b;
}

.receipt-label {
  color: #64748b;
  font-size: 1rem;
}

.ticket-folio {
  font-size: 3.5rem;
  font-weight: 800;
  color: #2563eb;
  letter-spacing: 0.04em;
  margin: 0.35rem 0 1.25rem;
}

.folio-calling {
  color: #16a34a;
}

.queue-box {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  margin-bottom: 1.5rem;
}

.queue-number {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
}

.queue-text {
  color: #475569;
  font-weight: 600;
}

.receipt-details {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  text-align: left;
  margin-bottom: 1.25rem;
}

.receipt-details p + p {
  margin-top: 0.4rem;
}

.lock-notice {
  font-size: 0.85rem;
  color: #64748b;
}

.receipt-actions {
  margin-top: 1rem;
}

.mt-sm {
  margin-top: 0.5rem;
}
</style>