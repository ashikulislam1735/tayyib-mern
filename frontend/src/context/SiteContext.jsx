import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { siteConfig as defaults } from '../siteConfig';

// সাইটের তথ্য: siteConfig.js হলো ডিফল্ট; অ্যাডমিন থেকে সেভ করা মান থাকলে সেটা ওপরে বসে।
// সার্ভার ঘুমিয়ে থাকলে বা ব্যর্থ হলে ডিফল্ট দিয়েই সাইট চলে।
const SiteContext = createContext({ site: defaults, setSite: () => {} });

export function mergeSite(saved) {
    if (!saved || typeof saved !== 'object' || !('name' in saved)) return defaults;
    return {
        ...defaults,
        ...saved,
        social: { ...defaults.social, ...(saved.social || {}) },
        about: { ...defaults.about, ...(saved.about || {}) },
    };
}

export function SiteProvider({ children }) {
    const [site, setSiteState] = useState(defaults);

    useEffect(() => {
        api.getSettings().then((s) => setSiteState(mergeSite(s))).catch(() => {});
    }, []);

    useEffect(() => {
        document.title = site.tagline ? `${site.name} — ${site.tagline}` : site.name;
    }, [site.name, site.tagline]);

    // অ্যাডমিন সেভ করার পর সাথে সাথে সাইটে বদল দেখাতে
    const setSite = (saved) => setSiteState(mergeSite(saved));

    return <SiteContext.Provider value={{ site, setSite }}>{children}</SiteContext.Provider>;
}

export function useSite() {
    return useContext(SiteContext);
}
