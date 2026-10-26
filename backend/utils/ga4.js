// GA4 Measurement Protocol: সার্ভার থেকে Purchase ইভেন্ট পাঠায়।
// .env এ GA4_MEASUREMENT_ID (G-XXXX) ও GA4_API_SECRET না থাকলে কিছু করে না।

// ব্রাউজারের _ga কুকি (GA1.1.123.456) থেকে client_id (123.456) বের করে
function clientIdFrom(cookieValue, fallbackSeed) {
  const parts = String(cookieValue || '').split('.');
  if (parts.length >= 4) return parts.slice(-2).join('.');
  // কুকি না থাকলে (অ্যাড-ব্লকার ইত্যাদি) অর্ডার নম্বর থেকে একটা স্থির আইডি
  return `${Math.abs(hash(fallbackSeed))}.${Math.floor(Date.now() / 1000)}`;
}

function hash(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

async function sendPurchase({ order, gaClientId, gaSessionId }) {
  const { GA4_MEASUREMENT_ID: id, GA4_API_SECRET: secret } = process.env;
  if (!id || !secret) return;
  const body = {
    client_id: clientIdFrom(gaClientId, String(order._id)),
    events: [
      {
        name: 'purchase',
        params: {
          // সেশন আইডি থাকলে GA4 Purchase কে ঠিক ট্রাফিক সোর্সের সাথে মেলায়
          ...(gaSessionId ? { session_id: gaSessionId } : {}),
          engagement_time_msec: 1,
          transaction_id: String(order._id), // একই আইডি দিয়ে ডুপ্লিকেট এড়ানো যায়
          currency: 'BDT',
          value: order.total,
          shipping: order.deliveryCharge || 0,
          ...(order.couponCode ? { coupon: order.couponCode } : {}),
          items: order.items.map((i) => ({
            item_id: String(i.productId),
            item_name: i.title,
            item_variant: i.variantLabel,
            price: i.price,
            quantity: i.quantity,
          })),
        },
      },
    ],
  };
  try {
    const r = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(id)}&api_secret=${encodeURIComponent(secret)}`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    if (!r.ok) console.error('GA4 purchase ব্যর্থ:', r.status);
  } catch (e) {
    console.error('GA4 purchase ব্যর্থ:', e.message);
  }
}

export { sendPurchase };
