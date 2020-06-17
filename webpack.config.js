const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = {
  entry: './src/main.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  devtool: 'source-map',
  target: 'node',
  mode: 'none',
  externals: [nodeExternals()],
  optimization: {
    minimize: false
  },
  resolve: {
    modules: [ 'node_modules' ],
    extensions: [ '.ts', '.js' ]
  },
  output: {
    filename: 'stoa.js',
    path: path.resolve(__dirname, 'dist')
  }
};
