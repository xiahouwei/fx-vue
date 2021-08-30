const chalk = require('chalk')
const { clearConsole } = require('@vue/cli-shared-utils')

exports.generateTitle = async function (checkUpdate) {

  let title = chalk.bold.green(`FX Vue CLI`)

  return title
}

exports.clearConsole = async function clearConsoleWithTitle (checkUpdate) {
  const title = await exports.generateTitle(checkUpdate)
  clearConsole(title)
}
