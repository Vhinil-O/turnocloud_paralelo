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