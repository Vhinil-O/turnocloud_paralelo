import { pool } from '../config/db';
import { CreateTicketDTO, Ticket, TicketWithService } from '@turnocloud/shared';

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
}