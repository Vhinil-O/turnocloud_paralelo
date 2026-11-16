export type TicketStatus = 'pendiente' | 'en_atencion' | 'atendido' | 'cancelado';

export interface Service {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

export interface CreateServiceDTO {
  code: string;
  name: string;
  description?: string;
}

export interface Operator {
  id: number;
  name: string;
  window_number: string;
  active: boolean;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_number: string;
  service_id: number;
  operator_id: number | null;
  requester_name: string;
  status: TicketStatus;
  created_at: string;
  called_at: string | null;
  finished_at: string | null;
}

export interface TicketLog {
  id: number;
  ticket_id: number;
  previous_status: TicketStatus | null;
  new_status: TicketStatus;
  operator_id: number | null;
  notes: string | null;
  created_at: string;
}