import { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [items, setItems] = useState([]); // { productId, variantId, title, variantLabel, price, quantity, stock }

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
