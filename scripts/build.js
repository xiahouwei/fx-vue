// 打包packages下所有module
const fs = require('fs')
const execa = require('execa')
// 获取packages下所有目录, 即module包
const targets = fs.readdirSync('packages').filter(f => fs.statSync(`packages/${f}`).isDirectory())

// 打包每个module
async function build (target) {
    await execa('rollup', ['-c', '--environment', `TARGET:${target}`], { stdio: 'inherit'})
}

function runParallel(targets, iteratorFn) {
    const res = []
    for (const item of targets) {
        const p = iteratorFn(item)
        res.push(p)
    }
    return Promise.all(res)
}

runParallel(targets, build).then(() => {
    console.log('build success all module')
})
