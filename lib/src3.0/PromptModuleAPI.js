// 收集预选项模块
module.exports = class PromptModuleAPI {
  constructor (creator) {
    this.creator = creator
  }

  // 注入预设选项具体选项(例如babel, ts, vuex)
  injectFeature (feature) {
    this.creator.featurePrompt.choices.push(feature)
  }

  // 注入预设选项内的每个具体细节
  injectPrompt (prompt) {
    this.creator.injectedPrompts.push(prompt)
  }

  // 为某一个预选项注入可选参数
  injectOptionForPrompt (name, option) {
    this.creator.injectedPrompts.find(f => {
      return f.name === name
    }).choices.push(option)
  }

  // 注入用户选择预选项后的回调
  onPromptComplete (cb) {
    this.creator.promptCompleteCbs.push(cb)
  }
}
