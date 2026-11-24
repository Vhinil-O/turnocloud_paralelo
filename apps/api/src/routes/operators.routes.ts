import { Router } from 'express';
import { listOperators } from '../controllers/operators.controller';

const router = Router();

router.get('/', listOperators);

export default router;