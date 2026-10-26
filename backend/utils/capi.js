import crypto from 'crypto';

const norm = (v) => String(v ?? '').trim().toLowerCase();
const sha = (v) => crypto.createHash('sha256').update(norm(v)).digest('hex');
const hashedList = (v) => (norm(v) ? [sha(v)] : undefined);

// ফোনকে দেশের কোডসহ সংখ্যায় বদলানো: 01712345678 → 8801712345678 (আগে থেকে 88 থাকলে আর জোড়া হয় না)
const fullPhone = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  return d.startsWith('88') ? d : '88' + d;
};

// Facebook এর advanced matching ফরম্যাটে ইউজারের তথ্য (ফোন, নাম, শহর, দেশ, আইডি হ্যাশ করা; আইপি/ব্রাউজার/কুকি হ্যাশ ছাড়া)
function userData({ phone, name, district, ip, ua, fbp, fbc }) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const city = String(district || '').toLowerCase().replace(/[\s\-.,]/g, '');
  return {
    ph: fullPhone(phone) ? [sha(fullPhone(phone))] : undefined,
    fn: hashedList(parts[0]),
    ln: hashedList(parts.slice(1).join(' ')),
    ct: hashedList(city),
    country: [sha('bd')],
    external_id: hashedList(fullPhone(phone)),
    client_ip_address: ip,
    client_user_agent: ua,
    fbp,
    fbc,
  };
}

// Facebook Conversions API তে একটি ইভেন্ট পাঠায়। .env এ FB_PIXEL_ID ও FB_CAPI_TOKEN না থাকলে কিছু করে না।
async function sendEvent({ name, eventId, user, sourceUrl, custom }) {
  const { FB_PIXEL_ID: id, FB_CAPI_TOKEN: token, FB_TEST_EVENT_CODE: test } = process.env;
  if (!id || !token) return;
  const body = {
    data: [
      {
        event_name: name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId, // ব্রাউজারের Pixel ইভেন্টের সাথে ডুপ্লিকেট এড়াতে একই আইডি
        action_source: 'website',
        event_source_url: sourceUrl,
        user_data: userData(user),
        custom_data: custom,
      },
    ],
  };
  if (test) body.test_event_code = test;
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${id}/events?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) console.error(`CAPI ${name} ব্যর্থ:`, await r.text());
  } catch (e) {
    console.error(`CAPI ${name} ব্যর্থ:`, e.message);
  }
}

// অর্ডার হলে Purchase। eventId = অর্ডারের _id, ব্রাউজারের Pixel Purchase এও একই আইডি যায়।
function sendPurchase({ order, ip, ua, fbp, fbc, sourceUrl }) {
  return sendEvent({
    name: 'Purchase',
    eventId: String(order._id),
    user: { phone: order.phone, name: order.customerName, ip, ua, fbp, fbc },
    sourceUrl,
    custom: {
      currency: 'BDT',
      value: order.total,
      content_type: 'product',
      content_ids: [...new Set(order.items.map((i) => String(i.productId)))],
      contents: order.items.map((i) => ({ id: String(i.productId), quantity: i.quantity, item_price: i.price })),
      num_items: order.items.reduce((s, i) => s + i.quantity, 0),
    },
  });
}

// নতুন লিড (নম্বর দিয়ে অর্ডার শুরু করে ছেড়ে দিলে) হলে Lead
function sendLead({ eventId, phone, name, district, contents, value, ip, ua, fbp, fbc, sourceUrl }) {
  return sendEvent({
    name: 'Lead',
    eventId,
    user: { phone, name, district, ip, ua, fbp, fbc },
    sourceUrl,
    custom: {
      currency: 'BDT',
      value,
      content_type: 'product',
      content_ids: [...new Set(contents.map((c) => c.id))],
      contents,
      num_items: contents.reduce((s, c) => s + c.quantity, 0),
    },
  });
}

export { sendPurchase, sendLead };
