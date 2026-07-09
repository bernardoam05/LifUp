/**
 * Webpack config for the web (PWA) build — react-native-web + shims for
 * Android-only native modules. Output: dist/ (deployable to Vercel/GitHub Pages).
 */
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const appDirectory = __dirname;

// RN packages that ship untranspiled JS/JSX/Flow and must go through Babel.
const compileNodeModules = [
  'react-native-vector-icons',
  'react-native-tab-view',
  '@react-navigation',
  '@react-native-async-storage',
  'react-native-safe-area-context',
].map(name => path.resolve(appDirectory, 'node_modules', name));

const babelLoaderConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/,
  include: [
    path.resolve(appDirectory, 'index.web.js'),
    path.resolve(appDirectory, 'App.tsx'),
    path.resolve(appDirectory, 'src'),
    path.resolve(appDirectory, 'web/shims'),
    ...compileNodeModules,
  ],
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      configFile: false,
      babelrc: false,
      presets: [
        ['@babel/preset-env', { targets: { esmodules: true } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
        '@babel/preset-flow',
      ],
    },
  },
};

module.exports = (env = {}, argv = {}) => {
  const isProd = argv.mode !== 'development';

  return {
    mode: isProd ? 'production' : 'development',
    entry: path.resolve(appDirectory, 'index.web.js'),
    output: {
      path: path.resolve(appDirectory, 'dist'),
      filename: isProd ? 'static/js/[name].[contenthash:8].js' : 'static/js/[name].js',
      // Relative public path: works at the domain root (Vercel) and under a
      // sub-path (GitHub Pages) without rebuilding.
      publicPath: 'auto',
      clean: true,
    },
    devtool: isProd ? false : 'eval-source-map',
    resolve: {
      // .web.* first so platform-specific web implementations win.
      extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
      alias: {
        'react-native$': 'react-native-web',
        // Android-only native modules → web shims
        '@notifee/react-native': path.resolve(appDirectory, 'web/shims/notifee.js'),
        'react-native-google-mobile-ads': path.resolve(appDirectory, 'web/shims/google-mobile-ads.js'),
        'react-native-sound': path.resolve(appDirectory, 'web/shims/sound.js'),
        'react-native-geolocation-service': path.resolve(appDirectory, 'web/shims/geolocation.js'),
        'react-native-localize': path.resolve(appDirectory, 'web/shims/localize.js'),
        '@react-native-clipboard/clipboard': path.resolve(appDirectory, 'web/shims/clipboard.js'),
      },
    },
    module: {
      rules: [
        // react-navigation & co. ship ESM with extensionless imports.
        {
          test: /\.m?js$/,
          resolve: { fullySpecified: false },
        },
        babelLoaderConfiguration,
        {
          test: /\.(png|jpe?g|gif|webp|svg)$/,
          type: 'asset',
        },
        {
          test: /\.ttf$/,
          type: 'asset/resource',
          generator: { filename: 'fonts/[name][ext]' },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(appDirectory, 'web/index.html'),
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'web/manifest.webmanifest', to: 'manifest.webmanifest' },
          { from: 'web/service-worker.js', to: 'service-worker.js' },
          { from: 'web/icons', to: 'icons' },
          { from: 'web/fonts', to: 'fonts' },
          {
            from: 'node_modules/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf',
            to: 'fonts/MaterialCommunityIcons.ttf',
          },
        ],
      }),
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(!isProd),
        'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
      }),
    ],
    performance: { hints: false },
    devServer: {
      historyApiFallback: true,
      port: 8080,
      hot: true,
    },
  };
};
