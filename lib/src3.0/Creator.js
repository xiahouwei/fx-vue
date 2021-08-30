const execa = require('execa') // 终端运行插件
const chalk = require('chalk')
const path = require('path')
const inquirer = require('inquirer')
const cloneDeep = require('lodash.clonedeep')
const { log, logWithSpinner, stopSpinner, loadModule } = require('@vue/cli-shared-utils')
const Generator = require('./Generator')
const PromptModuleAPI = require('./PromptModuleAPI')
const { clearConsole } = require('./util/clearConsole')
const { savePreset, loadOptions, defaults } = require('./options')
const writeFileTree = require('./util/writeFileTree')
const { formatFeatures } = require('./util/features')
const sortObject = require('./util/sortObject')
const { installDeps } = require('./util/installDeps')


// 如果当前的预选项为manual模式, 则必然提问此描述
const isManualMode = answers => answers.preset === '__manual__'

const pluginMapping = {
    '@vue/cli-service': 'cli-service'
}

// Creator类
class Creator {
    constructor (name, context, promptModules) {
        this.name = name
        this.context = context
        // 获取 预设选项(上次创建过的) 和 预设选项具体选项(例如babel, ts, vuex)
        const { presetPrompt, featurePrompt } = this.resolveIntroPrompts()
        this.presetPrompt = presetPrompt
        this.featurePrompt = featurePrompt
        // 项目配置的文件放在package.json 还是 congfig.js 是否存储presetPrompts
        this.outroPrompts = this.resolveOutroPrompts()
        // 预选项内的每个具体细节
        this.injectedPrompts = []
        // 用户选择选项后的回调
        this.promptCompleteCbs = []
        this.createCompleteCbs = []

        this.run = this.run.bind(this)

        // 循环预选项模块并执行, 根据每一个模块来进行交互显示
        const promptAPI = new PromptModuleAPI(this)
        promptModules.forEach(m => m(promptAPI))
    }

    async create (cliOptions = {}, preset = null) {
        // 如果没有指定预选项, 则提示用户选择一个已存在的, 或者生成一个预选项
        if (!preset) {
            preset = await this.promptAndResolvePreset()
        }
        preset = cloneDeep(preset)

        // 注入vue-cli-service插件 vue-cli-service是root插件, 也是Generator内的rootOptions
        preset.plugins['@vue/cli-service'] = Object.assign({
            projectName: this.name
        }, preset, {
            bare: cliOptions.bare
        })
        const packageManager = 'npm'

        await clearConsole()
        logWithSpinner(`✨`, `Creating project in ${chalk.yellow(this.context)}.`)

        // 写入package.json文件
        const pkg = {
            name: this.name,
            version: '0.1.0',
            private: true,
            devDependencies: {}
        }
        const deps = Object.keys(preset.plugins)
        deps.forEach(dep => {
            if (preset.plugins[dep]._isPreset) {
                return
            }
            pkg.devDependencies[dep] = preset.plugins[dep].version || `latest`
        })
        await writeFileTree(this.context, {
            'package.json': JSON.stringify(pkg, null, 2)
        })
        stopSpinner()
        // 安装依赖 执行npm install
        log(`⚙  Installing CLI plugins. This might take a while...`)
        log()
        await installDeps(this.context, packageManager, cliOptions.registry)

        // 运行生成器, 执行每一个所选插件的生成器
        log(`🚀  Invoking generators...`)
        // 解析插件(排序, 获取生成器方法)
        const plugins = await this.resolvePlugins(preset.plugins)
        // 声明生成器实例 声明的时候就已经执行每个插件的方法了
        const generator = new Generator(this.context, {
            pkg,
            plugins,
            completeCbs: this.createCompleteCbs
        })
        // generate主要用于生成package.json, 执行writeFileTree生成文件
        await generator.generate({
            extractConfigFiles: preset.useConfigFiles
        })

        // 再次安装依赖
        log(`📦  Installing additional dependencies...`)
        log()
        await installDeps(this.context, packageManager, cliOptions.registry)

        // 执行comletion钩子
        logWithSpinner('⚓', `Running completion hooks...`)
        for (const cb of this.createCompleteCbs) {
            await cb()
        }

        stopSpinner()
        log()
        log(`🎉  Successfully created project ${chalk.yellow(this.name)}.`)
        log(
        `👉  Get started with the following commands:\n\n` +
        (this.context === process.cwd() ? `` : chalk.cyan(` ${chalk.gray('$')} cd ${this.name}\n`)) +
            chalk.cyan(` ${chalk.gray('$')} ${packageManager === 'yarn' ? 'yarn serve' : 'npm run serve'}`)
        )
        log()

        generator.printExitLogs()

    }

    run (command, args) {
        if (!args) { [command, ...args] = command.split(/\s+/) }
        return execa(command, args, { cwd: this.context })
    }

    // 提示并获取用户的预选项答案
    async promptAndResolvePreset (answers = null) {
        if (!answers) {
            await clearConsole(true)
            // 和用户进行交互, 获取用户选择的预选项结果
            answers = await inquirer.prompt(this.resolveFinalPrompts())
        }
        let preset
        // 判断是已经存在的预选项还是自定义的预选项, 来生成preset
        if (answers.preset && answers.preset !== '__manual__') {
            preset = await this.resolvePreset(answers.preset)
        } else {
            preset = {
                useConfigFiles: answers.useConfigFiles === 'files',
                plugins: {}
            }
            answers.features = answers.features || []
            // 执行预选项回调, 根据用户的选择 以及 每一个预选项设置的回调 来填充preset
            this.promptCompleteCbs.forEach(cb => cb(answers, preset))
        }

        // 保存预选项到本地
        if (answers.save && answers.saveName) {
            savePreset(answers.saveName, preset)
        }
      
        return preset
    }

    // 解析预选项参数
    async resolvePreset (name) {
        // 读取本地, 或者远程仓库的 预选项数据
        let preset
        const savedPresets = loadOptions().presets || {}
        if (name in savedPresets) {
            preset = savedPresets[name]
        }
        // 如果选择默认预选项 则返回对应的数据
        if (name === 'default' && !preset) {
            preset = defaults.presets.default
        }
        // 如果找不到预选项数据, 则提示 且退出终端
        if (!preset) {
            log(`you don't seem to have any saved preset.`)
            log(`run vue-cli in manual mode to create a preset.`)
            exit(1)
        }
        return preset
    }

    // 解析插件, 把插件的生成器行为收集起来 { id: options } => [{ id, apply, options }]
    async resolvePlugins (rawPlugins) {
        // 首先对差件进行排序 使'@vue/cli-service'插件排在首位
        rawPlugins = sortObject(rawPlugins, ['@vue/cli-service'], true)
        const plugins = []
        for (const id of Object.keys(rawPlugins)) {
            // 循环插件, 收集插件申城行为
            let apply
            if (pluginMapping[id]) {
                apply = require(path.resolve(__dirname, `plugins/${pluginMapping[id]}/generator`))
            } else {
                apply = loadModule(`${id}/generator`, this.context) || (() => {})
            }
            // 如果插件有prompt选项, 则向用户进行询问
            let options = rawPlugins[id] || {}
            if (options.prompts) {
                const prompts = loadModule(`${id}/prompts`, this.context)
                if (prompts) {
                    log()
                    log(`${chalk.cyan(options._isPreset ? `Preset options:` : id)}`)
                    options = await inquirer.prompt(prompts)
                }
            }
            // 收集插件
            plugins.push({ id, apply, options })
        }
        return plugins
    }

    // 获取本地已存在的预选项
    getPresets () {
        const savedOptions = loadOptions()
        return Object.assign({}, savedOptions.presets, defaults.presets)
    }

    // 获取 预设选项 和 预设选项描述
    resolveIntroPrompts () {
        // 如果本地存在曾经保存过的预选项, 则取出来放到预设选项里
        const presets = this.getPresets()
        const presetChoices = Object.keys(presets).map(name => {
            return {
                name: `${name} (${formatFeatures(presets[name])})`,
                value: name
            }
        })
        // 预设选项
        const presetPrompt = {
            name: 'preset',
            type: 'list',
            message: `Please pick a preset:`,
            choices: [
                ...presetChoices,
                {
                    name: 'Manually select features',
                    value: '__manual__'
                }
            ]
        }
        // 每个预设选项的详细选项
        const featurePrompt = {
            name: 'features',
            when: isManualMode,
            type: 'checkbox',
            message: 'Check the features needed for your project:',
            choices: [],
            pageSize: 10
        }
        return {
            presetPrompt,
            featurePrompt
        }
    }

    // 项目配置的文件放在package.json 还是 congfig.js 是否存储presetPrompts
    resolveOutroPrompts () {
        const outroPrompts = [
            {
                name: 'useConfigFiles',
                when: isManualMode,
                type: 'list',
                message: 'Where do you prefer placing config for Babel, PostCSS, ESLint, etc.?',
                choices: [
                    {
                        name: 'In dedicated config files',
                        value: 'files'
                    },
                    {
                        name: 'In package.json',
                        value: 'pkg'
                    }
                ]
            },
            {
                name: 'save',
                when: isManualMode,
                type: 'confirm',
                message: 'Save this as a preset for future projects?',
                default: false
            },
            {
                name: 'saveName',
                when: answers => answers.save,
                type: 'input',
                message: 'Save preset as:'
            }
        ]

        return outroPrompts
    }

    // 获取最终需要跟用户交互的预选项
    resolveFinalPrompts () {
        // 注入的提示只在manual模式下显示
        this.injectedPrompts.forEach(prompt => {
            const originalWhen = prompt.when || (() => true)
            prompt.when = answers => {
                return isManualMode(answers) && originalWhen(answers)
            }
        })
        const prompts = [
            this.presetPrompt,
            this.featurePrompt,
            ...this.injectedPrompts,
            ...this.outroPrompts
        ]
        return prompts
    }
}
module.exports = Creator