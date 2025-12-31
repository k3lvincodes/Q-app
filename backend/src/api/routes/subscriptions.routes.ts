import { Router } from 'express';
import {
  getUserSubscriptions,
  getSubscriptionById,
  joinSubscription,
} from '../controllers/subscriptions.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getUserSubscriptions);
router.get('/:id', getSubscriptionById);
router.post('/join', joinSubscription);

export default router;
