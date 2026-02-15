import dotenv from 'dotenv';
import { NextFunction, Request, Response } from 'express';
dotenv.config();

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.EXTERNAL_API_KEY;

    if (!validApiKey) {
        console.warn('EXTERNAL_API_KEY environment variable is not set. API is unsecured!');
        return next();
    }

    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }

    next();
};
