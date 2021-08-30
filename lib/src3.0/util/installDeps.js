const execa = require('execa')

// 开启子进程执行终端命令
exports.installDeps = async function (targetDir, command, cliRegistry) {
    return new Promise((resolve, reject) => {
        const args = ['install', '--loglevel', 'error']
        const child = execa(command, args, {
            cwd: targetDir,
            stdio: ['inherit', 'inherit', 'inherit']
        })
        child.on('close', code => {
            if (code !== 0) {
                reject(`command failed: ${command} ${args.join(' ')}`)
                return
            }
            resolve()
        })
    })
}