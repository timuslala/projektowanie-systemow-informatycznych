# Stage 1: Build
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
RUN apk add --no-cache gettext
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

# Use envsubst or simple sed at container startup
CMD ["/bin/sh", "-c", "\
  cp /usr/share/nginx/html/env.js /tmp/old.js && \
  envsubst < /usr/share/nginx/html/env.js > /tmp/env.js && \
  cp /tmp/env.js /usr/share/nginx/html/env.js && \
  exec nginx -g 'daemon off;' \
"]