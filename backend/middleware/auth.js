import jwt from 'jsonwebtoken';

// এই মিডলওয়্যারটা যেকোনো route-এর আগে বসালে, বৈধ JWT টোকেন (Authorization: Bearer <token>)
// ছাড়া সেই route অ্যাক্সেস করা যাবে না। PHP সাইটে session_start() + $_SESSION['admin_logged']
// চেক করার মতোই কাজ, শুধু এখানে টোকেন-ভিত্তিক (stateless)।
export function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'লগইন প্রয়োজন' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = payload; // পরবর্তী হ্যান্ডলারে req.admin.username ব্যবহার করা যাবে
        next();
    } catch (err) {
        return res.status(401).json({ error: 'টোকেন অবৈধ বা মেয়াদোত্তীর্ণ, আবার লগইন করুন' });
    }
}
