FROM node:18-alpine AS base
WORKDIR /opt/app
COPY ./ ./
RUN yarn --frozen-lockfile

FROM base AS web-test
RUN apk add --no-cache chromium
ENV CHROME_BIN=/usr/bin/chromium-browser
CMD ["yarn", "workspace", "@quipt/web", "test", "--watch=false"]

FROM base AS web-prod
RUN yarn workspace @quipt/web build --configuration production

FROM busybox:stable as web-release
COPY --from=web-prod /opt/app/packages/web/dist/ /opt/app/dist/
CMD ["sh"]
