# Web TyZo Sub chạy trên VPS (không qua Vercel). Dựng bởi deploy/vps/compose.yml.
# Đóng gói bằng Nitro preset node-server; bảng dữ liệu (migration) chạy mỗi lần khởi động, đã chạy rồi thì bỏ qua.
FROM node:22-slim
WORKDIR /app
ENV NITRO_PRESET=node-server \
    VITE_AUTH_ENABLED=true \
    NODE_OPTIONS=--max-old-space-size=3072
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --include=dev
COPY . .
ARG VITE_PUBLIC_HOSTNAME=""
ENV VITE_PUBLIC_HOSTNAME=${VITE_PUBLIC_HOSTNAME}
RUN PATH=/app/node_modules/.bin:$PATH node scripts/with-app-env.mjs vite build
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 NODE_OPTIONS=
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node .output/server/index.mjs"]
