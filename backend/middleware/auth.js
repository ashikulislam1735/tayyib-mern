import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

// বৈধ JWT টোকেন (Authorization: Bearer <token>) ছাড়া route খোলা যাবে না।
// প্রতিবার ডাটাবেজ থেকে ইউজারের বর্তমান ভূমিকা (role) দেখা হয়, তাই কোনো অ্যাডমিন মুছে ফেললে
// বা ভূমিকা বদলালে পুরোনো টোকেন দিয়েও আর ঢোকা যায় না।
export async function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'লগইন প্রয়োজন' });
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: 'টোকেন অবৈধ বা মেয়াদোত্তীর্ণ, আবার লগইন করুন' });
    }

    try {
        const admin = await Admin.findById(payload.id).select('username role').lean();
        if (!admin) {
            return res.status(401).json({ error: 'এই অ্যাডমিন আর নেই, আবার লগইন করুন' });
        }
        req.admin = { id: String(admin._id), username: admin.username, role: admin.role || 'owner' };
        next();
    } catch (err) {
        return res.status(500).json({ error: 'যাচাই করতে সমস্যা হয়েছে' });
    }
}

// শুধু "মালিক" ভূমিকার জন্য (লাভ, খরচ, সেটিংস, অ্যাডমিন ম্যানেজমেন্ট)। requireAdmin-এর পরে বসাতে হবে।
export function requireOwner(req, res, next) {
    if (!req.admin || req.admin.role !== 'owner') {
        return res.status(403).json({ error: 'এই কাজ শুধু মালিক করতে পারেন' });
    }
    next();
}
