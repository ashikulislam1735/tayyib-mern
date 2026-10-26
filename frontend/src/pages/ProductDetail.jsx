import { webp } from '../utils/cloudinary';
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useSite } from '../context/SiteContext';
import Stars from '../components/Stars';
import Reviews from '../components/Reviews';
import { track } from '../lib/track';

// YouTube লিংক (watch?v= / youtu.be / embed) থেকে এমবেডযোগ্য URL বানানো
function getEmbedUrl(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (match) return { type: 'youtube', src: `https://www.youtube.com/embed/${match[1]}` };
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes('res.cloudinary.com')) return { type: 'file', src: url };
    return null;
}

// স্টকের লেখা ও ধরন: স্টকে আছে / মাত্র N টি বাকি / স্টকে নেই
function stockInfo(stock) {
    if (stock <= 0) return { text: 'Out of Stock', cls: 'out' };
    if (stock <= 5) return { text: `Only ${stock} left`, cls: 'low' };
    return { text: 'In Stock', cls: '' };
}

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { site } = useSite();
    const freeMin = Number(site.freeDeliveryMin) > 0 ? Number(site.freeDeliveryMin) : 0;
    const { items, addToCart, changeQty } = useCart();
    const [product, setProduct] = useState(null);
    const [error, setError] = useState('');
    const [vIdx, setVIdx] = useState(0);
    const [imgIdx, setImgIdx] = useState(0);
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        setVIdx(0);
        setImgIdx(0);
        setQty(1);
        api.getProduct(id).then(setProduct).catch((e) => setError(e.message));
    }, [id]);

    // Pixel/GA4: প্রোডাক্ট দেখা (ViewContent)
    useEffect(() => {
        if (!product) return;
        const prices = (product.variants || []).map((v) => v.price).filter((n) => n > 0);
        track('ViewContent', {
            content_name: product.title,
            content_type: 'product',
            content_ids: [product._id],
            value: prices.length ? Math.min(...prices) : 0,
            currency: 'BDT',
        });
    }, [product?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    // "কার্টে যোগ হয়েছে" লেখা ২ সেকেন্ড পর মুছে যায়
    useEffect(() => {
        if (!added) return undefined;
        const t = setTimeout(() => setAdded(false), 2000);
        return () => clearTimeout(t);
    }, [added]);

    if (error) return <p className="status-msg error">{error}</p>;
    if (!product) return <p className="status-msg">Loading...</p>;

    const variant = product.variants[vIdx] || product.variants[0];
    const hasDiscount = variant.originalPrice && variant.originalPrice > variant.price;
    const save = hasDiscount ? variant.originalPrice - variant.price : 0;
    const images = product.images || [];
    const video = getEmbedUrl(product.videoUrl);
    const soldOut = variant.stock <= 0;
    const stock = stockInfo(variant.stock);
    const maxQty = Math.max(variant.stock, 1);

    const existing = items.find((i) => i.productId === product._id && i.variantId === variant._id);

    // কার্টে নির্বাচিত পরিমাণ যোগ করা (কার্টে আগে থাকলে তার ওপর বাড়ে)
    function addSelected() {
        if (!existing) {
            addToCart(product, variant);
            if (qty > 1) changeQty(product._id, variant._id, qty - 1);
        } else {
            changeQty(product._id, variant._id, qty);
        }
    }

    function handleAddToCart() {
        addSelected();
        setAdded(true);
    }

    // "এখনই অর্ডার": কার্টে ঠিক নির্বাচিত পরিমাণ রেখে চেকআউটে যায়
    function handleOrderNow() {
        if (!existing) {
            addToCart(product, variant);
            if (qty > 1) changeQty(product._id, variant._id, qty - 1);
        } else if (existing.quantity !== qty) {
            changeQty(product._id, variant._id, qty - existing.quantity);
        }
        navigate('/checkout');
    }

    const waNumber = String((site.social && site.social.whatsapp) || '').replace(/\D/g, '');
    const waText = [
        'Assalamu Alaikum, I would like to order this product:',
        '',
        `Product: ${product.title}`,
        `Size: ${variant.label}`,
        `Quantity: ${qty}`,
        `Total: ৳${variant.price * qty} (excluding delivery)`,
        `Link: ${window.location.href}`,
    ].join('\n');
    const phone = String(site.phone || '').trim();

    return (
        <div>
            <p className="crumbs">
                <Link to="/">Home</Link> / <Link to="/categories">Categories</Link> /{' '}
                <Link to={`/category/${encodeURIComponent(product.category)}`}>{product.category}</Link>
                {product.subCategory ? <> / <Link to={`/category/${encodeURIComponent(product.category)}?sub=${encodeURIComponent(product.subCategory)}`}>{product.subCategory}</Link></> : null}
            </p>
            <div className="product-detail">
                <div>
                    <div className="gallery-main">
                        {images.length > 0 ? <img src={webp(images[imgIdx], 1000)} alt={product.title} decoding="async" /> : <span>{product.icon}</span>}
                    </div>
                    {images.length > 1 && (
                        <div className="gallery-thumbs">
                            {images.map((url, i) => (
                                <button key={url} className={i === imgIdx ? 'active' : ''} onClick={() => setImgIdx(i)}>
                                    <img src={webp(url, 160)} alt="" loading="lazy" decoding="async" />
                                </button>
                            ))}
                        </div>
                    )}
                    {video && (
                        <div className="video-embed">
                            {video.type === 'youtube'
                                ? <iframe src={video.src} title="Product video" allowFullScreen />
                                : <video src={video.src} controls />}
                        </div>
                    )}
                </div>

                <div>
                    <div className="pd-badges">
                        <span className="pd-cat">{product.category}{product.subCategory ? ` › ${product.subCategory}` : ''}</span>
                        <span className={`stock-badge ${stock.cls}`}>{stock.text}</span>
                    </div>
                    <h1 className="detail-title">{product.title}</h1>
                    {product.ratingCount > 0 && (
                        <p className="reviews-summary"><Stars value={product.ratingAvg} /> {product.ratingAvg} ({product.ratingCount} reviews)</p>
                    )}
                    {product.shortDescription && <p className="detail-short">{product.shortDescription}</p>}

                    <div className="pd-label">Select size</div>
                    <div className="pd-variants">
                        {product.variants.map((v, i) => {
                            const s = stockInfo(v.stock);
                            return (
                                <button
                                    key={v._id}
                                    className={`pd-variant ${i === vIdx ? 'active' : ''}`}
                                    onClick={() => { setVIdx(i); setQty(1); }}
                                >
                                    <strong>{v.label}</strong>
                                    <span className="pd-variant-price">৳{v.price}</span>
                                    <small className={s.cls}>{s.text}</small>
                                </button>
                            );
                        })}
                    </div>

                    <div className="pd-priceline">
                        {hasDiscount && <span className="pd-price-old">৳{variant.originalPrice}</span>}
                        <span className="pd-price">৳{variant.price}</span>
                        {hasDiscount && <span className="pd-save">Save ৳{save}</span>}
                    </div>

                    <div className="pd-label">Quantity</div>
                    <div className="qty-box">
                        <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={soldOut || qty <= 1} aria-label="Decrease quantity">−</button>
                        <span>{soldOut ? 0 : qty}</span>
                        <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={soldOut || qty >= maxQty} aria-label="Increase quantity">+</button>
                    </div>
                    {!soldOut && qty > 1 && <p className="pd-total">Total: <strong>৳{variant.price * qty}</strong> (excluding delivery)</p>}

                    {freeMin > 0 && (
                        <div style={{ background: '#fff3c4', border: '1px solid #e8c660', color: '#7a5a00', borderRadius: 8, padding: '10px 14px', marginTop: 14, fontWeight: 600 }}>
                            {!soldOut && variant.price * qty >= freeMin
                                ? '🎉 You get free delivery on this order!'
                                : `🚚 Free delivery on orders of ৳${freeMin} or more`}
                        </div>
                    )}

                    <div className="pd-actions">
                        <button className="btn-pd order" disabled={soldOut} onClick={handleOrderNow}>Order Now</button>
                        <button className="btn-pd cart" disabled={soldOut} onClick={handleAddToCart}>🛒 Add to Cart</button>
                        {waNumber && (
                            <a className="btn-pd wa" href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" onClick={() => track('Contact', { content_name: 'whatsapp' })}>💬 Order on WhatsApp</a>
                        )}
                        {phone && <a className="btn-pd call" href={`tel:${phone}`} onClick={() => track('Contact', { content_name: 'phone' })}>📞 Call for Order</a>}
                    </div>
                    {added && <p className="pd-added">✓ Added to cart</p>}

                    {product.description && (
                        <div className="detail-desc">
                            <h3>Description</h3>
                            {product.description}
                        </div>
                    )}
                </div>
            </div>
            <Reviews productId={product._id} title={product.title} />
        </div>
    );
}
