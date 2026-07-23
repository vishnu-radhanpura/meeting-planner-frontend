# Stage 1: build the Angular app
FROM node:26-alpine AS builder
WORKDIR /workspace
COPY package*.json ./
COPY tsconfig*.json ./
COPY angular.json ./
COPY public ./public
COPY src ./src
RUN npm install
RUN npm run build -- --configuration production

# Stage 2: serve with nginx
FROM nginx:stable-alpine
COPY --from=builder /workspace/dist/meeting-planner-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
