import { rendererOptions } from "@fx-vue/runtime-dom"
import { isBoolean, NOOP, ShapeFlags } from "@fx-vue/shared"
import { createAppAPI } from "./apiCreateApp"
import { Fragment, isSameVNodeType, normalizeVNode, Text } from "./vnode"

let renderApi: any = null

// renderApi用来解耦, 接收不同容器的dom操作api
function initRenderApi(options) {
	if (!renderApi) {
		renderApi = {
			// 插入
			hostInsert: options.insert,
			// 删除
			hostRemove: options.remove,
			// 创建元素节点
			hostCreateElement: options.createElement,
			// 创建文本节点
			hostCreateText: options.createText,
			// 创建注释节点
			hostCreateComment: options.createComment,
			// 设置文本节点内容
			hostSetText: options.setText,
			// 设置元素节点内容
			hostSetElementText: options.setElementText,
			// 获取父节点
			hostParentNode: options.parentNode,
			// 获取相邻节点
			hostNextSibling: options.nextSibling,
			hostSetScopeId: NOOP,
			// 克隆节点
			hostCloneNode: options.cloneNode,
			// 插入模板节点
			hostInsertStaticContent: options.insertStaticContent
		}
	}
	return renderApi
}

// 渲染函数
export function render(vnode, container) {
	console.log('render 渲染vnode')
	// 这里默认为浏览器api, 没使用createApp也可以使用render
	initRenderApi(rendererOptions)
	if (vnode == null) {
		if (container._vnode) {
			// 如果存在vnode, 则unmount
			unmount(container._vnode, null, null, true)
		}
	} else {
		// patch
		patch(container._vnode || null, vnode, container)
	}
	// _vnode用于判断container是否进行过渲染
	container._vnode = vnode
}

// 创建renderer函数 返回renderer对象
export function createRenderer(options) {
	return baseCreateRenderer(options)
}

// 返回createApp 常用中main.js中初始化使用
function baseCreateRenderer(options) {
	initRenderApi(options)
	return {
		render,
		createApp: createAppAPI(render)
	}
}

// 根据vnode生成节点
function patch(n1, n2, container, anchor = null, parentComponent = null) {
	console.log('patch patch节点')
	// 如果n1, n2为不同类型的vnode则对n1进行取消挂载
	if (n1 && !isSameVNodeType(n1, n2)) {
		unmount(n1, parentComponent, null, true)
		n1 = null
	}
	// 生成节点的条件需要 根据n2的属性来判断
	const { type, shapeFlag } = n2
	switch (type) {
		case Text:
			// 文本节点
			processText(n1, n2, container, anchor)
			break
		case Fragment:
			// 传送门节点
			processFragment(n1, n2, container, anchor, parentComponent)
			break
		default:
			if (shapeFlag & ShapeFlags.ELEMENT) {
				// 元素节点
				processElement(n1, n2, container, anchor, parentComponent)
			} else if (shapeFlag & ShapeFlags.COMPONENT) {
				// 组件节点
				processComponent(n1, n2, container, anchor, parentComponent)
			}
	}
}

// 处理文本节点
function processText(n1, n2, container, anchor) {
	console.log('processText 处理文本节点')
	// 如果不存在n1,则为第一次渲染, 否则为更新节点
	if (n1 == null) {
		// 创建文本节点, 然后插入到container
		renderApi.hostInsert(
			(n2.el = renderApi.hostCreateText(n2.children)),
			container,
			anchor
		)
	} else {
		// 否则为更新节点
		// 获取node节点el, 且新的node节点el指向旧的node节点el
		const el = (n2.el = n1.el)
		// 判断当内容发生变化, 则进行更新
		if (n2.children !== n1.children) {
			// 设置文本节点内容
			renderApi.hostSetText(el, n2.children)
		}
	}
}

// 处理元素节点
function processElement(n1, n2, container, anchor, parentComponent) {
	console.log('processElement 处理元素节点')
	if (n1 == null) {
		mountElement(n2, container, anchor, parentComponent)
	} else {
		patchElement(n1, n2, container)
	}
}

// 处理传送门节点
function processFragment(n1, n2, container, anchor, parentComponent) {
	console.log('processFragment 处理传送门节点')
	const fragmentStartAnchor = (n2.el = n1 ? n1.el : renderApi.hostCreateText(''))!
	const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : renderApi.hostCreateText(''))!
	if (n1 == null) {
		renderApi.hostInsert(fragmentStartAnchor, container, anchor)
		renderApi.hostInsert(fragmentEndAnchor, container, anchor)
		mountChildren(n2.children, container, fragmentEndAnchor, parentComponent)
	} else {
		patchChildren(n1, n2, container)
	}
}

// 处理组件节点
function processComponent(n1, n2, container, anchor, parentComponent) {
	console.log('processComponent 处理组件节点')
	if (n1 == null) {
		mountComponent(n2, container, parentComponent)
	} else {
		updateComponent(n1, n2, container)
	}
}

// 挂载文本节点
function mountTextNode(vnode, container) {
	console.log('mountTextNode 挂载文本节点')
	const textNode = document.createTextNode(vnode.children)
	container.appendChild(textNode)
}

// 挂载元素节点
function mountElement(vnode, container, anchor, parentComponent) {
	console.log('mountElement 挂载元素节点')
	const { type, props, shapeFlag, children } = vnode
	// 生成元素
	const el = vnode.el = renderApi.hostCreateElement(
		type,
		false,
		props && props.is,
		props
	)
	// 生成子元素
	if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
		// 子节点为文本
		renderApi.hostSetElementText(el, vnode.children as string)
	} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
		// 子节点为数组
		mountChildren(vnode.children, el, null, parentComponent)
	}
	// 生成属性
	mountProps(props, el)
	// 挂载
	container.appendChild(el)
}

// 挂载组件节点
function mountComponent(vnode, container, parentComponent) {
	// 如果是组件 type 内必然有render函数
	const _vnode = vnode.type.render()
	patch(container._vnode, _vnode, container)
}

// 挂载子节点
function mountChildren(children, container, anchor, parentComponent, start = 0) {
	for (let i = start; i < children.length; i++) {
		const child = normalizeVNode(children[i])
		patch(null, child, container, anchor, parentComponent,)
	}
}

const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/
// 挂载属性
function mountProps(props, el) {
	for (const key in props) {
		let value = props[key]
		switch (key) {
			// 类名
			case 'class':
				el.className = value
				break
			// 样式
			case 'style':
				for (const styleName in value) {
					el.style[styleName] = value[styleName]
				}
				break
			default:
				// 事件
				if (/^on[^a-z]/.test(key)) {
					const eventName = key.slice(2).toLowerCase()
					el.addEventListener(eventName, value)
				} else if (domPropsRE.test(key)) {
					// value|checked|selected|muted|disabled 这几种属性直接在dom上赋值
					if (value === '' && isBoolean(el[key])) {
						value = true
					}
					el[key] = value
				} else {
					// 剩下的属性使用attr的api进行操作
					if (value == null || value === false) {
						el.removeAttribute(key)
					} else {
						el.setAttribute(key, value)
					}
				}
				break
		}
	}
}

// @TODO patch元素节点
function patchElement(n1, n2, container) {
	console.log('patchElement patch元素节点')
}

// @TODO patch子元素
function patchChildren(n1, n2, container) {

}

// @TODO 更新组件节点
function updateComponent(n1, n2, container) {
	console.log('updateComponent 更新组件')
}

// 取消挂载
function unmount(vnode, parentComponent, parentSuspense, doRemove = false,) {
	console.log('unmount 取消挂载')
	const { type, shapeFlag } = vnode
	if (shapeFlag & ShapeFlags.COMPONENT) {
		// 取消挂载组件
		unmountComponent(vnode)
	} else if (type === Fragment) {
		// 取消挂载传送门
		unmountFragment()
	}
	// 删除元素
	if (doRemove) {
		remove(vnode)
	}
}

// 取消挂载组件
function unmountComponent(vnode) {

}

// 取消挂载传送门
function unmountFragment() {

}

// 删除节点
function remove(vnode) {
	const { type, el, anchor } = vnode
	// 如果是传送门类型, 则调用专用删除函数
	if (type === Fragment) {
		removeFragment(el, anchor)
		return
	}

	// 删除元素
	renderApi.hostRemove(el)
}

// 删除传送门元素
function removeFragment(cur, end) {
	let next
	while (cur !== end) {
		next = renderApi.hostNextSibling(cur)
		renderApi.hostRemove(cur)
		cur = next
	}
	renderApi.hostRemove(end)
}

