// ক্যাটাগরির একটাই নির্দিষ্ট ক্রম — হোম, Products, Categories, Offers,
// নেভ মেনু — সব জায়গায় এই ক্রমই চলবে। ব্যাকএন্ডের
// GET /products/categories-ও একই ক্রমে সাজায় (backend/routes/products.js)।
// তালিকায় নেই এমন ক্যাটাগরি থাকলে সেটা এই চারটার পরে আসবে।
export const CATEGORY_ORDER = ['বাদাম', 'ঘি', 'খেজুর', 'মধু'];

export function sortCategoriesByOrder(list) {
    const rank = (name) => {
        const i = CATEGORY_ORDER.indexOf(name);
        return i === -1 ? CATEGORY_ORDER.length : i;
    };
    return [...list].sort((a, b) => rank(a.name) - rank(b.name));
}
