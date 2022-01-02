FROM node:14-alpine@sha256:76badf0d0284ad838536d49d8a804988b4985fc6bc7242dfff4f8216c851438b AS base

RUN apk add chromium

ENV CHROME_BIN=/usr/bin/chromium-browser

WORKDIR /opt/app

COPY package.json yarn.lock ./

RUN yarn

COPY ./ ./

EXPOSE 4200

CMD ["yarn", "start"]

FROM base as test

CMD ["yarn", "test", "--watch=false"]

FROM base AS release

LABEL org.opencontainers.image.source https://github.com/quipt/monorepo

RUN yarn build --configure production
