import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api';

const CartContext = createContext(null);

const STORAGE_KEY = 'tayyib_cart_v1';
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // ১৪ দিনের পুরোনো কার্ট ফেলে দেওয়া হয়

// সংরক্ষিত কার্ট পড়া — ব্রাউজারে সংরক্ষণ বন্ধ থাকলে বা তথ্য নষ্ট হলে খালি কার্ট
function loadStored() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.items) || Date.now() - Number(data.savedAt) > MAX_AGE_MS) return [];
        return data.items
            .filter((i) => i && typeof i.productId === 'string' && typeof i.variantId === 'string'
                && Number.isInteger(i.quantity) && i.quantity > 0 && Number.isFinite(i.price) && Number.isFinite(i.stock))
            .slice(0, 50);
    } catch {
        return [];
    }
}

function saveStored(items) {
    try {
        if (items.length === 0) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), items }));
    } catch {
        // ব্রাউজার সংরক্ষণ করতে না দিলে কার্ট শুধু এই ভিজিটে থাকবে — কিছু ভাঙবে না
    }
}

export function CartProvider({ children }) {
    const [items, setItems] = useState(loadStored); // { productId, variantId, title, variantLabel, price, quantity, stock }
    const initial = useRef(items);

    useEffect(() => { saveStored(items); }, [items]);

    // সংরক্ষিত কার্টের দাম/স্টক পুরোনো হতে পারে — একবার সার্ভারের সাথে মিলিয়ে নেওয়া হয়।
    // (অর্ডারের আসল দাম সার্ভার নিজেই হিসাব করে; এটা শুধু কাস্টমারকে ঠিক সংখ্যা দেখানোর জন্য।)
    useEffect(() => {
        const stored = initial.current;
        if (stored.length === 0) return undefined;
        let alive = true;
        const ids = [...new Set(stored.map((i) => i.productId))];
        Promise.all(ids.map((id) => api.getProduct(id).then((p) => [id, p]).catch((e) => [id, (e.message === 'Product not found' || e.message === 'Invalid product ID') ? null : undefined])))
            .then((pairs) => {
                if (!alive) return;
                const fresh = new Map(pairs);
                setItems((prev) => prev
                    .map((i) => {
                        const p = fresh.get(i.productId);
                        if (p === undefined) return i; // সার্ভারে পৌঁছানো যায়নি — যা আছে তাই থাক
                        if (p === null) return null; // প্রোডাক্ট আর নেই
                        const v = (p.variants || []).find((x) => x._id === i.variantId);
                        if (!v || v.stock <= 0) return null;
                        return {
                            ...i, title: p.title, icon: p.icon, variantLabel: v.label,
                            price: v.price, stock: v.stock, quantity: Math.min(i.quantity, v.stock),
                        };
                    })
                    .filter(Boolean));
            });
        return () => { alive = false; };
    }, []);

    function addToCart(product, variant) {
        setItems((prev) => {
            const existing = prev.find(
                (i) => i.productId === product._id && i.variantId === variant._id
            );
            if (existing) {
                return prev.map((i) =>
                    i === existing ? { ...i, quantity: Math.min(i.quantity + 1, variant.stock) } : i
                );
            }
            return [
                ...prev,
                {
                    productId: product._id,
                    variantId: variant._id,
                    title: product.title,
                    icon: product.icon,
                    variantLabel: variant.label,
                    price: variant.price,
                    quantity: 1,
                    stock: variant.stock,
                },
            ];
        });
    }

    function changeQty(productId, variantId, delta) {
        setItems((prev) =>
            prev
                .map((i) =>
                    i.productId === productId && i.variantId === variantId
                        ? { ...i, quantity: Math.min(Math.max(i.quantity + delta, 0), i.stock) }
                        : i
                )
                .filter((i) => i.quantity > 0)
        );
    }

    function clearCart() {
        setItems([]);
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return (
        <CartContext.Provider value={{ items, addToCart, changeQty, clearCart, subtotal }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}
