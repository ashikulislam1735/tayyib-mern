import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartDrawer({ open, onClose }) {
    const { items, changeQty, subtotal } = useCart();

    return (
        <>
            <div className={`overlay ${open ? 'open' : ''}`} onClick={onClose}></div>
            <aside className={`drawer ${open ? 'open' : ''}`}>
                <div className="drawer-head">
                    <h3>আপনার কার্ট</h3>
                    <button className="drawer-close" onClick={onClose}>✕</button>
                </div>
                <div className="drawer-items">
                    {items.length === 0 ? (
                        <p className="empty-note">কার্ট খালি।</p>
                    ) : (
                        items.map((i) => (
                            <div className="drawer-item" key={i.variantId}>
                                <div className="thumb">{i.icon}</div>
                                <div className="info">
                                    <div className="name">{i.title}</div>
                                    <div className="unit">{i.variantLabel} · ৳{i.price}</div>
                                    <div className="qty-row">
                                        <button className="qty-btn" onClick={() => changeQty(i.productId, i.variantId, -1)}>−</button>
                                        <span>{i.quantity}</span>
                                        <button className="qty-btn" onClick={() => changeQty(i.productId, i.variantId, 1)}>+</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="drawer-foot">
                    <div className="subtotal-row"><span>সাবটোটাল</span><span>৳{subtotal}</span></div>
                    <Link to="/checkout" className="btn-primary" onClick={onClose} style={{ textAlign: 'center', display: 'block' }}>
                        চেকআউট করুন
                    </Link>
                </div>
            </aside>
        </>
    );
}
