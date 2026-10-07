import { Link } from 'react-router-dom';
import { siteConfig } from '../siteConfig';

export default function About() {
    const { title, paragraphs, highlights } = siteConfig.about;

    return (
        <div className="about-page">
            <h1 className="about-title">{title}</h1>
            <div className="about-body">
                {paragraphs.map((text, i) => (
                    <p key={i}>{text}</p>
                ))}
            </div>

            <div className="about-highlights">
                {highlights.map((item) => (
                    <div key={item.title} className="panel about-card">
                        <h3>{item.title}</h3>
                        <p>{item.text}</p>
                    </div>
                ))}
            </div>

            <Link to="/" className="about-cta">প্রোডাক্ট দেখুন</Link>
        </div>
    );
}
