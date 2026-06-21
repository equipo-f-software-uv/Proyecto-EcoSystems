FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# El comando se sobreescribirá en docker-compose para cada servicio
CMD ["node", "api/main.js"]
