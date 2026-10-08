import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';

// YouTube লিংক (watch?v= / youtu.be / embed) থেকে এমবেডযোগ্য URL বানানো
function getEmbedUrl(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (match) return { type: 'youtube', src: `https://www.youtube.com/embed/${match[1]}` };
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes('res.cloudinary.com')) return { type: 'file', src: url };
    return null;
}

export default function ProductDetail() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [error, setError] = useState('');
    const [vIdx, setVIdx] = useState(0);
    const [imgIdx, setImgIdx] = useState(0);
    const { addToCart } = useCart();

    useEffect(() => {
        api.getProduct(id).then(setProduct).catch((e) => setError(e.message));
    }, [id]);

    if (error) return <p className="status-msg error">{error}</p>;
    if (!product) return <p className="status-msg">লোড হচ্ছে...</p>;

    const variant = product.variants[vIdx] || product.variants[0];
    const hasDiscount = variant.originalPrice && variant.originalPrice > variant.price;
    const images = product.images || [];
    const video = getEmbedUrl(product.videoUrl);

    return (
        <div>
            <p className="crumbs">
                <Link to="/">হোম</Link> / <Link to="/categories">ক্যাটাগরি</Link> /{' '}
                <Link to={`/category/${encodeURIComponent(product.category)}`}>{product.category}</Link>
                {product.subCategory ? <> / <Link to={`/category/${encodeURIComponent(product.category)}?sub=${encodeURIComponent(product.subCategory)}`}>{product.subCategory}</Link></> : null}
            </p>
            <div className="product-detail">
                <div>
                    <div className="gallery-main">
                        {images.length > 0 ? <img src={images[imgIdx]} alt={product.title} /> : <span>{product.icon}</span>}
                    </div>
                    {images.length > 1 && (
                        <div className="gallery-thumbs">
                            {images.map((url, i) => (
                                <button key={url} className={i === imgIdx ? 'active' : ''} onClick={() => setImgIdx(i)}>
                                    <img src={url} alt="" />
                                </button>
                            ))}
                        </div>
                    )}
                    {video && (
                        <div className="video-embed">
                            {video.type === 'youtube'
                                ? <iframe src={video.src} title="প্রোডাক্ট ভিডিও" allowFullScreen />
                                : <video src={video.src} controls />}
                        </div>
                    )}
                </div>

                <div>
                    <span className="card-cat">{product.category}{product.subCategory ? ` › ${product.subCategory}` : ''}</span>
                    <h1 className="detail-title">{product.title}</h1>
                    {product.shortDescription && <p className="detail-short">{product.shortDescription}</p>}

                    <div className="variant-row" style={{ marginBottom: 12 }}>
                        {product.variants.map((v, i) => (
                            <button key={v._id} className={`variant-chip ${i === vIdx ? 'active' : ''}`} onClick={() => setVIdx(i)}>
                                {v.label}
                            </button>
                        ))}
                    </div>

                    <div className="price-wrap" style={{ marginBottom: 14 }}>
                        <span className="price" style={{ fontSize: '1.5rem' }}>৳{variant.price}</span>
                        {hasDiscount && <span className="price-orig">৳{variant.originalPrice}</span>}
                    </div>

                    {variant.stock <= 5 && variant.stock > 0 && <p className="stock-low">মাত্র {variant.stock}টি বাকি</p>}
                    {variant.stock <= 0 && <p className="stock-low">স্টকে নেই</p>}

                    <button className="btn-primary" disabled={variant.stock <= 0} onClick={() => addToCart(product, variant)}>
                        কার্টে যোগ করুন
                    </button>

                    {product.description && (
                        <div className="detail-desc">
                            <h3>বিস্তারিত</h3>
                            {product.description}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
