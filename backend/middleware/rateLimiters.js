// রিকোয়েস্টের সীমা (Rate Limiting) — একই IP থেকে অতিরিক্ত রিকোয়েস্ট এলে 429 দিয়ে থামিয়ে দেয়।
// মনে রাখবেন: সংখ্যাগুলো মেমোরিতে থাকে, তাই সার্ভার রিস্টার্ট বা ঘুমিয়ে গেলে (Render ফ্রি প্ল্যান) গণনা শূন্য হয়।
// সংখ্যা বদলাতে চাইলে শুধু নিচের দুটো `limit` বদলান।
import rateLimit from 'express-rate-limit';

// ১) পুরো /api-এর জন্য সাধারণ সীমা: প্রতি IP থেকে ১৫ মিনিটে ৩০০ রিকোয়েস্ট।
// (অ্যাডমিন প্যানেলে একসাথে অনেক রিকোয়েস্ট যায়, তাই সংখ্যাটা একটু বড় রাখা হয়েছে)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    message: { error: 'অনেক বেশি রিকোয়েস্ট হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।' },
});

// ২) নতুন অর্ডার দেওয়ার জন্য কড়া সীমা: প্রতি IP থেকে ১ ঘণ্টায় ২০টা অর্ডার।
// (মোবাইল নেটওয়ার্কে অনেক গ্রাহক একই IP ব্যবহার করতে পারেন, তাই খুব কম রাখা হয়নি)
export const orderCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'এই নেটওয়ার্ক থেকে অনেক বেশি অর্ডার এসেছে। কিছুক্ষণ পরে আবার চেষ্টা করুন বা WhatsApp-এ যোগাযোগ করুন।' },
});
