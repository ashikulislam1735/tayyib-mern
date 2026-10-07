import { siteConfig } from '../siteConfig';

// পেজের নিচের ডান কোণে ভাসমান WhatsApp বাটন।
// siteConfig.js-এ whatsapp নম্বর না থাকলে এটা দেখানো হয় না।
export default function FloatingWhatsApp() {
    const number = siteConfig.social.whatsapp;
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
