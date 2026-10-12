import { useEffect, useState } from 'react';

// পেজের নিচের দিকে গেলে ডানদিকে "উপরে ওঠার" বাটন দেখায়
export default function ScrollToTop() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const onScroll = () => setShow(window.scrollY > 400);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    if (!show) return null;
    return (
        <button className="scroll-top" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            ↑
        </button>
    );
}
