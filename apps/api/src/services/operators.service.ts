import { pool } from '../config/db';
import { Operator } from '@turnocloud/shared';

export class OperatorsService {
  async getAll(): Promise<Operator[]> {
    const result = await pool.query(
      'SELECT * FROM operators WHERE active = true ORDER BY id ASC'
    );
    return result.rows;
  }
}