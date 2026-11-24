import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/db';
import servicesRoutes from './routes/services.routes';
import ticketsRoutes from './routes/tickets.routes';
import operatorsRoutes from './routes/operators.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', service: 'turnocloud-api', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'turnocloud-api', db: 'disconnected' });
  }
});

app.use('/api/services', servicesRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/operators', operatorsRoutes);

app.listen(port, () => {
  console.log(`API TurnoCloud escuchando en puerto ${port}`);
});