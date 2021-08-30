const inquirer = require('inquirer')
const async = require('async')


// 收集用户填写的项目信息
function ask (prompts, data, done) {
    // 按顺序循环异步执行
    async.eachSeries(Object.keys(prompts), (key, next) => {
        prompt(data, key, prompts[key], next)
    }, done)
}

function prompt (data, key, prompt, done) {
    inquirer.prompt([{
        type: prompt.type,
        name: key,
        message: prompt.message,
        default: prompt.default
    }]).then(answers => {
        if (typeof answers[key] === 'string') {
            data[key] = answers[key].replace(/"/g, '\\"')
        } else {
            data[key] = answers[key]
        }
        done()
    }).catch(done)
}

module.exports = ask