import { useState } from 'react';
import { useCart } from '../context/CartContext';

function isDiscounted(v) {
    return Boolean(v.originalPrice && v.originalPrice > v.price);
}

function firstDiscountIndex(product) {
    const i = product.variants.findIndex(isDiscounted);
    return i === -1 ? 0 : i;
}

// প্রোডাক্ট কার্ডের তালিকা — শপ ও অফার পেজ দুটোতেই ব্যবহার হয়।
// preferOffer = true হলে, ছাড় আছে এমন সাইজটা আগে থেকেই সিলেক্ট করা থাকে।
export default function ProductGrid({ products, preferOffer = false }) {
    const [selectedVariant, setSelectedVariant] = useState({}); // productId -> variant index
    const { addToCart } = useCart();

    return (
        <div className="grid">
            {products.map((p) => {
                const vIdx = selectedVariant[p._id] ?? (preferOffer ? firstDiscountIndex(p) : 0);
                const variant = p.variants[vIdx];
                const hasDiscount = isDiscounted(variant);
                const percent = hasDiscount ? Math.round((1 - variant.price / variant.originalPrice) * 100) : 0;

                return (
                    <div className="card" key={p._id}>
                        <div className="card-media">
                            {p.icon}
                            {hasDiscount && <span className="discount-badge">-{percent}%</span>}
                        </div>
                        <div className="card-body">
                            <span className="card-cat">{p.category}</span>
                            <span className="card-name">{p.title}</span>
                            <div className="variant-row">
                                {p.variants.map((v, i) => (
                                    <button
                                        key={v._id}
                                        className={`variant-chip ${i === vIdx ? 'active' : ''}`}
                                        onClick={() => setSelectedVariant((s) => ({ ...s, [p._id]: i }))}
                                    >
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                            {variant.stock <= 5 && variant.stock > 0 && (
                                <span className="stock-low">মাত্র {variant.stock}টি বাকি</span>
                            )}
                            {variant.stock <= 0 && <span className="stock-low">স্টকে নেই</span>}
                            <div className="card-foot">
                                <div className="price-wrap">
                                    <span className="price">৳{variant.price}</span>
                                    {hasDiscount && <span className="price-orig">৳{variant.originalPrice}</span>}
                                </div>
                                <button
                                    className="add-btn"
                                    disabled={variant.stock <= 0}
                                    onClick={() => addToCart(p, variant)}
                                >
                                    কার্টে যোগ করুন
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
