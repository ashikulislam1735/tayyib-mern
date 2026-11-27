import { useEffect, useState } from 'react';
import { useSite } from '../context/SiteContext';
import { track } from '../lib/track';

// পেজের নিচের ডান কোণে ভাসমান WhatsApp বাটন।
// সাইট সেটিংসে whatsapp নম্বর না থাকলে এটা দেখানো হয় না।
// ফুটার স্ক্রিনে এলে বাটনটা লুকিয়ে যায় — নইলে ফুটারের "Have a question?"
// অংশের বাটনগুলোর উপর বসে থাকত।
export default function FloatingWhatsApp() {
    const { site } = useSite();
    const [footerVisible, setFooterVisible] = useState(false);

    useEffect(() => {
        const footer = document.querySelector('.site-footer');
        if (!footer || !('IntersectionObserver' in window)) return undefined;
        const observer = new IntersectionObserver(
            ([entry]) => setFooterVisible(entry.isIntersecting),
            { threshold: 0 }
        );
        observer.observe(footer);
        return () => observer.disconnect();
    }, []);

    const number = site.social.whatsapp;
    if (!number || footerVisible) return null;

    return (
        <a
            className="wa-float"
            href={`https://wa.me/${number}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('Contact', { content_name: 'whatsapp' })}
            aria-label="Message us on WhatsApp"
        >
            💬 <span>WhatsApp</span>
        </a>
    );
}
