FROM node:14-alpine@sha256:76badf0d0284ad838536d49d8a804988b4985fc6bc7242dfff4f8216c851438b AS base

WORKDIR /opt/app

COPY package.json yarn.lock ./

RUN yarn

COPY ./ ./

#RUN yarn test

EXPOSE 4200

CMD ["yarn", "start"]

FROM base AS release

LABEL org.opencontainers.image.source https://github.com/quipt/monorepo

RUN yarn build --prod
