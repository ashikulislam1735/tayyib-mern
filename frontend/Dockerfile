# ধাপ ১: সাইট build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# একই ডোমেইন থেকে /api ডাকা হবে (Nginx পাঠিয়ে দেবে), তাই CORS ঝামেলা নেই
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ধাপ ২: Nginx দিয়ে চালানো
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
