import { Router } from 'express';
import { sendOtp, verifyOtp } from '../controllers/auth.controller';

const router = Router();

router.post('/otp', sendOtp);
router.post('/verify', verifyOtp);

export default router;
