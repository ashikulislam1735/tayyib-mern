// Facebook Pixel থাকলে ইভেন্ট পাঠায়, না থাকলে কিছু করে না
export const track = (event, data, eventID) => {
  if (typeof window === 'undefined') return;
  if (window.fbq) window.fbq('track', event, data, eventID ? { eventID } : undefined);
  // TikTok Pixel (ইভেন্টের নাম TikTok এর নামে বদলে)
  if (window.ttq) {
    const tt = { Purchase: 'CompletePayment', Lead: 'SubmitForm' }[event] || event;
    try { window.ttq.track(tt, { contents: data?.contents?.map((c) => ({ content_id: c.id, quantity: c.quantity, price: c.item_price })), content_type: 'product', value: data?.value, currency: data?.currency }); } catch {}
  }
  // GA4 (ব্রাউজার): Purchase সার্ভার থেকে যায়, তাই এখানে বাদ
  if (window.gtag) {
    const ga = { ViewContent: 'view_item', AddToCart: 'add_to_cart', InitiateCheckout: 'begin_checkout' }[event];
    if (ga) window.gtag('event', ga, { currency: data?.currency || 'BDT', value: data?.value, items: data?.contents ? data.contents.map((c) => ({ item_id: c.id, quantity: c.quantity, price: c.item_price })) : (data?.content_ids || []).map((id) => ({ item_id: id, item_name: data?.content_name, price: data?.value, quantity: 1 })) });
  }
};

// কার্টের আইটেম থেকে Pixel এর content_ids, contents, value, num_items বানায়
export const cartData = (items = []) => ({
  content_type: 'product',
  content_ids: [...new Set(items.map((i) => i.productId))],
  contents: items.map((i) => ({ id: i.productId, quantity: i.quantity, item_price: i.price })),
  num_items: items.reduce((s, i) => s + i.quantity, 0),
  value: items.reduce((s, i) => s + i.price * i.quantity, 0),
  currency: 'BDT',
});

export const getCookie = (name) => {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
};

// GA4 এর _ga কুকি থেকে client_id (সার্ভার-সাইড Purchase কে ব্রাউজারের সাথে মেলানোর জন্য)
export const gaClientId = () => getCookie('_ga');

// GA4 এর _ga_XXXX কুকি থেকে session_id (সার্ভার-সাইড Purchase কে সঠিক সোর্সের সাথে মেলানোর জন্য)
// কুকির দুই রকম ফরম্যাট হয়: GS1.1.<session_id>.… অথবা GS2.1.s<session_id>$o…
export const gaSessionId = () => {
  const id = import.meta.env.VITE_GA4_ID;
  if (!id) return undefined;
  const v = getCookie('_ga_' + id.replace(/^G-/, ''));
  if (!v) return undefined;
  const m = v.match(/^GS1\.\d+\.(\d+)/) || v.match(/^GS2\.\d+\.s(\d+)/);
  return m ? m[1] : undefined;
};
