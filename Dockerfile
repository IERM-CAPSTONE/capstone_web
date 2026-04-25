FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost/api
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost/notifications
ARG NEXT_PUBLIC_APP_NAME=IERM
ARG NEXT_PUBLIC_APP_VERSION=1.0.0
ARG INTERNAL_API_URL=http://capstone_api:3000

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}
ENV INTERNAL_API_URL=${INTERNAL_API_URL}

RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3001

CMD ["npm", "run", "start"]
