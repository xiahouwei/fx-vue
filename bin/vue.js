#! /usr/bin/env node

const { chalk } = require('@vue/cli-shared-utils')
const program = require('commander')


// -V 获取版本号
program
    .version(require('../package.json').version)
    .description('风行 vue-cli 脚手架')
    .usage('<command> [options]')


/**
 * create 命令 3.x创建项目命令
 * -p, --preset <presetName>       忽略提示符并使用已保存的或远程的预设选项
 * -d, --default                   忽略提示符并使用默认预设选项
 * -i, --inlinePreset <json>       忽略提示符并使用内联的 JSON 字符串预设选项
 * -m, --packageManager <command>  在安装依赖时使用指定的 npm 客户端
 * -r, --registry <url>            在安装依赖时使用指定的 npm registry
 * -g, --git [message]             强制 / 跳过 git 初始化，并可选的指定初始化提交信息
 * -n, --no-git                    跳过 git 初始化
 * -f, --force                     覆写目标目录可能存在的配置
 * -c, --clone                     使用 git clone 获取远程预设选项
 * -x, --proxy                     使用指定的代理创建项目
 * -b, --bare                      创建项目时省略默认组件中的新手指导信息
 */
program
    .command('create <app-name>')
    .description('create a new project powered by vue-cli-service')
    .option('-p, --preset <presetName>', 'Skip prompts and use saved or remote preset')
    .option('-d, --default', 'Skip prompts and use default preset')
    .option('-i, --inlinePreset <json>', 'Skip prompts and use inline JSON string as preset')
    .option('-m, --packageManager <command>', 'Use specified npm client when installing dependencies')
    .option('-r, --registry <url>', 'Use specified npm registry when installing dependencies (only for npm)')
    .option('-g, --git [message]', 'Force git initialization with initial commit message')
    .option('-n, --no-git', 'Skip git initialization')
    .option('-f, --force', 'Overwrite target directory if it exists')
    .option('--merge', 'Merge target directory if it exists')
    .option('-c, --clone', 'Use git clone when fetching remote preset')
    .option('-x, --proxy <proxyUrl>', 'Use specified proxy when creating project')
    .option('-b, --bare', 'Scaffold project without beginner instructions')
    .option('--skipGetStarted', 'Skip displaying "Get started" instructions')
    .action((name, otherD, cmd) => {
        require('../lib/src3.0/create')(name, otherD)
    })
// 输出使用帮助信息
program.on('--help', () => {
    console.log()
    console.log(`  Run ${chalk.cyan(`vue <command> --help`)} for detailed usage of given command.`)
    console.log()
})

program.commands.forEach(c => c.on('--help', () => console.log()))


// 解析命令行参数
program.parse(process.argv)
