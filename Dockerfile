FROM node:18-alpine

EXPOSE 3000
WORKDIR /app
COPY . .

RUN apk add openssl
RUN npm install
RUN npm run build

CMD ["npm", "run", "start"]
