import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../api';
import { useSite } from '../context/SiteContext';

export default function Checkout() {
    const { items, subtotal, clearCart } = useCart();
    const navigate = useNavigate();
    const { site } = useSite();

    const [form, setForm] = useState({ customerName: '', phone: '', address: '', paymentMethod: 'cod', deliveryArea: 'inside' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const lastSaved = useRef(''); // একই কার্ট বারবার সার্ভারে না পাঠানোর জন্য

    const chargeOf = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    const deliveryCharge = form.deliveryArea === 'outside'
        ? chargeOf(site.deliveryOutside, 120)
        : chargeOf(site.deliveryInside, 60);

    if (items.length === 0) {
        return <p className="status-msg">আপনার কার্ট খালি। <a href="/">শপে ফিরে যান</a></p>;
    }

    function handleChange(e) {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    }

    // ফোন নম্বর লেখা শেষ হলে কার্ট চুপচাপ সেভ — ব্যর্থ হলে কাস্টমারকে কিছু দেখানো হয় না
    function saveCartQuietly() {
        const phone = form.phone.trim();
        if (!/^01[0-9]{9}$/.test(phone) || items.length === 0) return;
        const payload = {
            phone,
            customerName: form.customerName.trim(),
            items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        };
        const signature = JSON.stringify(payload);
        if (signature === lastSaved.current) return;
        lastSaved.current = signature;
        api.saveAbandonedCart(payload).catch(() => { lastSaved.current = ''; });
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
                    <input name="phone" value={form.phone} onChange={handleChange} onBlur={saveCartQuietly} pattern="01[0-9]{9}" required />
                    <p style={{ fontSize: 12, color: 'var(--walnut-soft)', margin: '4px 0 0' }}>অর্ডার সম্পূর্ণ না হলে আমরা এই নম্বরে যোগাযোগ করতে পারি।</p>

                    <label>ডেলিভারি এলাকা</label>
                    <select name="deliveryArea" value={form.deliveryArea} onChange={handleChange}>
                        <option value="inside">ঢাকার ভেতরে (৳{chargeOf(site.deliveryInside, 60)})</option>
                        <option value="outside">ঢাকার বাইরে (৳{chargeOf(site.deliveryOutside, 120)})</option>
                    </select>

                    <label>ডেলিভারি ঠিকানা</label>
                    <textarea name="address" value={form.address} onChange={handleChange} required />

                    <label>পেমেন্ট পদ্ধতি</label>
                    <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
                        <option value="cod">ক্যাশ অন ডেলিভারি</option>
                        <option value="bkash">bKash</option>
                        <option value="nagad">Nagad</option>
                    </select>

                    <p style={{ fontSize: 12, color: 'var(--walnut-soft)', margin: '10px 0 0' }}>
                        অর্ডার করলে আপনি আমাদের <Link to="/privacy">গোপনীয়তা নীতি</Link> মেনে নিচ্ছেন।
                    </p>

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
                <div className="order-line"><span>ডেলিভারি চার্জ ({form.deliveryArea === 'outside' ? 'ঢাকার বাইরে' : 'ঢাকার ভেতরে'})</span><span>৳{deliveryCharge}</span></div>
                <div className="order-total"><span>সর্বমোট</span><span>৳{subtotal + deliveryCharge}</span></div>
            </div>
        </div>
    );
}
