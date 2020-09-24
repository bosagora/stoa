# From Agora Runner
FROM alpine:3.12
RUN apk add --no-cache curl git python3 py-pip alpine-sdk \
    bash autoconf libtool automake nodejs npm
ADD . /stoa/
WORKDIR /stoa/
RUN npm ci
EXPOSE 3836
# Starts a node process, which compiles TS and watches `src` for changes
ENTRYPOINT [ "npm", "start" ]
