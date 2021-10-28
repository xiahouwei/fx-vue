import { rendererOptions } from "@fx-vue/runtime-dom"
import { EMPTY_ARR, EMPTY_OBJ, isReservedProp, NOOP, ShapeFlags } from "@fx-vue/shared"
import { createAppAPI } from "./apiCreateApp"
import { Fragment, isSameVNodeType, normalizeVNode, Text } from "./vnode"

export const enum MoveType {
	ENTER,
	LEAVE,
	REORDER
}

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
			hostInsertStaticContent: options.insertStaticContent,
			// patch属性
			hostPatchProp: options.patchProp
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
		// 设置n1为null, 就不会进入patch了, 而是进行mount
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
			// 碎片节点
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
		patchElement(n1, n2, container, anchor, parentComponent)
	}
}

// 处理碎片节点
function processFragment(n1, n2, container, anchor, parentComponent) {
	console.log('processFragment 处理碎片节点')
	// 这两个空文本节点, 一个作为el, 一个作为anchor 且把它们赋值到vnode上
	const fragmentStartAnchor = (n2.el = n1 ? n1.el : renderApi.hostCreateText(''))!
	const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : renderApi.hostCreateText(''))!
	if (n1 == null) {
		// 先插入空节点
		renderApi.hostInsert(fragmentStartAnchor, container, anchor)
		renderApi.hostInsert(fragmentEndAnchor, container, anchor)
		// 再挂载子元素, 这里锚点传入, 挂载的子元素位置就是正确的
		mountChildren(n2.children, container, fragmentEndAnchor, parentComponent)
	} else {
		patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent)
	}
}

// 处理组件节点
function processComponent(n1, n2, container, anchor, parentComponent) {
	console.log('processComponent 处理组件节点')
	if (n1 == null) {
		mountComponent(n2, container, anchor, parentComponent)
	} else {
		updateComponent(n1, n2, container)
	}
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
	if (props) {
		for (const key in props) {
			// 非vue保留字属性, 设置到元素el上
			if (!isReservedProp(key)) {
				renderApi.hostPatchProp(el, key, null, props[key])
			}
		}
	}
	// 挂载 这里传入的anchor参数 是为了保证fragment挂载位置正确
	renderApi.hostInsert(el, container, anchor)
}

// 挂载组件节点
function mountComponent(vnode, container, anchor, parentComponent) {
	// 如果是组件 type 内必然有render函数
	const instance = vnode
	instance.$vnode = instance.type.render()
	patch(container._vnode, instance.$vnode, container, anchor, parentComponent)
}

// 挂载子节点
function mountChildren(children, container, anchor, parentComponent, start = 0) {
	for (let i = start; i < children.length; i++) {
		const child = normalizeVNode(children[i])
		patch(null, child, container, anchor, parentComponent)
	}
}

// patch元素节点
function patchElement(n1, n2, container, anchor, parentComponent) {
	console.log('patchElement patch元素节点')
	// 需要把 el 挂载到新的 vnode
	const el = (n2.el = n1.el)
	// 对比 props
	const oldProps = (n1 && n1.props) || EMPTY_OBJ
	const newProps = n2.props || EMPTY_OBJ
	patchProps(el, n2, oldProps, newProps)
	// 对比 children
	patchChildren(n1, n2, el, anchor, parentComponent);
}

// patch属性
function patchProps(el, vnode, oldProps, newProps) {
	// 如果新旧属性一致, 则不处理
	if (oldProps === newProps) {
		return false
	}
	// 循环新属性, 设置到元素el上
	for (const key in newProps) {
		// 如果是vue保留字属性 则跳过
		if (isReservedProp) continue
		const next = newProps[key]
		const prev = oldProps[key]
		if (prev !== next) {
			renderApi.hostPatchProp(el, key, prev, next)
		}
	}
	// 循环旧属性, 把新属性里没有的旧属性删除掉
	if (oldProps !== EMPTY_OBJ) {
		for (const key in oldProps) {
			if (!(key in newProps)) {
				renderApi.hostPatchProp(el, key, oldProps[key], null)
			}
		}
	}
}

/**
 * patch子元素
 * 根据子元素的类型, 有9种可能
 * 1.n2 text n1 text => 更新textContent
 * 2.n2 text n1 array => 删除n1(unmountChildren), 更新textContent
 * 3.n2 text n1 null => 更新textContent
 * 4.n2 array n1 text => 删除n1  mount n2
 * 5.n2 array n1 array => patchArrayChildren
 * 6.n2 array n1 null => mount n2
 * 7.n2 null n1 text => 删除 n1
 * 8.n2 null n1 array => 删除 n1 (unmountChildren)
 * 9.n2 null n1 null => 不处理
*/
function patchChildren(n1, n2, container, anchor, parentComponent) {
	const { shapeFlag: prevShapeFlag, children: c1 } = n1
	const { shapeFlag, children: c2 } = n2

	// n2为text, 则n1有三种可能
	if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
		// 如果n1为数组, 先删除n1
		if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			unmountChildren(c1, parentComponent)
		}
		// 三种情况最后都要更新textContent
		if (c2 !== c1) {
			renderApi.hostSetElementText(container, c2)
		}
	} else {
		// 否则n2可能是null 或者 array
		// 如果n1是array
		if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			// 如果n2也是array
			if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				// 则进行patch子节点
				// @TODO 暂时判断是否有key
				if (c1[0] && c1[0].key != null && c2[0] && c2[0].key != null) {
					patchKeyedChildren(c1, c2, container, anchor, parentComponent)
				} else {
					patchUnkeyedChildren(c1, c2, container, anchor, parentComponent)
				}
			} else {
				// 否则删除n1, 没有n2, 仅仅是删除n1
				unmountChildren(c1, parentComponent, true)
			}
		} else {
			// 如果n1是null或者text
			// 如果n1是text, 必然要删除n1
			if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
				renderApi.hostSetElementText(container, '')
			}
			// 如果n2是array, 必然要mount n2
			if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				mountChildren(c2, container, anchor, parentComponent)
			}
		}
	}
}

// @TODO 更新组件节点
function updateComponent(n1, n2, container) {
	console.log('updateComponent 更新组件')
}

// 取消挂载
function unmount(vnode, parentComponent, parentSuspense, doRemove = false) {
	console.log('unmount 取消挂载')
	const { type, shapeFlag } = vnode
	if (shapeFlag & ShapeFlags.COMPONENT) {
		// 取消挂载组件
		unmountComponent(vnode)
	} else if (type === Fragment) {
		// 取消挂载碎片节点
		unmountChildren(vnode, parentComponent)
	}
	// 删除元素
	if (doRemove) {
		remove(vnode)
	}
}

// 取消挂载子元素
function unmountChildren(children, parentComponent, doRemove = false, start = 0) {
	for (let i = start; i < children.length; i++) {
		unmount(children[i], parentComponent, null, doRemove)
	}
}

// 取消挂载组件
function unmountComponent(vnode) {

}

// 删除节点
function remove(vnode) {
	const { type, el, anchor } = vnode
	// 如果是碎片类型, 则调用专用删除函数
	if (type === Fragment) {
		removeFragment(el, anchor)
		return
	}

	// 删除元素
	if (el) {
		renderApi.hostRemove(el)
	}
}

// 删除碎片元素
function removeFragment(cur, end) {
	// cur为开始的text节点, end为结束的text节点
	let next
	// 通过 指针指向下一个, 删除当前, 当前指针指向下一个, 重复这个步骤, 达到删除 start => end 所有节点
	while (cur !== end) {
		next = renderApi.hostNextSibling(cur)
		renderApi.hostRemove(cur)
		cur = next
	}
	// 最后把结束节点删除
	renderApi.hostRemove(end)
}

// patch 没有key的子节点, 因为没有key, 只能根据索引比较
function patchUnkeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
	console.log('patchUnKeyedChildren')
	console.log(c1)
	console.log(c2)
	const oldLenght = c1.length
	const newLenght = c2.length
	const commonLength = Math.min(oldLenght, newLenght)
	// 循环公共长度, 进行patch
	for (let i = 0; i < commonLength; i++) {
		patch(c1[i], c2[i], container, parentAnchor, parentComponent)
	}
	if (oldLenght > newLenght) {
		// 旧节点大于新节点, 需要删除
		unmountChildren(c1.slice(commonLength), parentComponent, true)
	} else {
		// 旧节点小于新节点, 需要挂载
		mountChildren(c2.slice(commonLength), container, parentAnchor, parentComponent)
	}
}

// 复用型diff patch有key的子节点, 新旧子节点做循环, 找到相同的就path, 如果位置变了就insert, 新的多了就创建, 旧的多了就删除
function patchKeyedChildrenReuse(c1, c2, container, parentAnchor, parentComponent) {
	console.log('patchKeyedChildren')
	console.log(c1)
	console.log(c2)
	// 空间换时间, 先循环老节点, 创建老节点map
	const map = new Map()
	c1.forEach((prev, index) => {
		map.set(prev.key, { prev, index })
	})
	// 设置最大索引指针为0
	let maxNewIndexSoFar = 0
	// 循环新结点, 目的是找出新节点与老节点相同的(通过key)
	for (let i = 0; i < c2.length; i++) {
		// 找出新节点
		const next = c2[i]
		// 如果可以从旧节点里找出
		if (map.has(next.key)) {
			// 新旧节点patch更新
			const { prev, index } = map.get(next.key)
			patch(prev, next, container, parentAnchor, parentComponent)
			// 下面要进行移动的操作了
			// 如果是 [1,2,3] => [1,2,3] 是不需要移动的, 因为索引是递增的
			// 如果是 [1,2,3] => [3,1,2] 索引递增的状态被打破了, 就要进行节点移动了
			// 如果节点的旧索引小于指针(指针会保留遍历过的最大索引), 说明这个节点 打破了递增状态, 那就移动他
			if (index < maxNewIndexSoFar) {
				// 找出新节点 的 前一个节点 的 真实dom 的 后一个dom的位置, 然后把新节点插入
				const anchor = c2[i - 1].el.nextSibling
				container.insertBefore(next.el, anchor)
			} else {
				// 指针永远保留最大的索引
				maxNewIndexSoFar = index
			}
			// 操作完dom, 把map对应的元素删除
			map.delete(next.key)
		} else {
			// 如果找不到, 就创建
			// 如果当前是第0个, 把新节点插入到 c1[0].el 即第一个旧节点之前
			// 如果不是第0个, 通过c2[i - 1].el.nextSibling
			// 插入到新节点 前一个节点(此时,此节点必然已渲染) 的真实dom 的后一个节点之前
			const anchor = i === 0 ? c1[0].el : c2[i - 1].el.nextSibling
			patch(null, next, container, anchor)
		}
	}
	// 这里再循环的 必然是要销毁的节点了
	map.forEach(({ prev }) => {
		unmount(prev, parentComponent, null, true)
	})
}

// 双端比较型diff
function patchKeyedChildrenDoubleEnd(c1, c2, container, parentAnchor, parentComponent) {
	// 声明四个指针, 分别指向旧首, 旧尾, 新首, 新尾
	let oldStartIdx = 0
	let oldEndIdx = c1.length - 1
	let newStartIdx = 0
	let newEndIdx = c2.length - 1
	// 声明指针对应的VNode
	let oldStartVNode = c1[oldStartIdx]
	let oldEndVNode = c1[oldEndIdx]
	let newStartVNode = c2[newStartIdx]
	let newEndVNode = c2[newEndIdx]
	// 旧首 小于等于 旧尾 且 新首 小于等于 新尾, 就说明有需要循环比较的节点存在
	while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
		if (!oldStartVNode) {
			// 如果旧首节点不存在 证明这个节点刚才移动过, 只需要更新指针 旧首向后进一位
			oldStartVNode = c1[++oldStartIdx]
		} else if (!oldEndVNode) {
			// 如果旧尾节点不存在 证明这个节点刚才移动过, 只需要更新指针 旧尾向前进一位
			oldEndVNode = c1[--oldEndIdx]
		} else if (oldStartVNode.key === newStartVNode.key) {
			// 首首对比 key相同 patch更新
			patch(oldStartVNode, newStartVNode, container, parentAnchor, parentComponent)
			// 更新指针
			// 旧首向后进一位
			oldStartVNode = c1[++oldStartIdx]
			// 新首向后进一位
			newStartVNode = c2[++newStartIdx]
		} else if (oldEndVNode.key === newEndVNode.key) {
			// 尾尾对比 key相同 patch更新
			patch(oldEndVNode, newEndVNode, container, parentAnchor, parentComponent)
			// 更新指针
			// 旧尾向前进一位
			oldEndVNode = c1[--oldEndIdx]
			// 新尾向前进一位
			newEndVNode = c1[--newEndIdx]
		} else if (oldStartVNode.key === newEndVNode.key) {
			// 旧首, 新尾对比 key相同 patch更新
			patch(oldStartVNode, newEndVNode, container, parentAnchor, parentComponent)
			// 把旧首 移动到 旧尾位置
			container.insertBefore(oldStartVNode.el, oldEndVNode.el.nextSibling)
			// 更新指针
			// 旧首向后进一位
			oldStartVNode = c1[++oldStartIdx]
			// 新尾向前进一位
			newEndVNode = c2[--newEndIdx]
		} else if (oldEndVNode.key === newStartVNode.key) {
			// 旧尾 新首对比 key相同 patch更新
			patch(oldEndVNode, newStartVNode, container, parentAnchor, parentComponent)
			// 把旧尾 移动到 新首位置
			container.insertBefore(oldEndVNode.el, oldStartVNode.el)
			// 更新指针
			// 旧尾向前进一位
			oldEndVNode = c1[--oldEndIdx]
			// 新首向后进一位
			newStartVNode = c2[++newStartIdx]
		} else {
			// 找到旧节点中 与 新首 相同key的节点
			const indexInOld = c1.findIndex(node => node.key === newStartVNode)
			if (~indexInOld) {
				// 如果找到了进行patch更新
				const moveVNode = c1[indexInOld]
				patch(moveVNode, newStartVNode, container, parentAnchor, parentComponent)
				// 把此节点移动到 旧首之前位置
				container.insertBefore(moveVNode.el, oldStartVNode.el)
				// 把此节点原来的位置置空, 置空的目的在下次循环到这里的时候 进行忽略处理
				c1[indexInOld] = undefined
			} else {
				// 如果没找到, 则这个节点需要挂载, 挂载后的位置就是旧首之前, 也就是首位
				patch(null, newStartVNode, container, oldStartVNode.el)
			}
			// 更新指针
			// 新首向后进一位
			newStartVNode = c2[++newStartIdx]
		}
		// 循环结束后, 发现旧尾指针 小于 旧首指针, 这时看看新节点是不是有没有匹配key的节点(新节点数量>旧节点数量), 要挂载
		if (oldEndIdx < oldStartIdx) {
			// 如果新首到新尾有一个或多个, 需要把这些没有对应key的节点 挂载起来
			for (let i = newStartIdx; i <= newEndIdx; i++) {
				patch(null, c2[i], container, oldStartVNode.el)
			}
		}
		// 如果循环后, 新尾 小于 新首, 这时看看旧节点是不是有没有匹配key的节点(旧节点数量>新节点数量), 要卸载
		else if (newEndIdx < newStartIdx) {
			// 如果旧首到旧尾有一个或多个, 需要把这些没有对应key的节点 卸载
			for (let i = oldStartIdx; i <= oldEndIdx; i++) {
				unmount(c1[i], parentComponent, null, true)
			}
		}
	}
}

// 最长增长子序列的diff算法
// function patchKeyedChildren (c1, c2, container, parentAnchor, parentComponent) {
// 	// j记录的是老元素 从首位开始 找相同key的新元素, 一旦找不到就停止
// 	let j = 0
// 	let prevVNode = c1[j]
// 	let nextVNode = c2[j]
// 	let prevEnd = c1.length - 1
// 	let nextEnd = c2.length - 1
// 	// 从开头比较, 如果key相同就pacth, 如果不同就停止
// 	// 再从末尾比较, 如果key相同就patch, 如果不同就停止
// 	outer: {
// 		while (prevVNode.key === nextVNode.key) {
// 			patch(prevVNode, nextVNode, container, parentAnchor, parentComponent)
// 			j++
// 			if (j > prevEnd || j > nextEnd) {
// 				break outer
// 			}
// 			prevVNode = c1[j]
// 			nextVNode = c2[j]
// 		}
// 		prevVNode = c1[prevEnd]
// 		nextVNode = c2[nextEnd]
// 		while (prevVNode.key === nextVNode.key) {
// 			patch(prevVNode, nextVNode, container, parentAnchor, parentComponent)
// 			prevEnd--
// 			nextEnd--
// 			if (j > prevEnd || j > nextEnd) {
// 				break outer
// 			}
// 			prevVNode = c1[prevEnd]
// 			nextVNode = c2[nextEnd]
// 		}
// 	}
// 	// 相同的比较完了, 要把从索引j到末尾, 老元素不存在的新元素挂载
// 	if (j > prevEnd && j <= nextEnd) {
// 		const nextPos = nextEnd + 1
// 		const refNode = nextPos < c2.length ? c2[nextPos].el : null
// 		while (j <= nextEnd) {
// 			patch(null, c2[j++], container, refNode, parentComponent)
// 		}
// 	} else if (j > nextEnd) {
// 		// 再把从索引j开始, 新元素没有的老元素卸载
// 		while (j <= prevEnd) {
// 			unmount(c1[j], parentComponent, null, true)
// 		}
// 	} else {
// 		// 下面是进行移动
// 		// nextEnd是尾相等的索引, 他的前一位就是 开始比较不同的索引
// 		const nextLeft = nextEnd - j + 1
// 		// source数组作用是 生成一个 与 待比较新元素个数相同的 每个值为-1(-1证明没有相同key的老元素) 的数组 
// 		const source = []
// 		for (let i = 0; i < nextLeft; i++) {
// 			source.push(-1)
// 		}
// 		const prevStart = j
// 		const nextStart = j
// 		let moved = false
// 		let pos = 0
// 		// 生成索引表
// 		const keyIndex = {}
// 		for (let i = nextStart; i <= nextEnd; i++) {
// 			keyIndex[c2[i].key] = i
// 		}
// 		// 如果进行了patch, 就记录一下
// 		let patched = 0
// 		// 遍历旧子元素剩余未处理的节点
// 		for (let i = prevStart; i <= prevEnd; i++) {
// 			prevVNode = c1[i]
// 			// 已更新的节点, 要小于需要更新的节点, 才会patch, 否则就删除
// 			if (patched < nextLeft) {
// 				// 通过索引表 找出新子元素 有相同key的节点的位置
// 				const k = keyIndex[prevVNode.key]
// 				// 如果找到了 就进行patch
// 				if (typeof k !== 'undefined') {
// 					nextVNode = c2[k]
// 					patch(prevVNode, nextVNode, container, parentAnchor, parentComponent)
// 					patched++
// 					// 更新source, 把-1更新为 当前的索引
// 					source[k - nextStart] = i
// 					// 判断是否需要移动
// 					if (k < pos) {
// 						moved = true
// 					} else {
// 						pos = k
// 					}
// 				} else {
// 					// 如果没找到就移除
// 					unmount(prevVNode, parentComponent, null, true)
// 				}
// 			} else {
// 				unmount(prevVNode, parentComponent, null, true)
// 			}

// 			if (moved) {
// 				const seq = getSequence(source)
// 				// j 指向最长递增子序列的最后一个值
// 				let j = seq.length - 1
// 				// 从后向前遍历新 children 中的剩余未处理节点
// 				for (let i = nextLeft - 1; i >= 0; i--) {
// 					if (i === -1) {
// 						// 作为全新的节点挂载
// 						const pos = i + nextStart
// 						const nextVNode = c2[pos]
// 						const nextPos = pos + 1
// 						patch(null, nextVNode, container, nextPos < c2.length ? c2[nextPos].el : null, parentComponent)
// 					} else if (i !== seq[j]) {
// 						// 说明该节点需要移动
// 						const pos = i + nextStart
// 						const nextVNode = c2[pos]
// 						const nextPos = pos + 1
// 						container.insertBefore(nextVNode.el, nextPos < c2.length ? c2[nextPos].el : null)
// 					} else {
// 						// 当 i === seq[j] 时，说明该位置的节点不需要移动
// 						// 并让 j 指向下一个位置
// 						j--
// 					}
// 				}
// 			}
// 		}
// 	}
// }

// 最长增长子序列的diff算法
function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
	// 比较索引
	let i = 0
	// 新节点的长度
	const l2 = c2.length
	// 旧节点末尾指针
	let e1 = c1.length - 1
	// 新节点末尾指针
	let e2 = l2 - 1
	// 1.从首至尾依次对比
	while (i <= e1 && i <= e2) {
		const n1 = c1[i]
		const n2 = c2[i]
		// 如果发现相同key的节点则patch, 否则跳出循环
		if (isSameVNodeType(n1, n2)) {
			patch(n1, n2, container, parentAnchor, parentComponent)
		} else {
			break
		}
		i++
	}
	// 2.从尾至首依次对比
	while (i <= e1 && i <= e2) {
		const n1 = c1[e1]
		const n2 = c2[e2]
		// 如果发现相同key的节点则patch, 否则跳出循环
		if (n1 && n2 && isSameVNodeType(n1, n2)) {
			patch(n1, n2, container, parentAnchor, parentComponent)
		} else {
			break
		}
		e1--
		e2--
	}
	// 3.[1, 2, 3] => [1, 4, 2, 3]这种情况,要处理4 (i:1, e1:0, e2:1)
	// 当前后对比结束, 比较索引比旧节点末尾指针大(证明旧节点遍历完了), 且比新节点末尾指针小, 说明有没挂载的新节点
	if (i > e1) {
		if (i <= e2) {
			// nextPos是已经处理的新节点 的 最后一个的末尾指针
			const nextPos = e2 + 1
			// 设置锚点, 这个已处理新节点末尾指针小于新节点个数, 则插到已处理末尾新节点之前, 否则就插入到最后
			const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor
			while (i <= e2) {
				patch(null, c2[i], container, anchor, parentComponent)
				i++
			}
		}
	}
	// 4.[1, 2, 3, 4] => [1, 3, 4]这种情况,要处理2
	// 当前后对比结束, 比较索引比新节点末尾指针大(证明新节点遍历完了), 且比旧节点末尾指针小, 说明有没写在的旧节点
	else if (i > e2) {
		while (i <= e1) {
			unmount(c1[i], parentComponent, null, true)
			i++
		}
	}
	// 5.未知序列的处理
	// a b [c d e] f g
	// a b [d e c h] f g
	// i = 2, e1 = 4, e2 = 5
	else {
		// 旧起始索引
		const s1 = i
		// 新起始索引
		const s2 = i
		// 5.1 创建未处理节点索引map
		const keyToNewIndexMap = new Map()
		// 循环 待处理新节点, 设置map, key为节点key, value为节点本身索引
		// {d: 2, e: 3, c: 4, h: 5}
		for (i = s2; i <= e2; i++) {
			const nextChild = c2[i] || {}
			if (nextChild.key != null) {
				keyToNewIndexMap.set(nextChild.key, i)
			}
		}
		console.log('keyToNewIndexMap', keyToNewIndexMap)
		// 5.2 从后向前循环遍历需要patch的旧节点, 且patch
		let j
		// 待处理老节点指针, 用来标记当前已经遍历了几个待处理老节点
		let patched = 0
		// 新节点中待处理的节点数[d e c h] 4个
		const toBePatched = e2 - s2 + 1
		// 节点是否需要移动的标记
		let moved = false
		// 最大索引指针
		let maxNewIndexSoFar = 0
		// 待处理新节点对应旧节点索引数组, 简称 新对旧索引数组
		const newIndexToOldIndexMap = new Array(toBePatched)
		// 新对旧索引数组初始化每个元素为0 [0, 0, 0, 0]
		for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0
		// 循环 待处理旧节点
		for (i = s1; i <= e1; i++) {
			const prevChild = c1[i] || {}
			// 如果当前已遍历的待处理老节点大于待处理新节点, 说明剩下的待处理老节点都需要卸载
			if (patched >= toBePatched) {
				unmount(prevChild, parentComponent, null, true)
				continue
			}
			// 如果当前遍历的待处理旧节点有key,从待处理新节点map取出对应key的待处理新节点的index (d:2)
			let newIndex
			if (prevChild.key != null) {
				newIndex = keyToNewIndexMap.get(prevChild.key)
			} else {
				// 如果不存在key, 循环待处理新结点, 试着找出相同类型的节点, newIndex赋值他的索引
				for (j = s2; j <= e2; j++) {
					if (
						newIndexToOldIndexMap[j - s2] === 0 && isSameVNodeType(prevChild, c2[j])
					) {
						newIndex = j
						break
					}
				}
			}
			
			if (newIndex === undefined) {
				// newIndex不存在证明没有可复用的旧节点, 需要卸载这个待处理旧节点
				unmount(prevChild, parentComponent, null, true)
			} else {
				// 如果找到了 则说明可以复用, 新对旧索引数组 把新节点都赋值上对应的旧节点索引(对应不上的还是0)
				// [4, 5, 3, 0]
				newIndexToOldIndexMap[newIndex - s2] = i + 1
				if (newIndex >= maxNewIndexSoFar) {
					// 如果索引大于最大索引指针, 更新索引指针
					maxNewIndexSoFar = newIndex
				} else {
					// 如果索引小于最大索引指针, 说明需要移动
					moved = true
				}
				// patch新旧节点
				patch(prevChild, c2[newIndex], container, null, parentComponent)
				// 待处理指针向后进一位
				patched++
			}
		}

		// 5.3 移动于与挂载
		// 根据新对旧索引数组 计算出 最长增长子序列 [d, e] [0, 1]
		const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : EMPTY_ARR
		// 获取 最长增长子序列 的 尾索引
		j = increasingNewIndexSequence.length - 1
		// 待处理新节点从后向前循环
		for (i = toBePatched - 1; i >= 0; i--) {
			// 获取新节点索引, 以及新节点
			const nextIndex = s2 + i
			const nextChild = c2[nextIndex]
			// 设置锚点, 待处理新节点后面还有节点,就插在这个节点的前面,否则就插入到最后
			const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor
			// 如果新对旧索引值为0, 说明他没有课复用的节点, 需要挂载
			if (newIndexToOldIndexMap[i] === 0) {
				patch(null, nextChild, container, anchor, parentComponent)
			} else if (moved) {
				// 如果有移动标记, 证明需要移动
				// 待处理新节点的索引, 和 最长增长子序列 里面存储 旧节点索引不一致, 就移动节点
				// j < 0 指 最长增长子序列为空数组 []
				if (j < 0 || i !== increasingNewIndexSequence[j]) {
					move(nextChild, container, anchor, MoveType.REORDER)
				} else {
					j--
				}
			}
		}
	}
}

const move = (vnode, container, anchor, moveType, parentSuspense = null) => {
	const { el, type, children, shapeFlag } = vnode
	renderApi.hostInsert(el, container, anchor)
}

// 求最长增长子序列
// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
function getSequence(arr: number[]): number[] {
	const p = arr.slice()
	const result = [0]
	let i, j, u, v, c
	const len = arr.length
	for (i = 0; i < len; i++) {
		const arrI = arr[i]
		if (arrI !== 0) {
			j = result[result.length - 1]
			if (arr[j] < arrI) {
				p[i] = j
				result.push(i)
				continue
			}
			u = 0
			v = result.length - 1
			while (u < v) {
				c = ((u + v) / 2) | 0
				if (arr[result[c]] < arrI) {
					u = c + 1
				} else {
					v = c
				}
			}
			if (arrI < arr[result[u]]) {
				if (u > 0) {
					p[i] = result[u - 1]
				}
				result[u] = i
			}
		}
	}
	u = result.length
	v = result[u - 1]
	while (u-- > 0) {
		result[u] = v
		v = p[v]
	}
	return result
}