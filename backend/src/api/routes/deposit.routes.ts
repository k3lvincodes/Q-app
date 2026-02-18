import { Router } from 'express';
import { initiateDeposit, verifyDeposit } from '../controllers/deposit.controller';
import { apiKeyMiddleware } from '../middlewares/apiKey.middleware';

const router = Router();

// Apply API Key Middleware to secure these routes
router.post('/initiate', apiKeyMiddleware, initiateDeposit);
router.get('/verify', apiKeyMiddleware, verifyDeposit);

export default router;
