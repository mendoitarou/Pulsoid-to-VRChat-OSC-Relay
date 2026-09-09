FROM node:22-alpine

WORKDIR /app

# Install dependencies needed for native builds if any
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "start"]
