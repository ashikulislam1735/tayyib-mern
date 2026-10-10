// ⭐ স্টার দেখানোর ছোট কম্পোনেন্ট (value: ০–৫, দশমিকও চলবে)
export default function Stars({ value = 0, size = 16 }) {
    const pct = Math.max(0, Math.min(5, value)) / 5 * 100;
    return (
        <span className="stars" style={{ fontSize: size }} role="img" aria-label={`৫-এর মধ্যে ${value}`}>
            <span className="stars-bg">★★★★★</span>
            <span className="stars-fg" style={{ width: `${pct}%` }}>★★★★★</span>
        </span>
    );
}
