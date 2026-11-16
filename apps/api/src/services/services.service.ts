import { pool } from '../config/db';
import { Service, CreateServiceDTO } from '@turnocloud/shared';

export class ServicesService {
  static async getAllActive(): Promise<Service[]> {
    const result = await pool.query<Service>(
      'SELECT * FROM services WHERE active = TRUE ORDER BY id ASC'
    );
    return result.rows;
  }

  static async create(data: CreateServiceDTO): Promise<Service> {
    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
    const description = data.description?.trim() || null;

    const result = await pool.query<Service>(
      `INSERT INTO services (code, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [code, name, description]
    );
    return result.rows[0];
  }
}