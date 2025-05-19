FROM node:lts-bullseye
WORKDIR /app
COPY package*.json ./
RUN npm install && npx playwright install-deps && npx playwright install chromium
COPY . .
CMD ["npm", "run", "start"]