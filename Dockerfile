# Use the official Node.js 20 base image
FROM node:20-slim

# Install system dependencies for Puppeteer, Chromium, and audio conversion
RUN apt-get update && apt-get install -y \
    chromium \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    dbus \
    dbus-x11 \
    ffmpeg \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer environment variables to skip download and use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set up the working directory
WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install standard dependencies
RUN npm ci

# Copy the rest of the application files
COPY . .

# Generate the Prisma Client
RUN npx prisma generate

# Build the Next.js production bundle
RUN npm run build

# Create directories for local WhatsApp session caching and set permissions
RUN mkdir -p .wwebjs_auth .wwebjs_cache .wwebjs_media_cache \
    && chmod -R 777 .wwebjs_auth .wwebjs_cache .wwebjs_media_cache

# Expose port 7860 (Hugging Face Spaces requirement)
EXPOSE 7860

# Define runtime variables for Next.js
ENV PORT=7860 \
    HOSTNAME="0.0.0.0" \
    NODE_ENV=production

# Start the application
CMD ["npm", "start"]
