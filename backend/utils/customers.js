import { riskLevel } from './risk.js';

// অর্ডারের তালিকা থেকে ফোন নম্বর ধরে কাস্টমারের সারাংশ বানায় (CRM)
// orders: plain object-এর তালিকা (phone, customerName, status, total, createdAt সহ)
export const cleanPhone = (p) => String(p || '').replace(/\s+/g, '');

export function buildCustomers(orders) {
    const map = new Map();
    for (const o of orders) {
        const phone = cleanPhone(o.phone);
        if (!phone) continue;
        const at = new Date(o.createdAt).getTime() || 0;
        let c = map.get(phone);
        if (!c) {
            c = { phone, name: o.customerName || '', totalOrders: 0, delivered: 0, cancelled: 0, active: 0, totalSpent: 0, firstOrderAt: at, lastOrderAt: at, _nameAt: at };
            map.set(phone, c);
        }
        c.totalOrders += 1;
        if (o.status === 'delivered') c.delivered += 1;
        else if (o.status === 'cancelled') c.cancelled += 1;
        else c.active += 1;
        if (o.status !== 'cancelled') c.totalSpent += Number(o.total) || 0; // বাতিল বাদে
        if (at < c.firstOrderAt) c.firstOrderAt = at;
        if (at >= c.lastOrderAt) c.lastOrderAt = at;
        if (at >= c._nameAt && o.customerName) { c.name = o.customerName; c._nameAt = at; } // সবচেয়ে নতুন নাম
    }
    return [...map.values()]
        .map(({ _nameAt, ...c }) => ({
            ...c,
            firstOrderAt: new Date(c.firstOrderAt).toISOString(),
            lastOrderAt: new Date(c.lastOrderAt).toISOString(),
            risk: riskLevel(c.delivered, c.cancelled),
        }))
        .sort((a, b) => (a.lastOrderAt < b.lastOrderAt ? 1 : -1));
}
