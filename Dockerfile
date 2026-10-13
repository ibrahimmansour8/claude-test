FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY server ./server
COPY site ./site
COPY scripts ./scripts
# Railway injects PORT; the SQLite file lives on the mounted volume (DB_FILE=/data/app.db)
EXPOSE 8000
CMD ["node", "--disable-warning=ExperimentalWarning", "server/server.js"]
