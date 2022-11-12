FROM node:18-alpine AS base
WORKDIR /opt/app
COPY ./ ./
RUN yarn --frozen-lockfile

FROM base AS test
RUN apk add --no-cache chromium
ENV CHROME_BIN=/usr/bin/chromium-browser
CMD ["yarn", "test", "--watch=false"]

FROM base AS prod
RUN yarn build --configuration production

FROM busybox:stable as release
COPY --from=prod /opt/app/dist/ /opt/app/dist/
CMD ["sh"]
