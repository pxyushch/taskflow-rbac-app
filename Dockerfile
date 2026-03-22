
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --if-present

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 5000
USER node
CMD ["npm", "start"]
