FROM ghcr.io/binoculars/ffmpeg-build-lambda:master as ffmpeg

FROM public.ecr.aws/lambda/nodejs:14 as release

ENV LD_LIBRARY_PATH=/usr/local/lib:/usr/local/lib64

COPY --from=ffmpeg /lib/ /lib/
COPY --from=ffmpeg /bin/ /bin/

ADD main.js ./
