import { Router } from 'express';
import { createService, getAllServices } from '../controllers/services.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getAllServices);
router.post('/', authMiddleware, createService);

export default router;
