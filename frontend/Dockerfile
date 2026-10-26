# ধাপ ১: সাইট build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# একই ডোমেইন থেকে /api ডাকা হবে (Nginx পাঠিয়ে দেবে), তাই CORS ঝামেলা নেই
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
# ট্র্যাকিং আইডি (খালি থাকলে ওই ট্র্যাকার বন্ধ)। docker compose build args থেকে আসে।
ARG VITE_FB_PIXEL_ID=
ARG VITE_GA4_ID=
ARG VITE_CLARITY_ID=
ARG VITE_TIKTOK_PIXEL_ID=
ENV VITE_FB_PIXEL_ID=$VITE_FB_PIXEL_ID VITE_GA4_ID=$VITE_GA4_ID VITE_CLARITY_ID=$VITE_CLARITY_ID VITE_TIKTOK_PIXEL_ID=$VITE_TIKTOK_PIXEL_ID
RUN npm run build

# ধাপ ২: Nginx দিয়ে চালানো
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
