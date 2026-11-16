import { Router } from 'express';
import { ServicesController } from '../controllers/services.controller';

const router = Router();

router.get('/', ServicesController.list);
router.post('/', ServicesController.create);

export default router;