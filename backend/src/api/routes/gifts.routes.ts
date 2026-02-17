import { Router } from 'express';
import { claimGift, sendGiftNotification } from '../controllers/gifts.controller';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware';

const router = Router();

// Apply middlewares
// router.use(apiKeyMiddleware); // validApiKey check removed for App usage
router.use(rateLimitMiddleware);

router.post('/claim', claimGift);
router.post('/notify', sendGiftNotification);

export default router;
