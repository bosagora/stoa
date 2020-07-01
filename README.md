# Stoa
API server for Agora

# Build instructions
Install any version of Node.js >= 12.18.0

# Docker usage

The easiest way to get stoa is to run `docker pull bpfk/stoa`.
The `Dockerfile` lives at the root of this repository,

For a test run,
This requires the Agora config.yaml file in advance.
try:
```console
docker run -p 127.0.0.1:3836:3836/tcp -v $(pwd)/config.yaml:/stoa/config.yaml -e "CONFIG=/stoa/config.yaml" bpfk/stoa
```
This will start a stoa & full node agora with the example config/agora_config file,
and make the port locally accessible (See http://127.0.0.1:3836/).

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
````

## How to start
`npm start`: Run Stoa in the Node.js. It is being watched by nodemon.
               When changing the source, the code configured with typescript
               is transpiled to javascript and restarted.

## Stoa test
`npm test`: Test run the *.test.ts files in the tests folder.
