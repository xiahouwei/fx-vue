// SVG命名空间
export const svgNS = 'http://www.w3.org/2000/svg'

const doc = typeof document !== 'undefined' ? document : null

let tempContainer
let tempSVGContainer

// nodeOps内部是各种dom的操作api, 在createRenderer时进行挂载, 这样做的目的是为了解耦, 在不同的容器内可以使用不同的dom api
export const nodeOps = {
	// 插入元素
	insert: (child, parent, anchor) => {
		parent.insertBefore(child, anchor || null)
	},

	// 删除元素
	remove: child => {
		const parent = child.parentNode
		if (parent) {
			parent.removeChild(child)
		}
	},

	// 创建节点
	createElement: (tag, isSVG, is, props) => {
		// 如果是创建svg则用createElementNS, 普通元素用createElement
		const el = isSVG
			? doc.createElementNS(svgNS, tag)
			: doc.createElement(tag, is ? { is } : undefined)
		// select标签需要判断是否设置多选属性multiple(用ctrl进行多选)
		if (tag === 'select' && props && props.multiple != null) {
			el.setAttribute('multiple', props.multiple)
		}
		return el
	},

	// 创建文本节点
	createText: text => doc.createTextNode(text),

	// 创建注释节点
	createComment: text => doc.createComment(text),

	// 仅仅对CDATA片段，注释comment，Processing Instruction节点或text节点有效
	setText: (node, text) => {
		node.nodeValue = text
	},

	// 改变元素文本(纯文本, 不会解析为html)
	setElementText: (el, text) => {
		el.textContent = text
	},

	// 获取父节点
	parentNode: node => node.parentNode,

	// 相邻节点
	nextSibling: node => node.nextSibling,

	// 选择器
	querySelector: selector => doc.querySelector(selector),

	// 设置id
	setScopeId (el, id) {
		el.setAttribute(id, '')
	},

	// 克隆节点
	// 在patchDOMProp中，vue将实际值存储在el._value属性, _value属于自定义属性 cloneNode不会复制自定义属性
	// 未来也要考虑其他的自定义属性
	cloneNode (el) {
		const cloned = el.cloneNode(true)
		if (`_value` in el) {
			cloned._value = el._value
		}
		return cloned
	},

	// 接收一个innerHTML模版字符串（n2.children），并将其插入到createElement创建出的临时容器，将innerHTML中包含的子节点按顺序依次根据anchor插入（决定了removeStaticNode的内容），并返回插入的首尾节点。
	insertStaticContent (content, parent, anchor, isSVG) {
		// 创建临时节点
		const temp = isSVG
			? tempSVGContainer || (tempSVGContainer = doc.createElementNS(svgNS, 'svg'))
			: tempContainer || (tempContainer = doc.createElement('div'))
		// 设置临时节点内容
		temp.innerHTML = content
		// 获取临时节点第一个元素
    	const first = temp.firstChild
    	let node = first
    	let last = node
		// 循环临时节点, insert到parent中
		while (node) {
			last = node
			nodeOps.insert(node, parent, anchor)
			node = temp.firstChild
		}
    	return [first, last]
	}
}