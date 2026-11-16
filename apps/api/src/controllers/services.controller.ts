import { Request, Response } from 'express';
import { ServicesService } from '../services/services.service';

export class ServicesController {
  static async list(_req: Request, res: Response): Promise<void> {
    try {
      const services = await ServicesService.getAllActive();
      res.status(200).json(services);
    } catch (error) {
      console.error('Error al listar servicios:', error);
      res.status(500).json({ error: 'Error interno al obtener los servicios' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { code, name, description } = req.body;

      if (!code || typeof code !== 'string' || code.trim().length > 10) {
        res.status(400).json({ error: 'El código es obligatorio y debe tener máximo 10 caracteres' });
        return;
      }
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'El nombre del servicio es obligatorio' });
        return;
      }

      const newService = await ServicesService.create({ code, name, description });
      res.status(201).json(newService);
    } catch (error: any) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'Ya existe un servicio con ese código' });
        return;
      }
      console.error('Error al crear servicio:', error);
      res.status(500).json({ error: 'Error interno al crear el servicio' });
    }
  }
}