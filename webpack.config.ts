import path from 'path'
import fs from 'fs'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import Preprocess from 'svelte-preprocess'
import { Configuration, HotModuleReplacementPlugin, EnvironmentPlugin } from 'webpack'
import type { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import { DuplicatesPlugin } from 'inspectpack/plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import type HtmlTemplateDefinitions from './tools/webpack/html-template-definitions'
import ScriptExtHtmlWebpackPlugin from 'script-ext-html-webpack-plugin'
import HtmlWebpackTagsPlugin from 'html-webpack-tags-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import CompressionPlugin from 'compression-webpack-plugin'
import zlib from 'zlib'

const env = process.env.NODE_ENV as 'production' | 'development' | 'debug'
const mode = env === 'production' ? 'production' : 'development'
const prod = env === 'production'
const dev = env === 'development'
const sveltePath = path.resolve('node_modules', 'svelte')

/**
 * App title
 */
const appTitle = 'Wille Chat App'

/**
 * HTML template definitions
 * Includes HtmlWebpackPluginOptions and custom options
 */
const htmlDefinitions: HtmlTemplateDefinitions = {
  template: 'src/layouts/index.layout.ejs',
  title: appTitle,
  base: '/',
  minify: {
    removeComments: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
  },
  lang: 'pt-BR',
  meta: {
    viewport: 'width=device-width,initial-scale=1',
    description: 'Building manager for civil engineering',
    'theme-color': 'white',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black',
    'apple-mobile-web-app-title': appTitle,
    'msapplication-TileImage': 'images/icons/hello-icon-144.png',
    'msapplication-TileColor': '#FFFFFF',
  },
  favicon: 'src/assets/favicon.png',
  manifest: 'manifest.json',
}

/**
 * Use webpack bundle analyzer plugin for create an interactive treemap visualization of the contents of all your bundles.
 */
const bundleAnalyzerMode: 'server' | 'static' | 'json' | 'disabled' = 'disabled'

/**
 * Should source maps be generated alongside your production bundle? This will expose your raw source code, so it's
 * disabled by default.
 */
const sourceMapsInProduction = false

/**
 * Should we run Babel on builds? This will transpile your bundle in order to work on your target browsers (see the
 * `browserslist` property in your package.json), but will impact bundle size and build speed.
 */
const useBabel = true

/**
 * Should we run Babel on development builds? If set to `false`, only production builds will be transpiled. If you're
 * only testing in modern browsers and don't need transpiling in development, it is recommended to keep this disabled
 * as it will greatly speed up your builds.
 */
const useBabelInDevelopment = false

/**
 * One or more stylesheets to compile and add to the beginning of the bundle. By default, SASS, SCSS and CSS files are
 * supported. The order of this array is important, as the order of outputted styles will match. Svelte component
 * styles will always appear last in the bundle.
 */
let stylesheets = ['./src/styles/main.scss']

/**
 * Webpack config
 */
const config: Configuration & WebpackDevServerConfiguration = {
  entry: {
    main: [
      // Note: Paths in the `stylesheets` variable will be added here automatically
      './src/main.ts',
    ],
    sw: [
      './src/pwa/pwa.service-worker.ts',
      './src/pwa/pwa.dedicated-worker.ts',
      './src/pwa/pwa.shared-worker.ts',
    ],
  },
  resolve: {
    alias: {
      // Note: Additional aliases will be loaded automatically from `tsconfig.compilerOptions.paths`
      svelte: path.resolve('node_modules', 'svelte'),
    },
    extensions: ['.mjs', '.js', '.ts', '.svelte', '.scss', '.css'],
    mainFields: ['svelte', 'browser', 'module', 'main'],
  },
  output: {
    publicPath: 'auto',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    path: __dirname + '/public/',
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    filename: (pathData): string => {
      const chunk = pathData.chunk?.name
      const mainFiles = ['main', 'sw']
      const fileName = '[name]'
      const extension = !prod || chunk === 'sw' ? '.js' : '.mjs'
      const path = mainFiles.includes(chunk) ? '' : 'scripts/'
      return path + fileName + extension
    },
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    chunkFilename: (pathData): string => {
      const chunk = pathData.chunk?.name
      const mainFiles = ['main', 'sw']
      const fileName = '[name]'
      const extension = !prod || chunk === 'sw' ? '.js' : '.mjs'
      const path = mainFiles.includes(chunk) ? '' : 'scripts/'
      return path + fileName + extension
    },
  },
  module: {
    rules: [
      {
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false, // load Svelte correctly
        },
      },
      {
        // https://github.com/sveltejs/svelte-loader
        test: /\.(html|svelte)$/,
        exclude: /node_modules/,
        use: {
          loader: 'svelte-loader',
          options: {
            dev: !prod,
            // emitCss: prod, // issue: https://github.com/sveltejs/svelte-loader/issues/139
            hotReload: false, // !prod, // issue: https://github.com/sveltejs/sapper-template/issues/130
            hotOptions: {
              noPreserveState: false,
              noPreserveStateKey: '@!hmr',
              noReload: false,
              acceptAccessors: true,
              acceptNamedExports: true,
              optimistic: true,
            },
            preprocess: Preprocess({
              scss: true,
              postcss: {
                plugins: [require('autoprefixer')],
              },
            }),
          },
        },
      },
      {
        test: /\.(scss|sass)$/,
        use: [
          prod ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [require('autoprefixer')],
              },
            },
          },
          'sass-loader',
        ],
      },
      {
        test: /\.css$/,
        use: [prod ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader'],
      },
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[path][name].[ext]',
              outputPath: 'images',
            },
          },
          {
            loader: 'image-webpack-loader',
            options: {
              bypassOnDebug: true, // webpack@1.x
              disable: true, // webpack@2.x and newer
            },
          },
        ],
      },
    ],
  },
  devServer: {
    writeToDisk: true,
    hot: dev,
    historyApiFallback: true,
    stats: 'minimal',
    contentBase: 'public',
    watchContentBase: !prod,
    open: dev,
    overlay: true,
  },
  mode,
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new HtmlWebpackPlugin(htmlDefinitions),
    new ScriptExtHtmlWebpackPlugin({
      defer: /\.js$/,
      async: /\.mjs$/,
      module: /\.mjs$/,
    }),
    new HtmlWebpackTagsPlugin({
      links: [{ path: 'images/icons/hello-icon-192.png', attributes: { rel: 'apple-touch-icon' } }],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: './src/assets/robots.txt' },
        { from: './src/assets/manifest.json' },
        { from: './src/assets/images', to: 'images' },
      ],
    }),
    new EnvironmentPlugin({
      NODE_ENV: env,
      SOCKET_URL:
        mode === 'production' ? 'https://wille-chat-app.herokuapp.com' : 'http://localhost:5000',
    }),
  ],
  optimization: {
    minimizer: [],
  },
  devtool: prod && !sourceMapsInProduction ? false : 'source-map',
}

// Add stylesheets to the build
if (Array.isArray(stylesheets) || typeof stylesheets === 'string') {
  if (!Array.isArray(stylesheets)) {
    stylesheets = [stylesheets]
  }

  // Make sure our entry main is in the correct format
  if (typeof config.entry === 'object' && !Array.isArray(config.entry)) {
    const { main } = config.entry
    if (main !== 'undefined') {
      // Convert the main to an array if necessary and map items to string
      const mappedMain = main instanceof Array ? main : [main.toString()]

      // Add to the beginning of the main using unshift
      mappedMain.unshift(...stylesheets)
    }
  }
}

// Load path mapping from tsconfig
const tsconfigPath = path.resolve(__dirname, 'tsconfig.json')
const tsconfig = fs.existsSync(tsconfigPath) ? require(tsconfigPath) : {}

if ('compilerOptions' in tsconfig && 'paths' in tsconfig.compilerOptions) {
  const aliases = tsconfig.compilerOptions.paths
  for (const alias in aliases) {
    const paths = aliases[alias].map((p: string) => path.resolve(__dirname, p))

    // Our tsconfig uses glob path formats, whereas webpack just wants directories
    // We'll need to transform the glob format into a format acceptable to webpack
    const wpAlias = alias.replace(/(\\|\/)\*$/, '')
    const wpPaths = paths.map((p: string) => p.replace(/(\\|\/)\*$/, ''))

    const configAliases = config.resolve.alias
    if (!(wpAlias in configAliases) && wpPaths.length) {
      configAliases[wpAlias] = wpPaths.length > 1 ? wpPaths : wpPaths[0]
    }
  }
}

if (dev) {
  config.plugins.push(
    // Hot reload
    new HotModuleReplacementPlugin(),
    // Verify duplicates
    new DuplicatesPlugin({
      emitErrors: true,
      verbose: true,
      emitHandler: undefined,
      ignoredPackages: undefined,
    })
  )
}

// These options should only apply to production builds
if (prod) {
  config.plugins.push(
    // Minify and treeshake JS
    new TerserPlugin({
      terserOptions: {
        sourceMap: sourceMapsInProduction,
      },
      extractComments: false,
    }),
    // Compress
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(m?js)$/,
      compressionOptions: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      },
      deleteOriginalAssets: false,
    }),
    // Bundle analyzer
    new BundleAnalyzerPlugin({
      analyzerMode: bundleAnalyzerMode,
      openAnalyzer: true,
    })
  )

  // Split chunks
  config.optimization.splitChunks = {
    cacheGroups: {
      vendor: {
        name: 'vendor',
        test: /[\\/]node_modules[\\/]/,
        chunks: 'all',
        priority: -20,
      },
    },
  }
}

// Add babel if enabled
if (useBabel && (prod || useBabelInDevelopment)) {
  config.module.rules.unshift({
    test: /\.(?:svelte|m?js)$/,
    include: [path.resolve(__dirname, 'src'), path.dirname(sveltePath)],
    use: {
      loader: 'babel-loader',
      options: {
        sourceType: 'unambiguous',
        presets: ['@babel/preset-env'],
        plugins: ['@babel/plugin-transform-runtime'],
      },
    },
  })
}

export default config
