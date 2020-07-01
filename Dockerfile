# From Agora Runner
FROM bpfk/agora:latest
RUN apk add --no-cache curl git python3 py-pip alpine-sdk \
    bash autoconf libtool automake nodejs npm supervisor
ADD . /stoa/
WORKDIR /stoa/
RUN npm ci
EXPOSE 3836
# Use the supervisord to run agora and stoa multiprocessor.
ENTRYPOINT [ "supervisord", "-c", "/stoa/config/service_script.conf" ]
