# Stoa

Stoa is an API server for [Agora](https://github.com/bpfkorea/agora).
It needs to be paired to an Agora server, both by configuring the Agora server and by connecting to it from Stoa.
This separation allows Agora to stay lightweight, and Stoa to expose high-level data and metrics,
such as transaction aggregations, the list of validators, etc...

# Build instructions

This application is based on Node.JS and requires Node.js >= 14.13.1.

## Building on Ubuntu

```sh
$ sudo apt-get install nodejs
$ sudo apt-get install npm
$ npm ci
```

## Building on MacOS

```sh
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
$ brew install node
$ npm ci
```

# Usage

## Docker image

There is  an image automatically deployed on [Docker Hub](https://hub.docker.com/r/bpfk/stoa).
It can be pulled with `docker pull bpfk/stoa`.

## Manual

One can use `npm start` to run Stoa, and access it on its default port (4242).
Tests can be run via `npm test`, which executes the `*.test.ts` files in the `tests` folder.
