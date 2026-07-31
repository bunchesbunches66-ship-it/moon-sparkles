FROM node:18-alpine
WORKDIR /app
COPY server/package.json ./server/package.json
RUN cd server && npm ci --production
COPY server ./server
COPY web ./web
COPY .env.example ./
EXPOSE 3000
CMD ["node", "server/index.js"]
