module.exports = cli => {
  // 添加css预解析插件预选项
  cli.injectFeature({
    name: 'CSS Pre-processors',
    value: 'css-preprocessor',
    description: 'Add support for CSS pre-processors like Sass, Less or Stylus',
    link: 'https://cli.vuejs.org/guide/css.html'
  })

  const notice = 'PostCSS, Autoprefixer and CSS Modules are supported by default'

  // css预解析可选 sass, less, stylus
  cli.injectPrompt({
    name: 'cssPreprocessor',
    when: answers => answers.features.includes('css-preprocessor'),
    type: 'list',
    message: `Pick a CSS pre-processor${process.env.VUE_CLI_API_MODE ? '' : ` (${notice})`}:`,
    description: `${notice}.`,
    choices: [
      {
        name: 'Sass/SCSS',
        value: 'sass'
      },
      {
        name: 'Less',
        value: 'less'
      },
      {
        name: 'Stylus',
        value: 'stylus'
      }
    ]
  })

  // 交互后的回调
  cli.onPromptComplete((answers, options) => {
    if (answers.cssPreprocessor) {
      options.cssPreprocessor = answers.cssPreprocessor
    }
  })
}
