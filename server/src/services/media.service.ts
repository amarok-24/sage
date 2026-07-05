import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Request } from 'express';
import { nanoid } from 'nanoid';

// Local storage configuration for development and testing
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${nanoid()}-${file.originalname}`);
  }
});

export const upload = multer({ storage });

export const generatePresignedUrls = (count: number, types: string[]): any[] => {
  // In production, this would use AWS S3 SDK to generate Cloudflare R2 urls.
  // For local/test dev, we just mock the presign logic or rely on direct local upload.
  return Array.from({ length: count }).map(() => ({
    uploadUrl: '/api/media/upload', // Endpoint to handle local upload
    publicUrl: '/uploads/' + nanoid() + '.jpg', // Mock public URL
    expiresAt: Date.now() + 300000
  }));
};
