import { Router } from 'express';
import { createTicket, listTickets } from '../controllers/tickets.controller';

const router = Router();

router.get('/', listTickets);
router.post('/', createTicket);

export default router;