import { ConfigurationFactory } from 'webpack'
import path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'

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
          test: /\.(aff|dic)$/,
          use: [{ loader: 'raw-loader', options: { esModule: false } }],
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    plugins: [
      new CopyWebpackPlugin([
        { from: 'public', to: '.' },
      ])
    ]
  }
}

export default config
