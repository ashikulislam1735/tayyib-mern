import { useEffect, useState } from 'react';
import { api } from '../api';
import { useCart } from '../context/CartContext';

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedVariant, setSelectedVariant] = useState({}); // productId -> variant index
    const { addToCart } = useCart();

    useEffect(() => {
        api.getProducts()
            .then(setProducts)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className="status-msg">লোড হচ্ছে...</p>;
    if (error) return <p className="status-msg error">{error} — ব্যাকএন্ড সার্ভার চালু আছে কিনা এবং MongoDB কানেক্টেড কিনা চেক করুন।</p>;
    if (products.length === 0) return <p className="status-msg">কোনো প্রোডাক্ট নেই। প্রথমে ব্যাকএন্ডে <code>npm run seed</code> চালান।</p>;

    return (
        <div className="grid">
            {products.map((p) => {
                const vIdx = selectedVariant[p._id] ?? 0;
                const variant = p.variants[vIdx];
                const hasDiscount = variant.originalPrice && variant.originalPrice > variant.price;

                return (
                    <div className="card" key={p._id}>
                        <div className="card-media">{p.icon}</div>
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
