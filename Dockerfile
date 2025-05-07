# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --production
COPY . .

# Stage 2: Production runtime
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app .

CMD ["node", "bot.js"]
