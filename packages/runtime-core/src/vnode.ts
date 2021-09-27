import { isArray, isObject, isString, ShapeFlags } from "@fx-vue/shared"


export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')
export const Comment = Symbol('Comment')
export const Static = Symbol('Static')

// 创建vnode
export function createVNode(type, props?: any, children?: any) {
	if (!props) {
		props = {}
	}
	// type 为 string : createVNode("div")
	// type 为 object : createVNode(App) 用户传入了options

	// 根据传入的节点类型type生成shapeFlag
	const shapeFlag = isString(type)
		? ShapeFlags.ELEMENT
		: isObject(type)
			? ShapeFlags.STATEFUL_COMPONENT
			: 0

	const vnode = {
		el: null,
		component: null,
		key: props.key || null,
		type,
		props,
		children,
		shapeFlag,
		// anchor是Fragment的专用属性
		anchor: null
	}

	// 格式化children, 以及通过位运算 更新shapeFlag
	normalizeChildren(vnode, children)

	return vnode
}

// 格式化children
export function normalizeChildren(vnode, children) {
	let type = 0
	const { shapeFlag } = vnode
	// children为 null / undifined
	if (children == null) {
		children = null
	} else if (isArray(children)) {
		// children为数组 更新父的shapFlag
		type = ShapeFlags.ARRAY_CHILDREN
	} else if (typeof children === 'object') {
		// 如果children是object 暂时只标识slots_children这种类型
		// 这里父暂时只有 element 和 component
		// 只要父是component, 那么 children就是 slots
		if (shapeFlag & ShapeFlags.ELEMENT) {
			// 如果父是element类型, 则children不会是slots
		} else {
			// children是slots, 更新父的shapFlag
			type = ShapeFlags.SLOTS_CHILDREN
		}
	} else {
		// 剩下的children都格式化为文本
		children = String(children)
		type = ShapeFlags.TEXT_CHILDREN
	}
	// 赋值children
	vnode.children = children
	// 赋值shapeFlag
	vnode.shapeFlag |= type
}

// 格式化vnode
export function normalizeVNode(child) {
	if (child == null || typeof child === 'boolean') {
		// empty placeholder
		return createVNode(Comment)
	} else if (isArray(child)) {
		// fragment
		return createVNode(Fragment, null, child)
	} else if (typeof child === 'object') {
		// already vnode, this should be the most common since compiled templates
		// always produce all-vnode children arrays
		return child.el === null ? child : cloneVNode(child)
	} else {
		// strings and numbers
		return createVNode(Text, null, String(child))
	}
}

export function cloneVNode (vnode) {
	const cloned = {}
	for (const key of vnode) {
		cloned[key] = vnode[key]
	}
	return cloned
}

// 判断是否为同类型的vnode
export function isSameVNodeType(n1, n2) {
	return n1.type === n2.type && n1.key === n2.key
}
