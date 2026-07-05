import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generatePresignedUrls, upload } from '../services/media.service';

const router = Router();

router.get('/presign', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const count = Number(req.query.count) || 1;
    const types = (req.query.types as string)?.split(',') || ['image/jpeg'];
    
    // In production, this returns real R2 presigned URLs.
    // In local dev, it returns mock URLs or points to the local upload endpoint.
    const urls = generatePresignedUrls(count, types);
    res.json({ urls });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate urls' });
  }
});

// Local upload endpoint for development/testing
router.post('/upload', authenticate, upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ publicUrl });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
