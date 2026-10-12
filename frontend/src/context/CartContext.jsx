import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);

// কার্ট ব্রাউজারে সেভ থাকে, তাই পেজ রিফ্রেশ বা ফেসবুক অ্যাপ থেকে ফিরে এলেও হারায় না।
// (ব্রাউজার সেভ করতে না দিলেও সাইট আগের মতোই চলে)
const CART_KEY = 'tayyib_cart_v1';

function loadCart() {
    try {
        const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        if (!Array.isArray(raw)) return [];
        return raw
            .filter((i) => i && i.productId && i.variantId && Number(i.quantity) > 0 && Number(i.price) >= 0)
            .slice(0, 50);
    } catch {
        return [];
    }
}

export function CartProvider({ children }) {
    const [items, setItems] = useState(loadCart); // { productId, variantId, title, variantLabel, price, quantity, stock }

    useEffect(() => {
        try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* সেভ না হলেও সমস্যা নেই */ }
    }, [items]);

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
