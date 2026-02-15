import { Router } from 'express';
import { login, register, verifyOtp } from '../controllers/auth.controller';
import { apiKeyMiddleware } from '../middlewares/apiKey.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware';

const router = Router();

// Apply middlewares to all auth routes
router.use(apiKeyMiddleware);
router.use(rateLimitMiddleware);

router.post('/register', register);
router.post('/login', login);
// router.post('/otp', sendOtp); // Optional: keep for backward compat if needed, or remove. 
// The controller still exports sendOtp (aliased to login), so we can keep it if we want, or just rely on login.
// I will keep it for now to avoid breaking existing clients if any.
router.post('/otp', login);
router.post('/verify', verifyOtp);

export default router;
