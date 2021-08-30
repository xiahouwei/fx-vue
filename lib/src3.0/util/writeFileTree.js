const fs = require('fs-extra')
const path = require('path')

function deleteRemovedFiles (directory, newFiles, previousFiles) {
    // 找出新文件内不存在的旧文件
    const filesToDelete = Object.keys(previousFiles).filter(filename => !newFiles[filename])

    // 删除旧文件
    return Promise.all(filesToDelete.map(filename => {
        return fs.unlink(path.join(directory, filename))
    }))
}

module.exports = async function writeFileTree (dir, files, previousFiles) {
    if (previousFiles) {
        // 删除原来的文件
        await deleteRemovedFiles(dir, files, previousFiles)
    }
    Object.keys(files).forEach((name) => {
        const filePath = path.join(dir, name)
        fs.ensureDirSync(path.dirname(filePath))
        fs.writeFileSync(filePath, files[name])
    })
}