FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application files
COPY . .

# Ensure uploads directory exists
RUN mkdir -p /app/uploads/logos

EXPOSE 5000

CMD ["node", "server.js"]
