# Stoa
API server for Agora

# Build instructions
Install any version of Node.js >= 12.18.0

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
