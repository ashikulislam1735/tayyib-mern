// Cloudinary ছবির ছোট (বর্গাকার) সংস্করণ — ক্যাটাগরির গোল আইকনে দ্রুত লোডের জন্য
export function thumb(url, size = 160) {
    if (typeof url !== 'string' || !url.includes('/upload/')) return url;
    return url.replace('/upload/', `/upload/c_fill,g_auto,w_${size},h_${size},f_auto,q_auto/`);
}
