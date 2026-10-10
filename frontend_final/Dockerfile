# ── Build stage ──────────────────────────────────────────────────────────────
# Installs dependencies and runs the Vite production build inside Docker so the
# deployed image always contains the latest compiled assets, regardless of whether
# a local `dist/` directory exists.
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests first so Docker layer-caches npm ci separately from
# source changes (speeds up subsequent image builds significantly).
COPY package.json package-lock.json ./
RUN npm ci

# Copy all source files.
COPY . .

# VITE_API_BASE_URL is injected as a build argument and baked into the JS bundle
# by Vite at compile time via import.meta.env.VITE_API_BASE_URL.
# Pass the value when running `docker build`:
#   docker build --build-arg VITE_API_BASE_URL=https://your-backend.onrender.com .
# Or configure it in the Render frontend service -> Environment -> Build variables.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
# Serves the compiled assets with Nginx. Uses a custom config so that React
# Router (client-side routing) works correctly — all unknown paths fall back
# to index.html instead of returning 404.
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]