const effectStack = []
let activeEffect

// 副作用函数
export function effect (fn, options:any = {}) {
	// 创建effect, 依赖收集
	const effect = creatReactiveEffect(fn, options)
	if (!options.lazy) {
		effect()
	}
	return effect
}

// effct依赖收集
let uid = 0

function creatReactiveEffect (fn, options) {
	const effect = function () {
		if (!effectStack.includes(effect)) {
			// 如果入栈, 出栈保证手机effect是正确的, 避免嵌套effect情况下收集错误
			try {
				effectStack.push(effect)
				activeEffect = effect
				return fn()
			} finally {
				effectStack.pop()
				activeEffect = effectStack[effectStack.length - 1]
			}
		}
	}
	// 唯一标识
	effect.id = uid++
	// 响应式effect标识
	effect._isEffect = true
	effect.active = true
	// 保存原始函数
	effect.raw = fn
	// 保存用户属性
	effect.options = options
	return effect
}

// 依赖收集
export function track (target, type, key) {

}