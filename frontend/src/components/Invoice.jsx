import { createPortal } from 'react-dom';
import { useSite } from '../context/SiteContext';

const PAYMENT_LABEL = { cod: 'Cash on Delivery', bkash: 'bKash', nagad: 'Nagad' };
const STATUS_LABEL = { pending: 'Order placed', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned' };
const money = (v) => `৳${Number(v || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;

// ইনভয়েস দেখানো ও প্রিন্ট/PDF — "প্রিন্ট / PDF সেভ" চাপলে ব্রাউজারের প্রিন্ট খোলে,
// সেখানে "Save as PDF" বেছে নিলেই PDF হয়ে যায়। বাইরের কোনো প্যাকেজ লাগে না।
export default function Invoice({ order, onClose }) {
    const { site } = useSite();
    const items = order.items || [];
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const invoiceNo = `#${String(order._id).slice(-6).toUpperCase()}`;
    const date = new Date(order.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'long', day: 'numeric' });

    return createPortal(
        <div className="invoice-overlay">
            <div className="invoice-actions">
                <button className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }} onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
                <button className="link-btn" style={{ color: '#fff' }} onClick={onClose}>Close ✕</button>
            </div>

            <div className="invoice-sheet">
                <div className="invoice-head">
                    <div>
                        {site.logo && <img src={site.logo} alt="" className="invoice-logo" />}
                        <h2 style={{ margin: '4px 0' }}>{site.name}</h2>
                        {site.address && <div>{site.address}</div>}
                        {site.phone && <div>Phone: {site.phone}</div>}
                        {site.email && <div>{site.email}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ margin: '4px 0' }}>Invoice</h2>
                        <div>No: <strong>{invoiceNo}</strong></div>
                        <div>Date: {date}</div>
                        <div>Status: {STATUS_LABEL[order.status] || order.status}</div>
                    </div>
                </div>

                <div className="invoice-block">
                    <strong>Customer</strong>
                    <div>{order.customerName}</div>
                    <div>Phone: {order.phone}</div>
                    <div>Address: {order.address}</div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="invoice-table">
                        <thead>
                            <tr><th>Item</th><th>Price</th><th>Qty</th><th style={{ textAlign: 'right' }}>Total</th></tr>
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
                    <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
                    {order.discount > 0 && <div><span>Coupon discount{order.couponCode ? ` (${order.couponCode})` : ''}</span><span>− {money(order.discount)}</span></div>}
                    <div><span>Delivery charge ({order.deliveryArea === 'outside' ? 'Outside Dhaka' : 'Inside Dhaka'})</span><span>{money(order.deliveryCharge)}</span></div>
                    <div className="invoice-grand"><span>Grand total</span><span>{money(order.total)}</span></div>
                </div>

                <div className="invoice-block">
                    <strong>Payment:</strong> {PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod || 'Cash on Delivery'}
                    {order.paymentTrxId ? ` (TrxID: ${order.paymentTrxId})` : ''}
                    {order.paymentMethod === 'cod' || !order.paymentMethod ? ` — ${money(order.total)} due on delivery` : ''}
                </div>

                <p className="invoice-thanks">Thank you for shopping with us.</p>
            </div>
        </div>,
        document.body,
    );
}
