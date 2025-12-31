import { Router } from 'express';
import { handlePaystackWebhook } from '../controllers/webhook.controller';

const router = Router();

router.post('/', handlePaystackWebhook);

export default router;
