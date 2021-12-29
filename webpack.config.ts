import { ConfigurationFactory } from 'webpack'
import path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'

const config: ConfigurationFactory = () => {
  return {
    mode: 'development',
    entry: {
      content_scripts: path.join(__dirname, 'src', 'content_scripts.ts')
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: '[name].js'
    },
    module: {
      rules: [
        {
          test: /.ts$/,
          use: 'ts-loader',
          exclude: '/node_modules/'
        },
      ],
    },
    resolve: {
      extensions: ['ts', 'js']
    },
    plugins: [
      new CopyWebpackPlugin([
        { from: 'public', to: '.' },
        { from: 'node_modules/typo-js-ts/dist/es/dictionaries/en_US', to: './typo/dictionaries/en_US' },
      ])
    ]
  }
}

export default config
