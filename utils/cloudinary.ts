
import { Alert, Platform } from 'react-native';
import api from './api';

export const uploadToCloudinary = async (uri: string): Promise<string | null> => {
    if (!uri) return null;

    try {
        // 1. Get Signature from Backend
        // GET /upload/sign
        const signatureResponse = await api.get('/upload/sign');
        const { signature, timestamp, api_key, cloud_name } = signatureResponse.data;

        if (!signature || !cloud_name) {
            throw new Error("Failed to get upload signature");
        }

        // 2. Upload to Cloudinary directly
        const formData = new FormData();

        // Append file
        if (Platform.OS === 'web') {
            const fileResponse = await fetch(uri);
            const blob = await fileResponse.blob();
            formData.append('file', blob);
        } else {
            // @ts-ignore
            formData.append('file', {
                uri,
                type: 'image/jpeg',
                name: 'upload.jpg',
            });
        }

        formData.append('api_key', api_key);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);

        // Note: 'upload_preset' is NOT used for signed uploads unless specifically configured.
        // Signed uploads rely on the signature + api_key.

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (data.secure_url) {
            return data.secure_url;
        } else {
            console.error("Cloudinary Error:", data);
            Alert.alert("Upload Failed", "Could not upload image to cloud.");
            return null;
        }

    } catch (error: any) {
        console.error("Upload Error:", error);
        Alert.alert("Upload Error", "An error occurred while uploading. Please check network/permissions.");
        return null;
    }
};
