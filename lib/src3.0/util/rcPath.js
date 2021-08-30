const path = require('path')
const presetDirectory = `${process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE']}`

exports.getRcPath = file => {
    return path.join(presetDirectory, file)
}
  