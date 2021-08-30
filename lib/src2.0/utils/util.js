// 通过环境变量获取用户home目录, 或者使用user-home插件来获取
const downloadDirectory = `${process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE']}/.fx-vue-templates`


// 获取模板远程仓库地址
function getTemplateUrl (templateName) {
    return templateName === 'fx' ? 'xiahouwei/fx-vue-cli-template' : `vuejs-templates/${templateName}`
}

module.exports = {
    downloadDirectory,
    getTemplateUrl
}