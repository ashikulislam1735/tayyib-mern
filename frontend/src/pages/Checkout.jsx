import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../api';
import { useSite } from '../context/SiteContext';

export default function Checkout() {
    const { items, subtotal, clearCart } = useCart();
    const navigate = useNavigate();
    const { site } = useSite();

    const [form, setForm] = useState({ customerName: '', phone: '', address: '', paymentMethod: 'cod', paymentTrxId: '', deliveryArea: 'inside' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [couponInput, setCouponInput] = useState('');
    const [coupon, setCoupon] = useState(null); // { code, discount }
    const [couponMsg, setCouponMsg] = useState('');
    const [couponBusy, setCouponBusy] = useState(false);
    const lastSaved = useRef(''); // একই কার্ট বারবার সার্ভারে না পাঠানোর জন্য

    const chargeOf = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    const baseCharge = form.deliveryArea === 'outside'
        ? chargeOf(site.deliveryOutside, 120)
        : chargeOf(site.deliveryInside, 60);
    // ফ্রি ডেলিভারি: কুপন ছাড়ের পরের পণ্যের দাম সীমার সমান বা বেশি হলে চার্জ ০ (সার্ভারও একই নিয়মে হিসাব করে)
    const freeMin = Number(site.freeDeliveryMin) > 0 ? Number(site.freeDeliveryMin) : 0;
    const afterDiscount = subtotal - (coupon ? coupon.discount : 0);
    const isFree = freeMin > 0 && afterDiscount >= freeMin;
    const deliveryCharge = isFree ? 0 : baseCharge;

    const payable = afterDiscount + deliveryCharge;
    const payNumber = form.paymentMethod === 'bkash' ? site.bkashNumber : form.paymentMethod === 'nagad' ? site.nagadNumber : '';

    if (items.length === 0) {
        return <p className="status-msg">Your cart is empty. <Link to="/">Back to shop</Link></p>;
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

    async function applyCoupon() {
        if (!couponInput.trim()) return;
        setCouponBusy(true);
        setCouponMsg('');
        try {
            const r = await api.validateCoupon({ code: couponInput, subtotal });
            setCoupon({ code: r.code, discount: r.discount });
            setCouponMsg(`Coupon applied: ৳${r.discount} off`);
        } catch (err) {
            setCoupon(null);
            setCouponMsg(err.message);
        } finally {
            setCouponBusy(false);
        }
    }

    function removeCoupon() {
        setCoupon(null);
        setCouponInput('');
        setCouponMsg('');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                couponCode: coupon ? coupon.code : undefined,
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
                <h2>Checkout</h2>
                {error && <p className="status-msg error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <label>Full Name</label>
                    <input name="customerName" value={form.customerName} onChange={handleChange} required />

                    <label>Mobile Number</label>
                    <input name="phone" value={form.phone} onChange={handleChange} onBlur={saveCartQuietly} pattern="01[0-9]{9}" title="Enter an 11-digit mobile number starting with 01, e.g. 01XXXXXXXXX" placeholder="01XXXXXXXXX" inputMode="numeric" required />
                    <p style={{ fontSize: 14, color: 'var(--walnut-soft)', margin: '4px 0 0' }}>If your order isn't completed, we may contact you on this number.</p>

                    <label>Delivery Area</label>
                    <select name="deliveryArea" value={form.deliveryArea} onChange={handleChange}>
                        <option value="inside">Inside Dhaka (৳{chargeOf(site.deliveryInside, 60)})</option>
                        <option value="outside">Outside Dhaka (৳{chargeOf(site.deliveryOutside, 120)})</option>
                    </select>

                    <label>Delivery Address</label>
                    <textarea name="address" value={form.address} onChange={handleChange} required />

                    <label>Payment Method</label>
                    <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
                        <option value="cod">Cash on Delivery</option>
                        {site.bkashNumber && <option value="bkash">bKash</option>}
                        {site.nagadNumber && <option value="nagad">Nagad</option>}
                    </select>

                    {form.paymentMethod !== 'cod' && (
                        <>
                            <p style={{ fontSize: 14, margin: '10px 0 0' }}>
                                First send <strong>৳{payable}</strong> to this {form.paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} number using <strong>Send Money</strong>: <strong>{payNumber}</strong>
                            </p>
                            <label>Transaction ID (TrxID)</label>
                            <input name="paymentTrxId" value={form.paymentTrxId} onChange={handleChange} maxLength={20} required placeholder="e.g. 8N7A6D5EE" style={{ textTransform: 'uppercase' }} />
                            <p style={{ fontSize: 14, color: 'var(--walnut-soft)', margin: '4px 0 0' }}>After sending the money, enter the TrxID from the confirmation message here. We will verify it and confirm your order.</p>
                        </>
                    )}

                    <p style={{ fontSize: 14, color: 'var(--walnut-soft)', margin: '10px 0 0' }}>
                        By placing an order you agree to our <Link to="/privacy">Privacy Policy</Link>.
                    </p>

                    <button className="btn-primary" type="submit" disabled={submitting}>
                        {submitting ? 'Placing order...' : 'Confirm Order'}
                    </button>
                </form>
            </div>
            <div className="panel">
                <h3>Order Summary</h3>
                {items.map((i) => (
                    <div className="order-line" key={i.variantId}>
                        <span>{i.title} ({i.variantLabel}) × {i.quantity}</span>
                        <span>৳{i.price * i.quantity}</span>
                    </div>
                ))}
                <div style={{ margin: '10px 0' }}>
                    <label>Coupon Code (if any)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value); if (coupon) { setCoupon(null); setCouponMsg(''); } }} placeholder="e.g. WELCOME10" maxLength={20} />
                        <button type="button" className="btn-primary" onClick={applyCoupon} disabled={couponBusy}>{couponBusy ? '...' : 'Apply'}</button>
                    </div>
                    {couponMsg && <p className={`status-msg ${coupon ? '' : 'error'}`} style={{ margin: '6px 0 0', fontSize: 14 }}>{couponMsg}</p>}
                    {coupon && <button type="button" className="link-btn" onClick={removeCoupon}>Remove coupon</button>}
                </div>
                {coupon && <div className="order-line"><span>Coupon discount ({coupon.code})</span><span>− ৳{coupon.discount}</span></div>}
                <div className="order-line"><span>Delivery charge ({form.deliveryArea === 'outside' ? 'Outside Dhaka' : 'Inside Dhaka'})</span><span>{isFree ? 'Free' : `৳${deliveryCharge}`}</span></div>
                {freeMin > 0 && !isFree && <p style={{ margin: '4px 0 0', fontSize: 14, color: '#7a5a00' }}>🚚 Add ৳{freeMin - afterDiscount} more for free delivery</p>}
                <div className="order-total"><span>Total</span><span>৳{payable}</span></div>
            </div>
        </div>
    );
}
