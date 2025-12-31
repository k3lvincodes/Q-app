import { Router } from 'express';
import { createRequest, getUserRequests } from '../controllers/requests.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createRequest);
router.get('/', getUserRequests);

export default router;
