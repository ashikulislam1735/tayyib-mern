import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Stars from './Stars';

function isDiscounted(v) {
    return Boolean(v.originalPrice && v.originalPrice > v.price);
}

function firstDiscountIndex(product) {
    const i = product.variants.findIndex(isDiscounted);
    return i === -1 ? 0 : i;
}

function StockBadge({ stock }) {
    if (stock <= 0) return <span className="stock-badge out">স্টকে নেই</span>;
    if (stock <= 5) return <span className="stock-badge low">মাত্র {stock}টি বাকি</span>;
    return <span className="stock-badge">স্টকে আছে</span>;
}

function ProductCard({ p, layout, preferOffer }) {
    const [vIdx, setVIdx] = useState(() => (preferOffer ? firstDiscountIndex(p) : 0));
    const { items, addToCart } = useCart();
    const navigate = useNavigate();

    const variant = p.variants[vIdx];
    const hasDiscount = isDiscounted(variant);
    const percent = hasDiscount ? Math.round((1 - variant.price / variant.originalPrice) * 100) : 0;
    const soldOut = variant.stock <= 0;

    function orderNow() {
        // কার্টে আগে থেকে থাকলে সংখ্যা না বাড়িয়ে সরাসরি চেকআউটে যায়
        const inCart = items.some((i) => i.productId === p._id && i.variantId === variant._id);
        if (!inCart) addToCart(p, variant);
        navigate('/checkout');
    }

    return (
        <div className={`pcard ${layout === 'row' ? 'row' : ''}`}>
            <Link to={`/product/${p._id}`} className="pcard-media">
                {p.images && p.images[0] ? <img src={p.images[0]} alt={p.title} loading="lazy" /> : p.icon}
                {hasDiscount && <span className="discount-badge">-{percent}%</span>}
            </Link>

            <div className="pcard-body">
                <div className="pcard-top">
                    <span className="pcard-cat">{p.category}</span>
                    {p.ratingCount > 0 && (
                        <span className="card-rating"><Stars value={p.ratingAvg} size={13} /> <small>({p.ratingCount})</small></span>
                    )}
                </div>

                <Link to={`/product/${p._id}`} className="pcard-title">{p.title}</Link>

                <div className="pcard-priceline">
                    <div className="price-wrap">
                        <span className="price">৳{variant.price}</span>
                        {hasDiscount && <span className="price-orig">৳{variant.originalPrice}</span>}
                    </div>
                    <StockBadge stock={variant.stock} />
                </div>

                <div className="variant-row">
                    {p.variants.map((v, i) => (
                        <button key={v._id} className={`variant-chip ${i === vIdx ? 'active' : ''}`} onClick={() => setVIdx(i)}>
                            {v.label}
                        </button>
                    ))}
                </div>

                <div className="pcard-actions">
                    <button className="btn-order" disabled={soldOut} onClick={orderNow}>এখনই অর্ডার</button>
                    <button className="btn-cart" disabled={soldOut} onClick={() => addToCart(p, variant)}>🛒 কার্টে যোগ করুন</button>
                </div>
            </div>
        </div>
    );
}

// layout: 'grid' (সাধারণ, নিচে ছবি) | 'compact' (ছোট কার্ড, এক সারিতে ৫টি পর্যন্ত) | 'row' (পাশাপাশি ছবি + তথ্য, দুই কলাম)
// preferOffer = true হলে ছাড় আছে এমন সাইজটা আগে থেকেই সিলেক্ট করা থাকে।
export default function ProductGrid({ products, preferOffer = false, layout = 'grid' }) {
    return (
        <div className={`pgrid ${layout}`}>
            {products.map((p) => (
                <ProductCard key={p._id} p={p} layout={layout} preferOffer={preferOffer} />
            ))}
        </div>
    );
}
