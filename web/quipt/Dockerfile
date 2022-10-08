FROM node:18-alpine AS base

RUN apk add --no-cache chromium

ENV CHROME_BIN=/usr/bin/chromium-browser

WORKDIR /opt/app

COPY package.json yarn.lock ./

RUN yarn

COPY ./ ./

EXPOSE 4200

CMD ["yarn", "start"]

FROM base as test

CMD ["yarn", "test", "--watch=false"]

FROM base AS production

LABEL org.opencontainers.image.source https://github.com/quipt/monorepo

RUN yarn build --configuration production

FROM busybox:stable as release

COPY --from=production /opt/app/dist/ /opt/app/dist/

CMD ["sh"]
