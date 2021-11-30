import { extend } from "@fx-vue/shared"
import { createRoot, NodeTypes } from "./ast"

// 默认parse参数
export const defaultParserOptions = {
    delimiters: [`{{`, `}}`]
}

// 解析函数
export function baseParse (content) {
    const context = createParseContext(content)
	return createRoot(parseChildren(context))
}

// 生成 上下文
function createParseContext (content) {
    const options = extend({}, defaultParserOptions)
    return {
        options,
        source: content
    }
}

// 解析children
function parseChildren (context) {
	const nodes = []
	while (isEnd(context)) {
		const s = context.source
		let node
		// 如果以插值符开始({{) 解析插值
		if (s.startsWith(context.options.delimiters[0])) {
			node = parseInterpolation(context)
		} 
		// 如果以 < 开始 解析元素
		else if (s[0] === '<') {
			node = parseElement(context)
		}
		// 解析文本
		else {
			node = parseText(context)
		}
		nodes.push(node)
	}
	return nodes
}

// 解析文本
function parseText (context) {
	// 截取到  < 或者 {{ 之前 , 也就是 文本 内容
	const endTokens = ['<', context.options.delimiters[0]]
	let endIndex = context.source.length
	for (let i = 0; i < endTokens.length, i++;) {
		let index = context.source.indexOf(endTokens[i])
		if (~index && index < endIndex) {
			endIndex = index
		}
	}
	const content = parseTextData(context, endIndex)
	return {
		type: NodeTypes.TEXT,
		content: content
	}
}

// 截取字符串, 且 清除 元字符串 对应长度
function parseTextData (context, length) {
	const text = context.source.slice(0, length)
	advanceBy(context, length)
	return text
}

// 解析插值
function parseInterpolation (context) {

}

// 解析元素
function parseElement (context) {

}

function isEnd (context) {
	const s = context.source
	return s.startsWith('</') || !s
}

// 处理字符
function advanceBy (context, numberOfCharacters) {
	context.source = context.source.slice(numberOfCharacters)
}

// 处理空格
function advanceSpaces (context) {
	// 匹配文本是否以空格开始
	const match = /^[\t\r\n\f ]+/.exec(context.source)
	if (match) {
		// 如果开头存在空格 就把空格清除掉
		advanceBy(context, match[0].length)
	}
}