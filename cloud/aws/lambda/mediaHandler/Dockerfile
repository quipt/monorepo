FROM ghcr.io/binoculars/ffmpeg-build-lambda:master as ffmpeg

FROM public.ecr.aws/lambda/nodejs:14 as build

RUN npm i -g yarn

ADD ./ ./

RUN \
    yarn --frozen-lockfile && \
    yarn build

RUN yarn --frozen-lockfile --production

FROM public.ecr.aws/lambda/nodejs:14 as release

ENV LD_LIBRARY_PATH=/usr/local/lib:/usr/local/lib64

COPY --from=ffmpeg /lib/ /lib/
COPY --from=ffmpeg /bin/ /bin/

COPY --from=build ${LAMBDA_TASK_ROOT}/node_modules/ ${LAMBDA_TASK_ROOT}/node_modules/
COPY --from=build ${LAMBDA_TASK_ROOT}/build/* ${LAMBDA_TASK_ROOT}/

CMD [ "main.handler" ]
