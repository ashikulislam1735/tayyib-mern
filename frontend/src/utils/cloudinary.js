// Cloudinary ছবির ছোট (বর্গাকার) সংস্করণ — ক্যাটাগরির গোল আইকনে দ্রুত লোডের জন্য
export function thumb(url, size = 160) {
    if (typeof url !== 'string' || !url.includes('/upload/')) return url;
    return url.replace('/upload/', `/upload/c_fill,g_auto,w_${size},h_${size},f_auto,q_auto/`);
}

// প্রোডাক্টের ছবি WebP ফরম্যাটে ও দরকারি মাপে (সর্বোচ্চ width px) দেখানো — ফোনে কম ডেটা লাগে।
// Cloudinary-র ছবি না হলে, বা আগে থেকেই কোনো মাপ/ফরম্যাট দেওয়া থাকলে, যেমন আছে তেমনই থাকে।
export function webp(url, width = 800) {
    if (typeof url !== 'string' || !url.includes('/image/upload/')) return url;
    if (/\/image\/upload\/[a-z]{1,4}_[^/]*\//.test(url)) return url;
    return url.replace('/image/upload/', `/image/upload/f_webp,q_auto,w_${width},c_limit/`);
}
