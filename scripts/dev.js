// 打包单独module
const fs = require('fs')
const execa = require('execa')

// const target = 'reactivity'
const target = 'vue'

build(target)
async function build (target) {
    await execa('rollup', ['-c', '-w', '--environment', `TARGET:${target}`], { stdio: 'inherit' })
}