import { ConfigurationFactory } from 'webpack'
import path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'

const ZipPlugin = require('zip-webpack-plugin')
const packageJson = require('./package.json')

const config: ConfigurationFactory = () => {
  return {
    mode: 'development',
    entry: {
      content_scripts: path.join(__dirname, 'src', 'content_scripts.ts')
    },
    devtool: false,
    output: {
      path: path.join(__dirname, 'dist'),
      filename: '[name].js'
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: '/node_modules/'
        },
        {
          test: [/\.(aff|dic)$/, /style.css$/],
          loader: 'raw-loader',
          options: { esModule: false },
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    plugins: [
      new CopyWebpackPlugin([
        { from: 'src/manifest.json', to: '.', transform: content => content.toString().replace('__VERSION__', packageJson.version) },
        { from: 'public', to: '.' },
        { from: 'node_modules/materialize-css/dist/js/materialize.min.js', to: '.' },
        { from: 'node_modules/materialize-css/dist/css/materialize.min.css', to: '.' },
      ]),
      new ZipPlugin({filename: `bitbucket_pr_spell_checker-${packageJson.version}.zip`})
    ]
  }
}

export default config
