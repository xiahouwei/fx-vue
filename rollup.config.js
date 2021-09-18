import path from 'path'
import json from '@rollup/plugin-json'
import resolvePlugin from '@rollup/plugin-node-resolve'
import ts from 'rollup-plugin-typescript2'

// 获取package目录
const packagesDir = path.resolve(__dirname, 'packages')

const packageDir = path.resolve(packagesDir, process.env.TARGET)

const resolvePath = (p) => path.resolve(packageDir, p)

// 获取package.json文件内容
const pkg = require(resolvePath('package.json'))
// 获取包名
const name = path.basename(packageDir)
// 映射输出地址
const outputConfig = {
    'esm-bundler': {
        file: resolvePath(`dist/${name}.esm-bundler.js`),
        format: 'es'
    },
    'cjs': {
        file: resolvePath(`dist/${name}.cjs.js`),
        format: 'cjs'
    },
    'global': {
        file: resolvePath(`dist/${name}.global.js`),
        format: 'iife'
    }
}
const options = pkg.buildOptions
// 生成rollup配置
function createConfig (format, output) {
    output.name = options.name
    output.sourcemap = true
    return {
        input: resolvePath('src/index.ts'),
        output,
        plugins: [
            json(),
            ts({
                tsconfig: path.resolve(__dirname, 'tsconfig.json')
            }),
            resolvePlugin()
        ]
    }
}

export default options.formats.filter(format => !!outputConfig[format]).map(format => createConfig(format, outputConfig[format]))