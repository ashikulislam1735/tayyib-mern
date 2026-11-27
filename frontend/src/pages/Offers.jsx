import { useEffect, useState } from 'react';
import { api } from '../api';
import ProductGrid from '../components/ProductGrid';
import { ProductGridSkeleton } from '../components/Skeleton';

// ছাড়ের দাম (price) আসল দামের (originalPrice) চেয়ে কম হলেই প্রোডাক্টটা এখানে আসে।
function hasOffer(product) {
    return product.variants.some((v) => v.originalPrice && v.originalPrice > v.price);
}

export default function Offers() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // পেজ ধরে আনা — আগের মতো সব প্রোডাক্ট একসাথে (সর্বোচ্চ ১০০০টি) টানা নয়
        api.getProductsPage({ page: 1, limit: 100 })
            .then((r) => setProducts(r.items.filter(hasOffer)))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <>
                <h1 className="page-title">Offers</h1>
                <p className="page-sub">Products that are on discount right now.</p>
                <ProductGridSkeleton count={4} />
            </>
        );
    }
    if (error) return <p className="status-msg error">{error}</p>;

    return (
        <>
            <h1 className="page-title">Offers</h1>
            <p className="page-sub">Products that are on discount right now.</p>
            {products.length === 0
                ? <p className="status-msg">There are no offers right now.</p>
                : <ProductGrid products={products} preferOffer />}
        </>
    );
}
