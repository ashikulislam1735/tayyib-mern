import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import { useSite } from '../context/SiteContext';

// প্রতিটা পেজের জন্য ট্যাবের টাইটেল, বর্ণনা, শেয়ারের ট্যাগ (og:*) ও গুগলের জন্য প্রোডাক্টের তথ্য বসায়।
// নোট: এটা ব্রাউজারে চলে। গুগল এটা পড়ে নেয়; কিন্তু Facebook/WhatsApp লিংক-প্রিভিউ জাভাস্ক্রিপ্ট চালায় না,
// তাই সেখানে index.html-এর সাধারণ ট্যাগই দেখায়।

const PAGE_TITLES = {
    '/offers': 'অফার',
    '/about': 'আমাদের সম্পর্কে',
    '/privacy': 'গোপনীয়তা নীতি',
    '/categories': 'ক্যাটাগরি',
    '/track': 'অর্ডার ট্র্যাক',
    '/checkout': 'চেকআউট',
};
// এই পেজগুলো গুগলে আসার দরকার নেই
const NOINDEX = ['/admin', '/checkout', '/order-confirmed', '/track'];
const productCache = new Map();

function setMeta(attr, key, content) {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!content) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.setAttribute('content', content);
}

function setCanonical(href) {
    let el = document.head.querySelector('link[rel="canonical"]');
    if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el); }
    el.setAttribute('href', href);
}

function setJsonLd(data) {
    let el = document.getElementById('seo-jsonld');
    if (!data) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('script'); el.id = 'seo-jsonld'; el.type = 'application/ld+json'; document.head.appendChild(el); }
    el.textContent = JSON.stringify(data);
}

const clean = (text, max = 160) => {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

export default function RouteSeo() {
    const { pathname, search } = useLocation();
    const { site } = useSite();
    const [product, setProduct] = useState(null);

    const productId = (pathname.match(/^\/product\/([a-f0-9]{24})$/i) || [])[1];

    useEffect(() => {
        if (!productId) return undefined;
        if (productCache.has(productId)) { setProduct(productCache.get(productId)); return undefined; }
        let alive = true;
        api.getProduct(productId)
            .then((p) => { productCache.set(productId, p); if (alive) setProduct(p); })
            .catch(() => {});
        return () => { alive = false; };
    }, [productId]);

    // আগের প্রোডাক্টের তথ্য নতুন পেজে যেন না দেখায়
    const current = productId && product && product._id === productId ? product : null;

    useEffect(() => {
        // SiteContext নিজেও টাইটেল বসায় (সে আগে চলে), তাই এক ধাপ পরে আমরা চালাই যাতে আমাদেরটাই টিকে থাকে
        const timer = setTimeout(() => {
            const siteName = site.name || 'Tayyib';
            const params = new URLSearchParams(search);
            const q = (params.get('q') || '').trim();
            const category = params.get('category') || (pathname.startsWith('/category/') ? decodeURIComponent(pathname.slice('/category/'.length)) : '');
            const defaultDesc = `${siteName}${site.tagline ? ` — ${site.tagline}` : ''}। ঘরে বসে অর্ডার করুন, ঢাকার ভেতরে ও বাইরে ডেলিভারি।`;

            let title = site.tagline ? `${siteName} — ${site.tagline}` : siteName;
            let description = defaultDesc;
            let image = site.logo || '';
            let ogType = 'website';
            let jsonLd = null;

            if (current) {
                title = `${current.title} — ${siteName}`;
                description = clean(current.shortDescription || current.description) || defaultDesc;
                image = (current.images && current.images[0]) || image;
                ogType = 'product';

                const prices = (current.variants || []).map((v) => v.price).filter((n) => Number.isFinite(n));
                const inStock = (current.variants || []).some((v) => v.stock > 0);
                jsonLd = {
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    name: current.title,
                    description,
                    ...(image ? { image: [image] } : {}),
                    category: current.category,
                    ...(prices.length ? {
                        offers: {
                            '@type': 'Offer',
                            priceCurrency: 'BDT',
                            price: Math.min(...prices),
                            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                            url: `${window.location.origin}${pathname}`,
                        },
                    } : {}),
                    ...(current.ratingCount > 0 ? {
                        aggregateRating: { '@type': 'AggregateRating', ratingValue: current.ratingAvg, reviewCount: current.ratingCount },
                    } : {}),
                };
            } else if (productId) {
                // প্রোডাক্ট এখনো লোড হচ্ছে — টাইটেল আপাতত সাইটের নামই থাকুক
                title = siteName;
            } else if (q) {
                title = `"${q}" — সার্চ — ${siteName}`;
            } else if (category) {
                title = `${category} — ${siteName}`;
                description = `${category} — ${siteName} থেকে অর্ডার করুন।`;
            } else if (PAGE_TITLES[pathname]) {
                title = `${PAGE_TITLES[pathname]} — ${siteName}`;
            }

            document.title = title;
            setMeta('name', 'description', description);
            setMeta('property', 'og:title', title);
            setMeta('property', 'og:description', description);
            setMeta('property', 'og:type', ogType);
            setMeta('property', 'og:site_name', siteName);
            setMeta('property', 'og:url', `${window.location.origin}${pathname}`);
            setMeta('property', 'og:image', image);
            setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
            setCanonical(`${window.location.origin}${pathname}`);
            setJsonLd(jsonLd);

            const hidden = NOINDEX.some((p) => pathname.startsWith(p)) || Boolean(q);
            setMeta('name', 'robots', hidden ? 'noindex, nofollow' : '');
        }, 0);
        return () => clearTimeout(timer);
    }, [pathname, search, site, current, productId]);

    return null;
}
