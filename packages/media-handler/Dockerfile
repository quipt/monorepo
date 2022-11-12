FROM ghcr.io/ffbuilds/static-ffmpeg-gplv3-lambda:main AS ffmpeg

FROM public.ecr.aws/lambda/nodejs:18 AS lambda

FROM lambda AS build

RUN npm i -g yarn

COPY ./ ${LAMBDA_TASK_ROOT}

RUN \
    yarn --frozen-lockfile && \
    yarn build

RUN yarn --frozen-lockfile --production

FROM lambda AS release

COPY --from=ffmpeg /ffprobe /usr/local/bin/ffprobe
COPY --from=ffmpeg /ffmpeg /usr/local/bin/ffmpeg

RUN ffmpeg -version

COPY --from=build ${LAMBDA_TASK_ROOT}/node_modules/ ${LAMBDA_TASK_ROOT}/node_modules/
COPY --from=build ${LAMBDA_TASK_ROOT}/build/* ${LAMBDA_TASK_ROOT}/

CMD [ "main.handler" ]
