// patch 元素的 class
export function patchClass (el, value, isSVG) {
	// 如果不处理, null, undefined会以字符串的形式赋值到class上
	if (value == null) {
		value = ''
	}
	if (isSVG) {
		el.setAttribute('class', value)
	} else {
		// @TODO 这里还应该处理transitionClasses
		el.className = value
	}
}