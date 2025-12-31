import { Router } from 'express';
import { getInviteCode, redeemInviteCode } from '../controllers/invites.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/code', authMiddleware, getInviteCode);
router.post('/redeem', redeemInviteCode);

export default router;
