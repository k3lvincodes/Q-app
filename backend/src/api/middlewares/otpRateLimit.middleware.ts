import { Request } from 'express';
import rateLimit from 'express-rate-limit';

export const otpRateLimitMiddleware = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1, // Limit each IP/Email to 1 OTP request per window
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        // Use email if available, otherwise IP
        return req.body.email || req.ip;
    },
    message: {
        error: 'Too many OTP requests. Please wait 1 minute before trying again.',
    },
});
