import { createPortal } from 'react-dom';
import { useSite } from '../context/SiteContext';

const PAYMENT_LABEL = { cod: 'ক্যাশ অন ডেলিভারি', bkash: 'bKash', nagad: 'Nagad' };
const STATUS_LABEL = { pending: 'অর্ডার সম্পন্ন হয়েছে', confirmed: 'কনফার্ম হয়েছে', delivered: 'ডেলিভারি সম্পন্ন', cancelled: 'বাতিল', returned: 'ফেরত এসেছে' };
const money = (v) => `৳${Number(v || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;

// ইনভয়েস দেখানো ও প্রিন্ট/PDF — "প্রিন্ট / PDF সেভ" চাপলে ব্রাউজারের প্রিন্ট খোলে,
// সেখানে "Save as PDF" বেছে নিলেই PDF হয়ে যায়। বাইরের কোনো প্যাকেজ লাগে না।
export default function Invoice({ order, onClose }) {
    const { site } = useSite();
    const items = order.items || [];
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const invoiceNo = `#${String(order._id).slice(-6).toUpperCase()}`;
    const date = new Date(order.createdAt).toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'long', day: 'numeric' });

    return createPortal(
        <div className="invoice-overlay">
            <div className="invoice-actions">
                <button className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }} onClick={() => window.print()}>🖨️ প্রিন্ট / PDF সেভ</button>
                <button className="link-btn" style={{ color: '#fff' }} onClick={onClose}>বন্ধ করুন ✕</button>
            </div>

            <div className="invoice-sheet">
                <div className="invoice-head">
                    <div>
                        {site.logo && <img src={site.logo} alt="" className="invoice-logo" />}
                        <h2 style={{ margin: '4px 0' }}>{site.name}</h2>
                        {site.address && <div>{site.address}</div>}
                        {site.phone && <div>ফোন: {site.phone}</div>}
                        {site.email && <div>{site.email}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ margin: '4px 0' }}>ইনভয়েস</h2>
                        <div>নম্বর: <strong>{invoiceNo}</strong></div>
                        <div>তারিখ: {date}</div>
                        <div>অবস্থা: {STATUS_LABEL[order.status] || order.status}</div>
                    </div>
                </div>

                <div className="invoice-block">
                    <strong>কাস্টমার</strong>
                    <div>{order.customerName}</div>
                    <div>ফোন: {order.phone}</div>
                    <div>ঠিকানা: {order.address}</div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="invoice-table">
                        <thead>
                            <tr><th>পণ্য</th><th>দাম</th><th>পরিমাণ</th><th style={{ textAlign: 'right' }}>মোট</th></tr>
                        </thead>
                        <tbody>
                            {items.map((i, idx) => (
                                <tr key={idx}>
                                    <td>{i.title} ({i.variantLabel})</td>
                                    <td>{money(i.price)}</td>
                                    <td>{i.quantity}</td>
                                    <td style={{ textAlign: 'right' }}>{money(i.price * i.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="invoice-totals">
                    <div><span>পণ্যের মোট</span><span>{money(subtotal)}</span></div>
                    {order.discount > 0 && <div><span>কুপন ছাড়{order.couponCode ? ` (${order.couponCode})` : ''}</span><span>− {money(order.discount)}</span></div>}
                    <div><span>ডেলিভারি চার্জ ({order.deliveryArea === 'outside' ? 'ঢাকার বাইরে' : 'ঢাকার ভেতরে'})</span><span>{money(order.deliveryCharge)}</span></div>
                    <div className="invoice-grand"><span>সর্বমোট</span><span>{money(order.total)}</span></div>
                </div>

                <div className="invoice-block">
                    <strong>পেমেন্ট:</strong> {PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod || 'ক্যাশ অন ডেলিভারি'}
                    {order.paymentTrxId ? ` (TrxID: ${order.paymentTrxId})` : ''}
                    {order.paymentMethod === 'cod' || !order.paymentMethod ? ` — ডেলিভারির সময় ${money(order.total)} দিতে হবে` : ''}
                </div>

                <p className="invoice-thanks">আমাদের থেকে কেনাকাটার জন্য ধন্যবাদ।</p>
            </div>
        </div>,
        document.body,
    );
}
