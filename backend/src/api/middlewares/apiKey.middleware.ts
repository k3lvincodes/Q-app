import dotenv from 'dotenv';
import { NextFunction, Request, Response } from 'express';
dotenv.config();

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.EXTERNAL_API_KEY;

    console.log(`[DEBUG] API Key Middleware: ${req.method} ${req.path}`);
    console.log(`[DEBUG] Headers[x-api-key]:`, apiKey ? 'Present' : 'Missing', apiKey);
    console.log(`[DEBUG] Body Keys:`, req.body ? Object.keys(req.body) : 'No Body');

    if (!validApiKey) {
        console.warn('EXTERNAL_API_KEY environment variable is not set. API is unsecured!');
        return next();
    }

    if (!apiKey || apiKey !== validApiKey) {
        console.log(`[DEBUG] Auth Failed: received '${apiKey}' vs expected '${validApiKey}'`);
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }

    next();
};
