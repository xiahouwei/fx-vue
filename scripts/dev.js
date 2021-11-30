// 打包单独module
const fs = require('fs')
const execa = require('execa')

// const target = 'reactivity'
const target = ['vue', 'reactivity', 'runtime-core', 'runtime-dom', 'shared', 'compiler-core']

async function build (target) {
    if (Array.isArray(target)) {
        target.forEach(item => {
            buildHandle(item)
        })
    } else {
        return buildHandle(target)
    }
}

async function buildHandle (target) {
    await execa('rollup', ['-c', '-w', '--environment', `TARGET:${target}`], { stdio: 'inherit' })
}



build(target)