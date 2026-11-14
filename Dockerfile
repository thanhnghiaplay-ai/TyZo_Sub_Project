# Cầu nối Dịch trực tiếp (chạy riêng, ví dụ trên Fly.io). Web chính vẫn chạy ở Vercel.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --include=dev
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "run", "live:bridge"]
