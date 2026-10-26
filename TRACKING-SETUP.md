# ট্র্যাকিং চালু করার নোট (Pixel + Conversions API + GA4 + Clarity + TikTok)

খেজুর গুড় প্রজেক্টের ট্র্যাকিং কিট এই প্রজেক্টে বসানো হয়েছে। কোনো ID না দেওয়া পর্যন্ত সব ট্র্যাকার বন্ধ থাকে, তাই এখনকার সাইটে কিছু বদলাবে না।

## কোন ফাইলে কী বদলেছে

**নতুন ফাইল**

| ফাইল | কাজ |
|---|---|
| `frontend/src/lib/track.js` | Pixel, TikTok, GA4-তে ইভেন্ট পাঠানো, কুকি পড়া |
| `backend/utils/capi.js` | Facebook Conversions API (Purchase, Lead) |
| `backend/utils/ga4.js` | GA4 Measurement Protocol (সার্ভার থেকে purchase) |
| `frontend/.env.example` | ফ্রন্টএন্ডের ট্র্যাকিং ভ্যারিয়েবল |

**বদলানো ফাইল**

| ফাইল | কী যোগ হয়েছে |
|---|---|
| `frontend/index.html` | Pixel, GA4, Clarity, TikTok স্ক্রিপ্ট |
| `frontend/src/context/CartContext.jsx` | `AddToCart` |
| `frontend/src/pages/ProductDetail.jsx` | `ViewContent` + WhatsApp/ফোন ক্লিকে `Contact` |
| `frontend/src/pages/Checkout.jsx` | `InitiateCheckout`, `Lead`, অর্ডারের সাথে `fbp/fbc/GA কুকি` সার্ভারে পাঠানো |
| `frontend/src/pages/OrderConfirmed.jsx` | `Purchase` (প্রতি অর্ডারে একবার, রিফ্রেশে আবার যায় না) |
| `frontend/src/App.jsx`, `components/Footer.jsx`, `components/FloatingWhatsApp.jsx` | ফোন/WhatsApp ক্লিকে `Contact` |
| `backend/routes/orders.js` | অর্ডার সেভের পর CAPI ও GA4 তে `Purchase` |
| `backend/routes/abandoned.js` | নতুন লিডে CAPI `Lead`, রেসপন্সে `fresh` |
| `backend/.env.example`, `.env.docker.example` | সার্ভারের ট্র্যাকিং ভ্যারিয়েবল |
| `frontend/Dockerfile`, `docker-compose.yml` | Docker বিল্ডে `VITE_...` আইডি পৌঁছানো |

## ইভেন্ট কখন যায়

| ইভেন্ট | কখন | কোথা থেকে |
|---|---|---|
| `PageView` | পেজ খুললে | ব্রাউজার |
| `ViewContent` | প্রোডাক্ট পেজ খুললে | ব্রাউজার |
| `AddToCart` | কার্টে যোগ করলে | ব্রাউজার |
| `InitiateCheckout` | চেকআউট পেজ খুললে | ব্রাউজার |
| `Lead` | ফোন নম্বর লিখে ফিল্ড ছাড়লে (নতুন নম্বর হলে একবার) | ব্রাউজার ও সার্ভার |
| `Contact` | ফোন বা WhatsApp লিংকে ক্লিক | ব্রাউজার |
| `Purchase` | অর্ডার হলে | ব্রাউজার (Pixel, TikTok) ও সার্ভার (CAPI, GA4) |

ডুপ্লিকেট আটকানো: `Purchase`-এর আইডি = অর্ডারের `_id`, `Lead`-এর আইডি = `lead_...` (ব্রাউজারে বানানো)। দুই জায়গায় একই আইডি যায়, তাই Facebook একবারই গোনে।

## চালু করার ধাপ

1. **Vercel** (Settings > Environment Variables) এ দিন, তারপর **Redeploy**:
   - `VITE_FB_PIXEL_ID`
   - `VITE_GA4_ID` (`G-XXXX`)
   - `VITE_CLARITY_ID`, `VITE_TIKTOK_PIXEL_ID` (ঐচ্ছিক)
2. **Render** (Environment) এ দিন, সেভ করলে নিজেই রিডিপ্লয় হবে:
   - `FB_PIXEL_ID` (Vercel-এর Pixel আইডির হুবহু একই)
   - `FB_CAPI_TOKEN` (Events Manager > Pixel > Settings > Conversions API > Generate access token)
   - `GA4_MEASUREMENT_ID` (`VITE_GA4_ID`-এর হুবহু একই)
   - `GA4_API_SECRET` (GA4 > Admin > Data streams > Measurement Protocol API secrets)
   - টেস্টের সময় `FB_TEST_EVENT_CODE` (Events Manager > Test Events থেকে)
3. **টেস্ট:** সাইটে অর্ডার করে Test Events-এ ব্রাউজার ও সার্ভারের `Purchase` একসাথে আসছে কিনা দেখুন। এলে **Deduplicated** দেখাবে।
4. **টেস্ট শেষে `FB_TEST_EVENT_CODE` খালি করুন।** নইলে লাইভ ইভেন্ট Test Events-এই আটকে থাকবে।
5. GA4: Reports > Realtime overview > "Event count by Event name" এ `view_item`, `add_to_cart`, `begin_checkout`, `purchase` দেখুন।

Docker-এ চালালে `.env.docker`-এ একই ভ্যারিয়েবলগুলো দিন। `VITE_...` বদলালে `docker compose --env-file .env.docker up -d --build` আবার চালাতে হবে।

## জেনে রাখুন

- **বাতিল অর্ডারও গোনা হয়:** সার্ভার অর্ডার তৈরির মুহূর্তেই `Purchase` পাঠায়। পরে অ্যাডমিনে বাতিল বা ফেরত করলেও Facebook ও GA4 রিপোর্টে থেকে যায়। bKash/Nagad অর্ডারের TrxID যাচাইয়ের আগেই `Purchase` চলে যায়। বিজ্ঞাপন চালানোর সময় এটা সিদ্ধান্ত নিতে হবে।
- **টেস্ট অর্ডার:** টেস্টের জন্য দেওয়া অর্ডারও রিপোর্টে গোনা হবে।
- **ফোন নম্বর:** Facebook-এ যাওয়ার আগে ফোন, নাম SHA-256 দিয়ে হ্যাশ হয়। ফোনের আগে `88` জুড়ে যায় (`01712345678` → `8801712345678`)।
- **Clarity:** Settings > Masking **Strict** বা **Balanced** রাখুন, নইলে চেকআউট ফর্মের ফোন ও ঠিকানা রেকর্ডিংয়ে দেখা যেতে পারে।
- **প্রাইভেসি পলিসি:** `PrivacyPolicy.jsx`-এ Facebook, Google ও Clarity-র ব্যবহার উল্লেখ আছে কিনা একবার দেখে নিন।
- Facebook ও GA4-এর সংখ্যা হুবহু মিলবে না, এটা স্বাভাবিক। আসল অর্ডারের হিসাব অ্যাডমিন প্যানেলে।
