# Frontend — React + Vite (static build served by nginx)
# Serves the Vite build and proxies /api to the backend container via Docker
# DNS. In production the host nginx (sites-enabled/magic-sort) proxies
# separately: /api/ -> 127.0.0.1:8000 and / -> 127.0.0.1:3000. This internal
# proxy keeps `docker compose up` usable without the host nginx (local dev).

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
