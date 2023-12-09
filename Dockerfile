FROM node:20.9.0 AS base

WORKDIR /app

COPY package*.json ./
    
RUN npm install

COPY . .


FROM node:20.9.0

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY --from=base /app ./

ENTRYPOINT ["node","./app.js"]