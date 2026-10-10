import { Link } from 'react-router-dom';
import { useSite } from '../context/SiteContext';

function socialHref(key, value) {
    return key === 'whatsapp' ? `https://wa.me/${value}` : value;
}

const svgProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

const ICONS = {
    phone: <svg {...svgProps}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>,
    mail: <svg {...svgProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
    pin: <svg {...svgProps}><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>,
    clock: <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
    facebook: <svg {...svgProps}><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" /></svg>,
    instagram: <svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" /></svg>,
    youtube: <svg {...svgProps}><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor" /></svg>,
    whatsapp: <svg {...svgProps}><path d="M3 21l1.6-4.8A8.5 8.5 0 1 1 8 19.6L3 21z" /><path d="M9 9c0 3 3 6 6 6l1.5-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2L9 9z" /></svg>,
};

export default function Footer() {
    const { site } = useSite();
    const { name, tagline, logo, phone, email, address, openHours, social } = site;
    const socialLinks = Object.entries(social).filter(([, value]) => value);
    const hasContact = phone || email || address || openHours;
    const waNumber = social.whatsapp;

    return (
        <footer className="site-footer">
            {(phone || waNumber) && (
                <div className="footer-cta">
                    <div className="footer-cta-inner">
                        <div>
                            <strong>কিছু জানার আছে?</strong>
                            <p>অর্ডার, পণ্য বা ডেলিভারি — যেকোনো প্রশ্নে সরাসরি কথা বলুন</p>
                        </div>
                        <div className="footer-cta-btns">
                            {phone && <a className="fcta-solid" href={`tel:${phone}`}>{ICONS.phone} {phone}</a>}
                            {waNumber && <a className="fcta-line" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">{ICONS.whatsapp} WhatsApp</a>}
                        </div>
                    </div>
                </div>
            )}

            <div className="footer-grid">
                <div className="footer-about">
                    {logo ? <img src={logo} alt={name} className="footer-logo" /> : <div className="footer-brand">{name}</div>}
                    {tagline && <p className="footer-text">{tagline}</p>}
                    {socialLinks.length > 0 && (
                        <div className="social-row">
                            {socialLinks.map(([key, value]) => (
                                <a key={key} href={socialHref(key, value)} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label={key} title={key}>
                                    {ICONS[key] || key}
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h4>দ্রুত লিংক</h4>
                    <ul className="footer-list">
                        <li><Link to="/products">সব প্রোডাক্ট</Link></li>
                        <li><Link to="/categories">ক্যাটাগরি</Link></li>
                        <li><Link to="/offers">অফার</Link></li>
                    </ul>
                </div>

                <div>
                    <h4>তথ্য</h4>
                    <ul className="footer-list">
                        <li><Link to="/about">আমাদের সম্পর্কে</Link></li>
                        <li><Link to="/privacy">গোপনীয়তা নীতি</Link></li>
                    </ul>
                </div>

                <div>
                    <h4>সাহায্য</h4>
                    <ul className="footer-list">
                        <li><Link to="/track">অর্ডার ট্র্যাক</Link></li>
                        {waNumber && <li><a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">WhatsApp-এ জিজ্ঞাসা</a></li>}
                    </ul>
                </div>

                {hasContact && (
                    <div>
                        <h4>যোগাযোগ</h4>
                        <ul className="footer-list footer-contact">
                            {phone && <li>{ICONS.phone}<a href={`tel:${phone}`}><strong>{phone}</strong></a></li>}
                            {email && <li>{ICONS.mail}<a href={`mailto:${email}`}>{email}</a></li>}
                            {address && <li>{ICONS.pin}<span>{address}</span></li>}
                            {openHours && <li>{ICONS.clock}<span>{openHours}</span></li>}
                        </ul>
                    </div>
                )}
            </div>

            <div className="footer-bottom">
                <span>© {new Date().getFullYear()} {name}। সর্বস্বত্ব সংরক্ষিত।</span>
            </div>
        </footer>
    );
}
