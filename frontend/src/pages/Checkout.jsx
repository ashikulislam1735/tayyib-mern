import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../api';
import { useSite } from '../context/SiteContext';

export default function Checkout() {
    const { items, subtotal, clearCart } = useCart();
    const navigate = useNavigate();
    const { site } = useSite();
    const deliveryCharge = Number.isFinite(Number(site.deliveryCharge)) ? Number(site.deliveryCharge) : 60;

    const [form, setForm] = useState({ customerName: '', phone: '', address: '', paymentMethod: 'cod' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (items.length === 0) {
        return <p className="status-msg">আপনার কার্ট খালি। <a href="/">শপে ফিরে যান</a></p>;
    }

    function handleChange(e) {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                items: items.map((i) => ({
                    productId: i.productId,
                    variantId: i.variantId,
                    quantity: i.quantity,
                })),
            };
            const order = await api.createOrder(payload);
            clearCart();
            navigate(`/order-confirmed/${order._id}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="two-col">
            <div className="panel">
                <h2>চেকআউট</h2>
                {error && <p className="status-msg error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <label>পূর্ণ নাম</label>
                    <input name="customerName" value={form.customerName} onChange={handleChange} required />

                    <label>মোবাইল নম্বর</label>
                    <input name="phone" value={form.phone} onChange={handleChange} pattern="01[0-9]{9}" required />

                    <label>ডেলিভারি ঠিকানা</label>
                    <textarea name="address" value={form.address} onChange={handleChange} required />

                    <label>পেমেন্ট পদ্ধতি</label>
                    <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
                        <option value="cod">ক্যাশ অন ডেলিভারি</option>
                        <option value="bkash">bKash</option>
                        <option value="nagad">Nagad</option>
                    </select>

                    <button className="btn-primary" type="submit" disabled={submitting}>
                        {submitting ? 'অর্ডার হচ্ছে...' : 'অর্ডার নিশ্চিত করুন'}
                    </button>
                </form>
            </div>
            <div className="panel">
                <h3>অর্ডার সারাংশ</h3>
                {items.map((i) => (
                    <div className="order-line" key={i.variantId}>
                        <span>{i.title} ({i.variantLabel}) × {i.quantity}</span>
                        <span>৳{i.price * i.quantity}</span>
                    </div>
                ))}
                <div className="order-line"><span>ডেলিভারি চার্জ</span><span>৳{deliveryCharge}</span></div>
                <div className="order-total"><span>সর্বমোট</span><span>৳{subtotal + deliveryCharge}</span></div>
            </div>
        </div>
    );
}
