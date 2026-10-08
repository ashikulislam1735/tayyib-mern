import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

// প্রোডাক্ট থেকে ক্যাটাগরি ও সাব-ক্যাটাগরির তালিকা নিজে নিজে বানায় (হেডারের মেনুর জন্য)
// অ্যাডমিন থেকে আপলোড করা ক্যাটাগরির ছবিও এখানে জোড়া লাগে (না থাকলে ইমোজি আইকন)
const CatalogContext = createContext({ categories: [], reloadImages: async () => {} });

export function CatalogProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [images, setImages] = useState({});

    const reloadImages = useCallback(async () => {
        try {
            const list = await api.getCategoryImages();
            setImages(Object.fromEntries(list.map((c) => [c.name, c.image])));
        } catch {
            // ছবি না এলে ইমোজি আইকনই দেখাবে
        }
    }, []);

    useEffect(() => {
        api.getProducts().then(setProducts).catch(() => {});
        reloadImages();
    }, [reloadImages]);

    const categories = useMemo(() => {
        const map = new Map();
        products.forEach((p) => {
            if (!map.has(p.category)) {
                map.set(p.category, { name: p.category, icon: p.icon, subs: new Set(), count: 0 });
            }
            map.get(p.category).count += 1;
            if (p.subCategory) map.get(p.category).subs.add(p.subCategory);
        });
        return [...map.values()].map((c) => ({ ...c, subs: [...c.subs], image: images[c.name] || '' }));
    }, [products, images]);

    return <CatalogContext.Provider value={{ categories, reloadImages }}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
    return useContext(CatalogContext);
}
