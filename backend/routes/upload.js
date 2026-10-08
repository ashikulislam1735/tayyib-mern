import express from 'express';
import multer from 'multer';
import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ফাইল মেমোরিতে রাখা হয় (ডিস্কে সেভ হয় না), সরাসরি Cloudinary-তে পাঠানো হয়
// শুধু ছবি ও ভিডিও নেওয়া হবে, বাকি ধরনের ফাইল বাদ
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // ১৫ MB পর্যন্ত
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) cb(null, true);
        else cb(new Error('শুধু ছবি বা ভিডিও আপলোড করা যাবে'));
    },
});

// POST /api/upload — শুধু অ্যাডমিন, একটা ফাইল আপলোড করে Cloudinary URL ফেরত দেয়
// ফর্ম-ডেটায় ফিল্ডের নাম হতে হবে "file"
router.post('/', requireAdmin, (req, res) => {
    upload.single('file')(req, res, async (err) => {
        if (err) {
            const msg = err.code === 'LIMIT_FILE_SIZE' ? 'ফাইল ১৫ MB-এর বেশি বড়' : err.message;
            return res.status(400).json({ error: msg });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'কোনো ফাইল পাওয়া যায়নি' });
        }

        const isVideo = req.file.mimetype.startsWith('video/');

        try {
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'tayyib-shop', resource_type: isVideo ? 'video' : 'image' },
                    (error, result) => (error ? reject(error) : resolve(result))
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
            res.json({ url: result.secure_url, type: isVideo ? 'video' : 'image' });
        } catch (e) {
            res.status(500).json({ error: 'আপলোড ব্যর্থ হয়েছে: ' + e.message });
        }
    });
});

export default router;
