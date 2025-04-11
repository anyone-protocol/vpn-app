FROM node:20

# Install dependencies
RUN apt-get update && apt-get install -y \
   git \
   && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
CMD ["npm", "run", "build:linux"]
