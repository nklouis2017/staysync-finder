# Step 1: Build React app
FROM node:24-alpine AS builder

WORKDIR /app

ARG VITE_SITE_URL
ARG VITE_BASE_URL
ARG VITE_IMAGE_URL

ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_BASE_URL=$VITE_BASE_URL
ENV VITE_IMAGE_URL=$VITE_IMAGE_URL

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# Step 2: Serve using `serve` package
FROM node:24-alpine

RUN yarn global add serve

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 8500

CMD ["serve", "-s", "dist", "-l", "8500"]
