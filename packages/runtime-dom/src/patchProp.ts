import { isBoolean } from "@fx-vue/shared"

const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/
export const patchProp = (el, key, prevValue, nextValue) => {
	switch(key) {
		case 'class':
			el.className = nextValue || ''
			break
		case 'style':
			for (const styleName in nextValue) {
				el.style[styleName] = nextValue[styleName]
			}
			if (prevValue) {
				for (const styleName in prevValue) {
					if (nextValue[styleName] == null) {
						el.style[styleName] = ''
					}
				}
			}
			break
		default:
			if (/^on[^a-z]/.test(key)) {
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