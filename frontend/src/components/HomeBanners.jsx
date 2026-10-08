import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

// ভেতরের লিংক হলে Link, বাইরের (https://) হলে নতুন ট্যাবে খোলা লিংক, লিংক না থাকলে শুধু ছবি
function BannerLink({ banner, className, children }) {
    const link = banner.link || '';
    if (link.startsWith('/')) return <Link to={link} className={className}>{children}</Link>;
    if (/^https?:\/\//i.test(link)) {
        return <a href={link} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
    }
    return <div className={className}>{children}</div>;
}

function Slider({ slides }) {
    const [idx, setIdx] = useState(0);
    const [paused, setPaused] = useState(false);
    const touchX = useRef(null);
    const count = slides.length;

    const go = (i) => setIdx(((i % count) + count) % count);

    // নিজে নিজে ৫ সেকেন্ড পরপর বদলায় (মাউস ওপরে থাকলে থামে)
    useEffect(() => {
        if (count < 2 || paused) return undefined;
        const t = setInterval(() => setIdx((i) => (i + 1) % count), 5000);
        return () => clearInterval(t);
    }, [count, paused]);

    useEffect(() => { if (idx >= count) setIdx(0); }, [count, idx]);

    function onTouchStart(e) { touchX.current = e.touches[0].clientX; }
    function onTouchEnd(e) {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
    }

    return (
        <div
            className="hb-slider"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            <div className="hb-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
                {slides.map((b) => (
                    <BannerLink key={b._id} banner={b} className="hb-slide">
                        <img src={b.image} alt={b.title || 'ব্যানার'} loading="lazy" draggable="false" />
                    </BannerLink>
                ))}
            </div>
            {count > 1 && (
                <>
                    <button className="hb-arrow prev" onClick={() => go(idx - 1)} aria-label="আগেরটা">‹</button>
                    <button className="hb-arrow next" onClick={() => go(idx + 1)} aria-label="পরেরটা">›</button>
                    <div className="hb-dots">
                        {slides.map((b, i) => (
                            <button key={b._id} className={i === idx ? 'active' : ''} onClick={() => go(i)} aria-label={`ব্যানার ${i + 1}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default function HomeBanners() {
    const [banners, setBanners] = useState([]);

    useEffect(() => {
        api.getBanners().then(setBanners).catch(() => {});
    }, []);

    const slides = banners.filter((b) => b.position === 'slider');
    const side = banners.filter((b) => b.position === 'side')[0];

    if (slides.length === 0 && !side) return null;

    return (
        <div className={`home-banners ${slides.length && side ? 'two' : ''}`}>
            {slides.length > 0 && <Slider slides={slides} />}
            {side && (
                <BannerLink banner={side} className="hb-side">
                    <img src={side.image} alt={side.title || 'ব্যানার'} loading="lazy" />
                </BannerLink>
            )}
        </div>
    );
}
