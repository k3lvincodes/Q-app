import { Router } from 'express';
import { createSupportTicket } from '../controllers/support.controller';

const router = Router();

router.post('/ticket', createSupportTicket);

export default router;
