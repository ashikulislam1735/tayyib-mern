import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

// প্রোডাক্ট থেকে ক্যাটাগরি ও সাব-ক্যাটাগরির তালিকা নিজে নিজে বানায় (হেডারের মেনুর জন্য)
const CatalogContext = createContext({ categories: [] });

export function CatalogProvider({ children }) {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        api.getProducts().then(setProducts).catch(() => {});
    }, []);

    const categories = useMemo(() => {
        const map = new Map();
        products.forEach((p) => {
            if (!map.has(p.category)) {
                map.set(p.category, { name: p.category, icon: p.icon, subs: new Set() });
            }
            if (p.subCategory) map.get(p.category).subs.add(p.subCategory);
        });
        return [...map.values()].map((c) => ({ ...c, subs: [...c.subs] }));
    }, [products]);

    return <CatalogContext.Provider value={{ categories }}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
    return useContext(CatalogContext);
}
