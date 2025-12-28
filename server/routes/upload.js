import express from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// @route   POST /api/upload/image
// @desc    Upload an image to Cloudinary
// @access  Private
router.post('/image', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'Voca/images',
            resource_type: 'image'
        });

        res.json({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height
        });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// @route   POST /api/upload/video
// @desc    Upload a video to Cloudinary
// @access  Private
router.post('/video', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'Voca/videos',
            resource_type: 'video'
        });

        res.json({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            duration: result.duration
        });
    } catch (error) {
        console.error('Video upload error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// @route   POST /api/upload/voice
// @desc    Upload a voice note to Cloudinary
// @access  Private
router.post('/voice', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'Voca/voice',
            resource_type: 'video' // Audio is handled as video in Cloudinary
        });

        res.json({
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration
        });
    } catch (error) {
        console.error('Voice upload error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// @route   POST /api/upload/avatar
// @desc    Upload avatar/profile photo
// @access  Private
router.post('/avatar', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'Voca/avatars',
            resource_type: 'image',
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' }
            ]
        });

        res.json({
            url: result.secure_url,
            publicId: result.public_id
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// @route   POST /api/upload/base64
// @desc    Upload base64 encoded image
// @access  Private
router.post('/base64', protect, async (req, res) => {
    try {
        const { data, folder = 'Voca/images' } = req.body;

        if (!data) {
            return res.status(400).json({ message: 'No image data provided' });
        }

        // Upload base64 directly to Cloudinary
        const { v2: cloudinary } = await import('cloudinary');
        const result = await cloudinary.uploader.upload(data, {
            folder,
            resource_type: 'auto'
        });

        res.json({
            url: result.secure_url,
            publicId: result.public_id
        });
    } catch (error) {
        console.error('Base64 upload error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

export default router;
