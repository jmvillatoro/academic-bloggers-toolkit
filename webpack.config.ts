import { TsConfigPathsPlugin } from 'awesome-typescript-loader';
import { resolve } from 'path';
import * as webpack from 'webpack';
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const isProduction = process.env.NODE_ENV === 'production';

const sharedPlugins: webpack.Plugin[] = [
    new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false,
    }),
    new webpack.NoEmitOnErrorsPlugin(),
    // new webpack.optimize.CommonsChunkPlugin({
    //     name: 'vendor',
    //     minChunks: Infinity,
    //     filename: 'vendor/vendor.bundle.js',
    // }),
    new webpack.DefinePlugin({
        __DEV__: JSON.stringify(!isProduction),
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
];

const devPlugins: webpack.Plugin[] = [
    ...sharedPlugins,
    // new BundleAnalyzerPlugin({
    //     analyzerMode: 'server',
    //     analyzerPort: 8888,
    //     openAnalyzer: true,
    // }),
];

const productionPlugins = [...sharedPlugins, new webpack.optimize.UglifyJsPlugin()];

const config: webpack.Configuration = {
    devtool: isProduction ? undefined : 'source-map',
    cache: true,
    entry: {
        'js/Frontend': ['babel-polyfill', './src/js/Frontend'],
        'js/reference-list/index': ['babel-polyfill', 'whatwg-fetch', './src/js/reference-list/'],
        'js/tinymce/index': ['./src/js/tinymce/'],
        'js/tinymce/components/reference-window/index': [
            'babel-polyfill',
            './src/js/tinymce/components/reference-window/',
        ],
        'js/tinymce/components/pubmed-window/index': [
            'babel-polyfill',
            './src/js/tinymce/components/pubmed-window/',
        ],
        'js/tinymce/components/edit-reference-window/index': [
            'babel-polyfill',
            './src/js/tinymce/components/edit-reference-window/',
        ],
        vendor: ['react', 'react-dom', 'mobx', 'mobx-react'],
    },
    output: {
        filename: '[name].js',
    },
    resolve: {
        modules: [resolve(__dirname, 'src'), 'node_modules'],
        extensions: ['*', '.webpack.js', '.web.js', '.ts', '.tsx', '.js'],
        plugins: [new TsConfigPathsPlugin()],
    },
    plugins: isProduction ? productionPlugins : devPlugins,
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /(?:__tests__|node_modules)/,
                use: ['awesome-typescript-loader'],
            },
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
};

export default config;