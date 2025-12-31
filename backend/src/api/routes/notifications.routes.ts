import { Router } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
} from '../controllers/notifications.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getUserNotifications);
router.post('/:id/read', markNotificationAsRead);

export default router;
