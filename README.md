# stoa
API server for Agora



## Build instructions

# Install the node.Js >= 12.18.0 (includes npm 6.14.4) (you might want to use a newer version)


# Building on Ubuntu
# Ubuntu is already nodejs installed.
$ sudo apt-get install nodejs
$ sudo apt-get install npm
$ npm ci

# Building on MacOS
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
$ brew install node
$ npm ci

## How to start
- `npm start`: Run the stoa in the Node.Js. It is being watched by nodemon.
               When changing the source, the code configured with typescript
               is transpiled to javascript and restarted.

## Stoa test
- `npm test`: Test run the test.ts files in the tests folder.
