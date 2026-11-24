import { pool } from '../config/db';
import {
  CreateTicketDTO,
  CallNextTicketDTO,
  UpdateTicketStatusDTO,
  Ticket,
  TicketWithService
} from '@turnocloud/shared';

export class TicketsService {
  async create(data: CreateTicketDTO): Promise<TicketWithService> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const serviceRes = await client.query(
        'SELECT id, code, name FROM services WHERE id = $1 AND active = true FOR UPDATE',
        [data.service_id]
      );

      if (serviceRes.rowCount === 0) {
        throw new Error('SERVICE_NOT_FOUND');
      }

      const service = serviceRes.rows[0];

      const countRes = await client.query(
        'SELECT COUNT(*)::int AS total FROM tickets WHERE service_id = $1',
        [data.service_id]
      );

      const nextNumber = countRes.rows[0].total + 1;
      const ticketNumber = `${service.code}-${String(nextNumber).padStart(3, '0')}`;

      const insertRes = await client.query(
        `INSERT INTO tickets (ticket_number, service_id, requester_name, status)
         VALUES ($1, $2, $3, 'pendiente')
         RETURNING *`,
        [ticketNumber, data.service_id, data.requester_name.trim()]
      );

      const ticket: Ticket = insertRes.rows[0];

      await client.query(
        `INSERT INTO ticket_logs (ticket_id, previous_status, new_status, notes)
         VALUES ($1, NULL, 'pendiente', 'Turno generado en sistema')`,
        [ticket.id]
      );

      await client.query('COMMIT');

      return {
        ...ticket,
        service_code: service.code,
        service_name: service.name
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getQueue(status?: string, serviceId?: number): Promise<TicketWithService[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }

    if (serviceId) {
      params.push(serviceId);
      conditions.push(`t.service_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT t.*, s.code AS service_code, s.name AS service_name
       FROM tickets t
       INNER JOIN services s ON s.id = t.service_id
       ${whereClause}
       ORDER BY t.created_at ASC`,
      params
    );

    return result.rows;
  }

  async callNext(data: CallNextTicketDTO): Promise<TicketWithService | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const operatorRes = await client.query(
        'SELECT id FROM operators WHERE id = $1',
        [data.operator_id]
      );

      if (operatorRes.rowCount === 0) {
        throw new Error('OPERATOR_NOT_FOUND');
      }

      const params: any[] = [];
      let serviceFilter = '';

      if (data.service_id) {
        params.push(data.service_id);
        serviceFilter = `AND t.service_id = $${params.length}`;
      }

      const nextRes = await client.query(
        `SELECT t.id
         FROM tickets t
         WHERE t.status = 'pendiente' ${serviceFilter}
         ORDER BY t.created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        params
      );

      if (nextRes.rowCount === 0) {
        await client.query('COMMIT');
        return null;
      }

      const ticketId: number = nextRes.rows[0].id;

      const updateRes = await client.query(
        `UPDATE tickets
         SET status = 'en_atencion',
             operator_id = $1,
             called_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [data.operator_id, ticketId]
      );

      const updatedTicket: Ticket = updateRes.rows[0];

      await client.query(
        `INSERT INTO ticket_logs (ticket_id, previous_status, new_status, operator_id, notes)
         VALUES ($1, 'pendiente', 'en_atencion', $2, 'Turno llamado a ventanilla')`,
        [updatedTicket.id, data.operator_id]
      );

      const serviceRes = await client.query(
        'SELECT code, name FROM services WHERE id = $1',
        [updatedTicket.service_id]
      );

      await client.query('COMMIT');

      return {
        ...updatedTicket,
        service_code: serviceRes.rows[0].code,
        service_name: serviceRes.rows[0].name
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStatus(ticketId: number, data: UpdateTicketStatusDTO): Promise<TicketWithService> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const currentRes = await client.query(
        'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
        [ticketId]
      );

      if (currentRes.rowCount === 0) {
        throw new Error('TICKET_NOT_FOUND');
      }

      const currentTicket: Ticket = currentRes.rows[0];

      if (currentTicket.status === 'atendido' || currentTicket.status === 'cancelado') {
        throw new Error('TICKET_ALREADY_CLOSED');
      }

      const finalOperatorId = data.operator_id ?? currentTicket.operator_id ?? null;

      const updateRes = await client.query(
        `UPDATE tickets
         SET status = $1,
             operator_id = $2,
             finished_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [data.status, finalOperatorId, ticketId]
      );

      const updatedTicket: Ticket = updateRes.rows[0];

      const defaultNote =
        data.status === 'atendido'
          ? 'Atención finalizada por operador'
          : 'Turno cancelado';

      await client.query(
        `INSERT INTO ticket_logs (ticket_id, previous_status, new_status, operator_id, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          updatedTicket.id,
          currentTicket.status,
          data.status,
          finalOperatorId,
          data.notes?.trim() || defaultNote
        ]
      );

      const serviceRes = await client.query(
        'SELECT code, name FROM services WHERE id = $1',
        [updatedTicket.service_id]
      );

      await client.query('COMMIT');

      return {
        ...updatedTicket,
        service_code: serviceRes.rows[0].code,
        service_name: serviceRes.rows[0].name
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}