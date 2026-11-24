import { Request, Response } from 'express';
import { OperatorsService } from '../services/operators.service';

const operatorsService = new OperatorsService();

export const listOperators = async (_req: Request, res: Response) => {
  try {
    const operators = await operatorsService.getAll();
    res.json(operators);
  } catch (error) {
    console.error('Error al listar operadores:', error);
    res.status(500).json({ error: 'Error interno al obtener los operadores.' });
  }
};