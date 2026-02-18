import { Router } from 'express';
import { claimGift, sendGiftNotification } from '../controllers/gifts.controller';
import { apiKeyMiddleware } from '../middlewares/apiKey.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware';

const router = Router();

// Apply middlewares
router.use(apiKeyMiddleware);
router.use(rateLimitMiddleware);

router.post('/claim', claimGift);
router.post('/notify', sendGiftNotification);

export default router;
