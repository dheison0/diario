FROM node:22-slim
WORKDIR /src
VOLUME [ "/database" ]
ENV DB_PATH="/database"
COPY package*.json ./
RUN npm --rm install && npm cache clean --force
RUN npx --rm playwright install --with-deps --only-shell chromium
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]