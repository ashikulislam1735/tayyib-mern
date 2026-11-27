// লোডিং স্কেলেটন — সার্ভার (Render free plan) ঘুম থেকে জাগার সময় পেজ
// ফাঁকা/ভাঙা না দেখিয়ে কার্ডের আকারেই অপেক্ষার ছবি দেখায়। আসল ডেটা
// এলে স্কেলেটন সরে যায়; কোনো ভুয়া প্রোডাক্ট এখানে দেখানো হয় না।
export function ProductGridSkeleton({ count = 6, layout = 'grid' }) {
    return (
        <div className={`pgrid ${layout}`} aria-label="Loading products">
            {Array.from({ length: count }).map((_, i) => (
                <div className="pcard" key={i} aria-hidden="true">
                    <div className="skel skel-media" />
                    <div className="skel skel-line" />
                    <div className="skel skel-line short" />
                    <div className="skel skel-line" />
                </div>
            ))}
        </div>
    );
}

export function ProductDetailSkeleton() {
    return (
        <div className="product-detail" aria-label="Loading product">
            <div aria-hidden="true">
                <div className="skel skel-gallery" />
            </div>
            <div aria-hidden="true">
                <div className="skel skel-line tall" />
                <div className="skel skel-line" />
                <div className="skel skel-line short" />
                <div className="skel skel-line" />
                <div className="skel skel-line short" />
            </div>
        </div>
    );
}
