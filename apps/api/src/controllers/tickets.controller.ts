import { Request, Response } from 'express';
import { TicketsService } from '../services/tickets.service';

const ticketsService = new TicketsService();

export const createTicket = async (req: Request, res: Response) => {
  try {
    const { service_id, requester_name } = req.body;

    if (!service_id || isNaN(Number(service_id))) {
      res.status(400).json({ error: 'El campo service_id es obligatorio y debe ser numérico.' });
      return;
    }

    if (!requester_name || typeof requester_name !== 'string' || requester_name.trim().length === 0) {
      res.status(400).json({ error: 'El campo requester_name es obligatorio.' });
      return;
    }

    const ticket = await ticketsService.create({
      service_id: Number(service_id),
      requester_name
    });

    res.status(201).json(ticket);
  } catch (error: any) {
    if (error.message === 'SERVICE_NOT_FOUND') {
      res.status(404).json({ error: 'El servicio seleccionado no existe o está inactivo.' });
      return;
    }
   if (error.message === 'ACTIVE_TICKET_EXISTS') {
   res.status(409).json({
     error: 'Ya tienes un turno activo en curso. Debes esperar a que sea atendido o cancelado para solicitar otro.'
   });
   return;
 }
    console.error('Error al crear turno:', error);
    res.status(500).json({ error: 'Error interno al generar el turno.' });
  }
};

export const listTickets = async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const serviceId = req.query.service_id ? Number(req.query.service_id) : undefined;

    if (req.query.service_id && isNaN(Number(req.query.service_id))) {
      res.status(400).json({ error: 'El parámetro service_id debe ser numérico.' });
      return;
    }

    const tickets = await ticketsService.getQueue(status, serviceId);
    res.json(tickets);
  } catch (error) {
    console.error('Error al listar turnos:', error);
    res.status(500).json({ error: 'Error interno al obtener la cola de turnos.' });
  }
};

export const callNextTicket = async (req: Request, res: Response) => {
  try {
    const { operator_id, service_id } = req.body;

    if (!operator_id || isNaN(Number(operator_id))) {
      res.status(400).json({ error: 'El campo operator_id es obligatorio y debe ser numérico.' });
      return;
    }

    if (service_id !== undefined && isNaN(Number(service_id))) {
      res.status(400).json({ error: 'El campo service_id debe ser numérico.' });
      return;
    }

    const ticket = await ticketsService.callNext({
      operator_id: Number(operator_id),
      service_id: service_id !== undefined ? Number(service_id) : undefined
    });

    if (!ticket) {
      res.status(200).json({ message: 'No hay turnos pendientes en la fila.', ticket: null });
      return;
    }

    res.json(ticket);
  } catch (error: any) {
    if (error.message === 'OPERATOR_NOT_FOUND') {
      res.status(404).json({ error: 'El operador especificado no existe.' });
      return;
    }
    if (error.message === 'OPERATOR_BUSY') {
      res.status(409).json({
        error: 'El operador ya tiene un turno en atención. Finalízalo antes de llamar otro.'
      });
      return;
    }
    console.error('Error al llamar siguiente turno:', error);
    res.status(500).json({ error: 'Error interno al llamar el siguiente turno.' });
  }
};

export const updateTicketStatus = async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    const { status, operator_id, notes } = req.body;

    if (isNaN(ticketId)) {
      res.status(400).json({ error: 'El ID del turno en la URL debe ser numérico.' });
      return;
    }

    if (status !== 'atendido' && status !== 'cancelado') {
      res.status(400).json({ error: 'El campo status solo permite "atendido" o "cancelado".' });
      return;
    }

    const updated = await ticketsService.updateStatus(ticketId, {
      status,
      operator_id: operator_id !== undefined ? Number(operator_id) : undefined,
      notes
    });

    res.json(updated);
  } catch (error: any) {
    if (error.message === 'TICKET_NOT_FOUND') {
      res.status(404).json({ error: 'El turno especificado no existe.' });
      return;
    }
    if (error.message === 'TICKET_ALREADY_CLOSED') {
      res.status(409).json({ error: 'El turno ya fue atendido o cancelado previamente.' });
      return;
    }
    console.error('Error al actualizar estado del turno:', error);
    res.status(500).json({ error: 'Error interno al actualizar el turno.' });
  }
};
