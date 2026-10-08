import { useSite } from '../context/SiteContext';

// পেজের নিচের ডান কোণে ভাসমান WhatsApp বাটন।
// সাইট সেটিংসে whatsapp নম্বর না থাকলে এটা দেখানো হয় না।
export default function FloatingWhatsApp() {
    const { site } = useSite();
    const number = site.social.whatsapp;
    if (!number) return null;

    return (
        <a
            className="wa-float"
            href={`https://wa.me/${number}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp-এ মেসেজ করুন"
        >
            💬 <span>WhatsApp</span>
        </a>
    );
}
