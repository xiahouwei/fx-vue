module.exports = cli => {
    // 添加bable插件预选项
    cli.injectFeature({
      name: 'Babel',
      value: 'babel',
      short: 'Babel',
      description: 'Transpile modern JavaScript to older versions (for compatibility)',
      link: 'https://babeljs.io/',
      checked: true
    })
  
    // 用户选择babel后的回调
    cli.onPromptComplete((answers, options) => {
      if (answers.features.includes('ts')) {
        if (!answers.useTsWithBabel) {
          return
        }
      } else {
        if (!answers.features.includes('babel')) {
          return
        }
      }
      options.plugins['@vue/cli-plugin-babel'] = {}
    })
  }
  