import { extend, isVoidTag, isNativeTag } from "@fx-vue/shared"
import { createRoot, ElementTypes, NodeTypes } from "./ast"

// 默认parse参数
export const defaultParserOptions = {
    delimiters: [`{{`, `}}`],
	isVoidTag,
	isNativeTag
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
	// 如果有文本, 或者文本不是以 </ 开始 就进行解析
	while (!isEnd(context)) {
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
// <div>text{{a}}</div>  => text
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
// <div>text{{a}}</div>  => a
function parseInterpolation (context) {
	// open为{{  close为}}
	const [open, close] = context.options.delimiters
	advanceBy(context, open.length)
	const closeIndex = context.source.indexOf(close)
	const content = parseTextData(context, closeIndex).trim()
	advanceBy(context, close.length)

	return {
		type: NodeTypes.INTERPOLATION, // 插值
		content: {
			type: NodeTypes.SIMPLE_EXPRESSION, // 简单表达式
			content,
			isStatic: false
		}
	}
}

// 解析元素
function parseElement (context) {
	// start Tag
	const element = parseTag(context)
	// 如果是自闭和标签 直接返回
	if (element.isSelefClosing || context.options.isVoidTag(element.tag)) {
		return element
	}
	// parseChildren
	element.children = parseChildren(context)
	// end Tag
	parseTag(context)
	return element
}

function parseTag (context) {
	// 通过正则获取标签名
	// <div id="foo" v-if="ok">text{{a}}</div>   => <div
	const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)
	const tag = match[1]

	advanceBy(context, match[0].length)
	advanceSpaces(context)

	const { props, directives } = parseAttributes(context)

	// 判断是否是自闭合标签
	const isSelfClosing = context.source.startsWith('/>')
	advanceBy(context, isSelfClosing ? 2 : 1)

	// 判断是组件 还是 元素
	const tagType = isComponent(tag, context) ? ElementTypes.COMPONENT : ElementTypes.ELEMENT

	return {
		type: NodeTypes.ELEMENT,
		tag, // 标签名
		tagType, // 是组件还是原生元素
		props, // 属性节点数组
		directives, // 指令书组
		isSelefClosing: Boolean, // 是否是自闭合标签
		children: []
	}
}

function isComponent (tag, context) {
	// 不是原生标签类型 就是组件
	return !context.options.isNativeTag(tag)
}

function parseAttributes (context) {
	const props = []
	const directives = []
	// 如果有文本, 或者文本不是以 </ 开始 就进行解析
	while (context.source.length || context.source.startsWith('>') || context.source.startsWith('/>')) {
		let attr = parseAttribute(context)
		if (attr.type === NodeTypes.DIRECTIVE) {
			directives.push(attr)
		} else {
			props.push(attr)
		}
	}
	return {
		props,
		directives
	}
}

// @TODO
function parseAttribute (context) {
	const match = //
}

function isEnd (context) {
	const s = context.source
	return s.startsWith('</') || !s
}

// 处理字符 吃掉某个长度的字符串
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