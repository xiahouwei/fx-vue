const fs = require('fs')
const cloneDeep = require('lodash.clonedeep')
const { getRcPath } = require('./util/rcPath')

// 获取预选项文件保存路径
const rcPath = exports.rcPath = getRcPath('.fxvuerc')

exports.defaultPreset = {
    router: false,
    vuex: false,
    useConfigFiles: false,
    cssPreprocessor: undefined,
    plugins: {
        '@vue/cli-plugin-babel': {},
        '@vue/cli-plugin-eslint': {
        config: 'base',
        lintOn: ['save']
        }
    }
}
  
exports.defaults = {
    packageManager: undefined,
    useTaobaoRegistry: undefined,
    presets: {
        'default': exports.defaultPreset
    }
}
// 读取本地预选项文件,且缓存
let cachedOptions
exports.loadOptions = () => {
    if (cachedOptions) {
        return cachedOptions
    }
    if (fs.existsSync(rcPath)) {
        try {
            cachedOptions = JSON.parse(fs.readFileSync(rcPath, 'utf-8'))
        } catch (e) {
            error(
            `Error loading saved preferences: ` +
            `~/.vuerc may be corrupted or have syntax errors. ` +
            `Please fix/delete it and re-run vue-cli in manual mode.\n` +
            `(${e.message})`,
            )
            exit(1)
        }
        return cachedOptions
    } else {
        return {}
    }
}

// 保存预选项到本地文件
exports.saveOptions = toSave => {
    const options = Object.assign(cloneDeep(exports.loadOptions()), toSave)
    // 删除无用的key
    for (const key in options) {
        if (!(key in exports.defaults)) {
            delete options[key]
        }
    }
    cachedOptions = options
    try {
      fs.writeFileSync(rcPath, JSON.stringify(options, null, 2))
    } catch (e) {
      error(
        `Error saving preferences: ` +
        `make sure you have write access to ${rcPath}.\n` +
        `(${e.message})`
      )
    }
  }

exports.savePreset = (name, preset) => {
    const presets = cloneDeep(exports.loadOptions().presets || {})
    presets[name] = preset
    console.log(presets)
    exports.saveOptions({ presets })
}
  