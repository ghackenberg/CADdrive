import { resolve } from 'path'

import HtmlWebpackPlugin from 'html-webpack-plugin'
import webpack from 'webpack'
const { ProvidePlugin } = webpack

export default {
    mode: 'development',
    stats: 'minimal',
    entry: './src/scripts/main.tsx',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },{
                test: /\.(css)$/i,
                use: ['style-loader', 'css-loader']
            },{
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'images/[hash][ext][query]'
                }
            },{
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[hash][ext][query]'
                }
            },{
                test: /\.(glb|gltf|bin)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'models/[hash][ext][query]'
                }
            }
        ],
    },
    resolve: {
        alias: {
            'three': resolve('../../node_modules/three')
        },
        fallback: {
            'os': false,
            'stream': false,
            'http': false,
            'https': false,
            'zlib': false,
            'util': false,
            'path': false,
            'crypto': false,
            '@nestjs/core': false,
            '@nestjs/common': false,
            '@nestjs/mapped-types': false,
            '@nestjs/swagger': false,
            '@nestjs/microservices': false
        },
        extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
        new ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser.js'
        }),
        new HtmlWebpackPlugin({
            publicPath: '/',
            title: 'ProductBoard',
            filename: '404.html'
        })
    ],
    output: {
        path: resolve('public'),
        filename: 'frontend.js'
    },
    devServer: {
        static: resolve('public'),
        port: 3003,
        historyApiFallback: {
            rewrites: [
                { from: /./, to: '/404.html' }
            ]
        }
    },
    devtool: 'inline-source-map'
}