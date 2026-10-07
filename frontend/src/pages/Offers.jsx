import { useEffect, useState } from 'react';
import { api } from '../api';
import ProductGrid from '../components/ProductGrid';

// ছাড়ের দাম (price) আসল দামের (originalPrice) চেয়ে কম হলেই প্রোডাক্টটা এখানে আসে।
function hasOffer(product) {
    return product.variants.some((v) => v.originalPrice && v.originalPrice > v.price);
}

export default function Offers() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.getProducts()
            .then((all) => setProducts(all.filter(hasOffer)))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className="status-msg">লোড হচ্ছে...</p>;
    if (error) return <p className="status-msg error">{error}</p>;

    return (
        <>
            <h1 className="page-title">অফার</h1>
            <p className="page-sub">যেসব প্রোডাক্টে এখন ছাড় চলছে।</p>
            {products.length === 0
                ? <p className="status-msg">এখন কোনো অফার নেই।</p>
                : <ProductGrid products={products} preferOffer />}
        </>
    );
}
