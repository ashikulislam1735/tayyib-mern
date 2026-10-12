import { Link } from 'react-router-dom';

// ====== শুধু এই অংশটুকু নিজের তথ্য অনুযায়ী বদলান ======
const SHOP_NAME = 'Tayyib';
const PHONE = '01307224080';
const EMAIL = '';            // ইমেইল থাকলে এখানে লিখুন, না থাকলে খালি রাখুন
const UPDATED_AT = '10 October 2026';
// ====================================================

const SECTIONS = [
    {
        title: '1. Introduction',
        paragraphs: [
            `When you shop at ${SHOP_NAME}, you share some information with us. This page explains clearly what information we collect, why we collect it, how we keep it, and what rights you have. By using the site, you are considered to have accepted this policy.`,
        ],
    },
    {
        title: '2. What information we collect',
        paragraphs: ['We only collect what we need to deliver your order and serve you:'],
        list: [
            'When you order: your name, mobile number, delivery address, delivery area, preferred payment method, and the products you ordered.',
            'Incomplete orders: once you finish typing your mobile number on the checkout page, your number and the products in your cart are saved with us, even if you do not complete the order. The purpose is to help you if something went wrong.',
            'Order tracking: on the Track page, only the status of the order you look up by order ID or phone number is shown.',
            'In your browser: the products in your cart are kept in your own browser so that you do not lose your cart when you refresh the page.',
        ],
    },
    {
        title: '3. Why we use this information',
        list: [
            'To process your order and deliver it.',
            'To contact you by phone or WhatsApp to confirm an order or about its delivery.',
            'To contact you with help in case of an incomplete order.',
            'To detect fake or fraudulent orders. For this, we look at the earlier order history of the same phone number (for example, whether orders were cancelled or returned) in our admin panel.',
            'To keep sales and expense records and to improve the site and our service.',
        ],
    },
    {
        title: '4. Who we share information with',
        paragraphs: ['We do not sell your information. It may be shared only in the following cases, as needed:'],
        list: [
            'For delivery, your name, address and mobile number are given to the courier service.',
            'Technology providers that run the site: website hosting (Vercel, Render), database (MongoDB Atlas) and image storage (Cloudinary). Your information is stored securely on these providers\' servers.',
            'Where government authorities lawfully request it as required by law.',
        ],
    },
    {
        title: '5. Cookies and browser storage',
        paragraphs: [
            'Our site currently does not use any tracking cookies to follow you or show you ads. If we add anything like that in the future, we will say so on this page.',
        ],
    },
    {
        title: '6. Data security',
        paragraphs: [
            'We can view your information only through a password-protected admin panel, and the connection to the site is encrypted (HTTPS). However, no system on the internet is 100% secure, so although we take great care, we cannot give a full guarantee.',
        ],
    },
    {
        title: '7. How long we keep information',
        paragraphs: [
            'Order information is kept for as long as needed for accounting and legal purposes. Information about incomplete orders is deleted once we are done with it.',
        ],
    },
    {
        title: '8. Your rights',
        paragraphs: ['At any time, you may:'],
        list: [
            'Ask what information we hold about you.',
            'Ask us to correct wrong information.',
            'Ask us to delete your information (for example, the number saved from an incomplete order). We will delete everything except what we must keep for legal or accounting reasons.',
            'Ask us to stop calling or messaging you.',
        ],
    },
    {
        title: '9. Children\'s information',
        paragraphs: ['Our site is not meant for people under 18. We do not knowingly collect their information.'],
    },
    {
        title: '10. Changes to this policy',
        paragraphs: ['We may update this policy when necessary. The new version will be published on this page and the date above will change.'],
    },
];

export default function PrivacyPolicy() {
    return (
        <div className="about-page">
            <h1 className="about-title">Privacy Policy</h1>
            <p style={{ color: 'var(--walnut-soft)', margin: '0 0 22px', fontSize: '0.9rem' }}>
                Last updated: {UPDATED_AT}
            </p>

            <div className="about-body">
                {SECTIONS.map((section) => (
                    <section key={section.title} style={{ marginBottom: 24 }}>
                        <h2 style={{ fontSize: '1.15rem', margin: '0 0 8px' }}>{section.title}</h2>
                        {section.paragraphs?.map((text, i) => <p key={i}>{text}</p>)}
                        {section.list && (
                            <ul style={{ margin: '0 0 8px', paddingLeft: 22, lineHeight: 1.85, color: 'var(--walnut-soft)' }}>
                                {section.list.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        )}
                    </section>
                ))}

                <section style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: '1.15rem', margin: '0 0 8px' }}>11. Contact</h2>
                    <p>If you have any questions about this policy or your information, please contact us:</p>
                    <ul style={{ margin: 0, paddingLeft: 22, lineHeight: 1.85, color: 'var(--walnut-soft)' }}>
                        {PHONE && <li>Phone &amp; WhatsApp: <a href={`tel:${PHONE}`}>{PHONE}</a></li>}
                        {EMAIL && <li>Email: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>}
                    </ul>
                </section>
            </div>

            <Link to="/" className="about-cta">Back to Shop</Link>
        </div>
    );
}
