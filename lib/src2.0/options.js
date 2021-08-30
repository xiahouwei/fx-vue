const path = require('path')
const metadata = require('read-metadata')
const exists = require('fs').existsSync
const getGitUser = require('./git-user')
const validateName = require('validate-npm-package-name')

// 获取并返回项目配置
module.exports = function options (name, dir) {
    // 获取meta.json或meta.js文件内的数据
    const opts = getMetadata(dir)
    // 设置默认项目名称
    setDefault(opts, 'name', name)
    // 校验项目名称是否符合规则
    setValidateName(opts)
    // 获取当前git用户名称,如果存在, 则设置为默认项目作者名称
    const author = getGitUser()
    if (author) {
        setDefault(opts, 'author', author)
    }
    return opts
}

// 查找template内meta.js文件, 或meta.json文件, 并且返回meta数据
function getMetadata (dir) {
    const json = path.join(dir, 'meta.json')
    const js = path.join(dir, 'meta.js')
    let opts = {}

    if (exists(json)) {
        opts = metadata.sync(json)
    } else if (exists(js)) {
        const req = require(path.resolve(js))
        if (req !== Object(req)) {
            throw new Error('meta.js needs to expose an object')
        }
        opts = req
    }

    return opts
}

// 设置默认配置数据
function setDefault (opts, key, val) {
    if (opts.schema) {
        opts.prompts = opts.schema
        delete opts.schema
    }
    const prompts = opts.prompts || (opts.prompts = {})
    if (!prompts[key] || typeof prompts[key] !== 'object') {
        prompts[key] = {
            'type': 'string',
            'default': val
        }
    } else {
        prompts[key]['default'] = val
    }
}

// 校验项目名称是否符合规则
function setValidateName (opts) {
    const name = opts.prompts.name
    const customValidate = name.validate
    name.validate = name => {
        const its = validateName(name)
        if (!its.validForNewPackages) {
        const errors = (its.errors || []).concat(its.warnings || [])
        return 'Sorry, ' + errors.join(' and ') + '.'
        }
        if (typeof customValidate === 'function') return customValidate(name)
        return true
    }
}