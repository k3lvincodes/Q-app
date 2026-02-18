import { Router } from 'express';
import { initiateWithdraw } from '../controllers/withdraw.controller';
import { apiKeyMiddleware } from '../middlewares/apiKey.middleware';

const router = Router();

// Apply API Key Middleware to secure this route
router.post('/initiate', apiKeyMiddleware, initiateWithdraw);

export default router;
