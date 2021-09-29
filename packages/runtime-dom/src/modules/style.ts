import { isString } from "@fx-vue/shared"

// patch 元素的style
export function patchStyle(el, prev, next) {
	const style = el.style
	// 如果新的style不存在, 则删除元素的style
	if (!next) {
		el.removeAttribute('style')
	} else if (isString(next)) {
		// 这里缓存了一下元素的display, 在后面的逻辑用到
		const current = style.display
		// 从cssText可以直接以字符串的方式对元素的style进行赋值
		style.cssText = next
		// _vod 表示元素 是否 通过 v-show来进行显示, 通过之前的缓存,  能够让cssText不影响v-show的功能
		if ('_vod' in el) {
			style.display = current
		}
	} else {
		// style是对象
		// 先把需要赋值的style设置到元素上
		for (const key in next) {
			setStyle(style, key, next[key])
		}
		// 再把需要删除的style 从元素上删除
		if (prev && !isString(prev)) {
			for (const key in prev) {
				if (next[key] == null) {
					setStyle(style, key, '')
				}
			}
		}
	}
}

function setStyle(style, name, val) {
	// @TODO 这里还应该处理自定义属性, 和 !important 的情况
	style[name] = val
}