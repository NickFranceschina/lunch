FROM node:20-alpine as build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Set environment variables for the React app
ENV REACT_APP_API_URL=http://localhost:3001
ENV REACT_APP_WS_HOST=localhost
ENV REACT_APP_WS_PORT=3001

# Build the React app
RUN npm run build

# Production environment
FROM nginx:alpine

# Copy build files from the builder stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the port the app will run on
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 