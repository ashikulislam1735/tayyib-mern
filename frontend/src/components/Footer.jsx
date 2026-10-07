import { Link } from 'react-router-dom';
import { siteConfig } from '../siteConfig';

const SOCIAL_LABELS = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    youtube: 'YouTube',
    whatsapp: 'WhatsApp',
};

function socialHref(key, value) {
    return key === 'whatsapp' ? `https://wa.me/${value}` : value;
}

export default function Footer() {
    const { name, tagline, phone, email, address, openHours, social } = siteConfig;
    const socialLinks = Object.entries(social).filter(([, value]) => value);
    const hasContact = phone || email || address || openHours;

    return (
        <footer className="site-footer">
            <div className="footer-grid">
                <div>
                    <div className="footer-brand">{name}</div>
                    <p className="footer-text">{tagline}</p>
                </div>

                <div>
                    <h4>দরকারি লিংক</h4>
                    <ul className="footer-list">
                        <li><Link to="/">শপ</Link></li>
                        <li><Link to="/about">আমাদের সম্পর্কে</Link></li>
                        <li><Link to="/track">অর্ডার ট্র্যাক</Link></li>
                    </ul>
                </div>

                {(hasContact || socialLinks.length > 0) && (
                    <div>
                        <h4>যোগাযোগ</h4>
                        <ul className="footer-list">
                            {phone && <li><a href={`tel:${phone}`}>{phone}</a></li>}
                            {email && <li><a href={`mailto:${email}`}>{email}</a></li>}
                            {address && <li>{address}</li>}
                            {openHours && <li>{openHours}</li>}
                        </ul>
                        {socialLinks.length > 0 && (
                            <div className="social-row">
                                {socialLinks.map(([key, value]) => (
                                    <a key={key} href={socialHref(key, value)} target="_blank" rel="noopener noreferrer" className="social-link">
                                        {SOCIAL_LABELS[key] || key}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="footer-bottom">
                <span>© {new Date().getFullYear()} {name}। সর্বস্বত্ব সংরক্ষিত।</span>
                <Link to="/admin" className="footer-admin">অ্যাডমিন</Link>
            </div>
        </footer>
    );
}
