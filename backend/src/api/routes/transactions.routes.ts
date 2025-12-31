import { Router } from 'express';
import { getUserTransactions } from '../controllers/transactions.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getUserTransactions);

export default router;
