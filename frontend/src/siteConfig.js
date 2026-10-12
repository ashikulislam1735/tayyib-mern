// সাইটের সাধারণ তথ্য — এই ফাইলে বদলালেই হেডার, ফুটার ও About পেজে বদলে যাবে।
// যে ঘরে '' (খালি) থাকবে, সেটা সাইটে দেখানো হবে না।
// (পরের ধাপে এই তথ্য অ্যাডমিন প্যানেল থেকে বদলানোর ব্যবস্থা করব।)

export const siteConfig = {
    name: 'Tayyib',
    tagline: 'Pure food, delivered online',
    logo: '',               // অ্যাডমিন সেটিংস থেকে আপলোড করা লোগোর লিংক
    deliveryInside: 60,     // ঢাকার ভেতরে ডেলিভারি চার্জ (৳) — অ্যাডমিন সেটিংস থেকে বদলানো যায়
    deliveryOutside: 120,   // ঢাকার বাইরে ডেলিভারি চার্জ (৳)
    freeDeliveryMin: 0,     // এই টাকা বা তার বেশি কিনলে ডেলিভারি ফ্রি (০ = অফার বন্ধ) — অ্যাডমিন সেটিংস থেকে বদলানো যায়
    bkashNumber: '',        // bKash পেমেন্ট নম্বর — খালি থাকলে চেকআউটে bKash অপশন আসবে না
    nagadNumber: '',        // Nagad পেমেন্ট নম্বর — খালি থাকলে চেকআউটে Nagad অপশন আসবে না

    phone: '01307224080',   // হেডারের "কল" বাটন ও ফুটারে দেখাবে
    email: '',              // যেমন: 'hello@example.com'
    address: '',            // যেমন: 'ঢাকা, বাংলাদেশ'
    openHours: '',          // যেমন: 'প্রতিদিন সকাল ১০টা – রাত ৯টা'

    social: {
        facebook: '',       // পুরো লিংক, যেমন: 'https://facebook.com/yourpage'
        instagram: '',
        youtube: '',
        whatsapp: '8801307224080',   // শুধু নম্বর, দেশের কোডসহ — ভাসমান WhatsApp বাটনও এটা ব্যবহার করে
    },

    about: {
        title: 'About Us',
        paragraphs: [
            'Tayyib is an online shop where you can easily order pure foods such as honey, dates and ghee.',
            'We want you to see every product\'s price, size and stock clearly before you order, so there are no surprises.',
            'After placing an order, you can check its status at any time using your mobile number.',
        ],
        highlights: [
            { title: 'Clear pricing', text: 'Each size shows its own price and any discount upfront.' },
            { title: 'Easy ordering', text: 'Add to cart and finish checkout on a single page.' },
            { title: 'Order tracking', text: 'Check the current status of your order with your mobile number.' },
        ],
    },
};
