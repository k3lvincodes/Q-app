
import { Router } from 'express';
import { signUpload } from '../controllers/upload.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Protect this route! Only authenticated users (or admins) should upload.
router.get('/sign', authMiddleware, signUpload);

export default router;
