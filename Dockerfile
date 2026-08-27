# Frontend — React + Vite (static build served by nginx)
# Mirrors the production nginx setup in infra/nginx.conf:
#   /api/*  -> http://backend:8000   (docker-compose service name)
#   /assets/* -> hashed, immutable
#   /*       -> SPA fallback to /index.html

FROM node:25.5.0-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM nginx:stable-alpine AS runtime

# Replace default server with the game's server block, adapted for docker
# networking (proxy_pass to the `backend` service instead of 127.0.0.1).
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
