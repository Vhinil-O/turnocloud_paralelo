import { Router } from 'express';
import {
  createTicket,
  listTickets,
  callNextTicket,
  updateTicketStatus
} from '../controllers/tickets.controller';

const router = Router();

router.get('/', listTickets);
router.post('/', createTicket);
router.post('/next', callNextTicket);
router.patch('/:id/status', updateTicketStatus);

export default router;