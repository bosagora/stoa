# From Agora Runner
FROM alpine:3.12
RUN apk add --no-cache curl git python3 py-pip alpine-sdk \
    bash autoconf libtool automake nodejs npm

WORKDIR /stoa/wd/

ADD . /stoa/bin/
RUN npm ci --prefix /stoa/bin/

# Starts a node process, which compiles TS and watches `src` for changes
ENTRYPOINT /stoa/bin/docker/entrypoint.sh
