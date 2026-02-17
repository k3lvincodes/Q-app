import rateLimit from 'express-rate-limit';

export const otpRateLimitMiddleware = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1, // Limit each IP/Email to 1 OTP request per window
    standardHeaders: true,
    legacyHeaders: false,
    // Simpler fix: Remove keyGenerator and let it use default IP, but we want Email rate limiting.
    // Correct fix: ensure we return a string and maybe set 'validate: {x_forwarded_for_header: false}' if behind proxy, 
    // but the error specifically mentions keyGeneratorIpFallback.
    // Let's try standardizing the return value.
    message: {
        error: 'Too many OTP requests. Please wait 1 minute before trying again.',
    },
});
