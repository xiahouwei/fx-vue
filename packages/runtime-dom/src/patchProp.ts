import { isBoolean, isOn } from "@fx-vue/shared"
import { patchClass } from "./modules/class"
import { patchStyle } from "./modules/style"

const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/
export const patchProp = (el, key, prevValue, nextValue, isSVG = false) => {
	switch(key) {
		case 'class':
			patchClass(el, nextValue, isSVG)
			break
		case 'style':
			patchStyle(el, prevValue, nextValue)
			break
		default:
			// 处理事件
			if (isOn(key)) {
				const eventName = key.slice(2).toLowerCase()
				if (prevValue) {
					el.removeEventListener(eventName, prevValue)
				}
				if (nextValue) {
					el.addEventListener(eventName, nextValue)
				}
			} else if (domPropsRE.test(key)) {
				// value|checked|selected|muted|disabled 这几种属性直接在dom上赋值
				if (nextValue === '' && isBoolean(el[key])) {
					nextValue = true
				}
				el[key] = nextValue
			} else {
				// 剩下的属性使用attr的api进行操作
				if (nextValue == null || nextValue === false) {
					el.removeAttribute(key)
				} else {
					el.setAttribute(key, nextValue)
				}
			}
			break
	}
}