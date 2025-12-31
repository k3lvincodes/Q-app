
import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';

// Ensure Cloudinary is configured (it auto-reads CLOUDINARY_URL)
// Ideally, we check this on startup, but here we can check defensively.
if (process.env.CLOUDINARY_URL) {
    cloudinary.config(); // Auto-load
}

export const signUpload = async (req: Request, res: Response) => {
    try {
        const timestamp = Math.round((new Date).getTime() / 1000);

        // We use the configured cloud_name and keys
        const config = cloudinary.config();

        if (!config.api_secret || !config.api_key || !config.cloud_name) {
            throw new Error("Cloudinary not configured on server.");
        }

        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
            // eager: 'c_pad,h_300,w_400|c_crop,h_200,w_260', // Example optional transforms
            // folder: 'signed_uploads', // Optional
        }, config.api_secret);

        res.json({
            signature,
            timestamp,
            api_key: config.api_key,
            cloud_name: config.cloud_name
        });
    } catch (error: any) {
        console.error("Cloudinary Signature Error:", error);
        res.status(500).json({ error: error.message || "Failed to sign upload" });
    }
};
