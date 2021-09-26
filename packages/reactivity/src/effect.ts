import { isArray, isIntegerKey } from "@fx-vue/shared"
import { TriggerOpTypes } from "./operations"

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

export function stop (effect) {
	if (effect.active) {
		cleanup(effect)
		if (effect.options.onStop) {
			effect.options.onStop()
		}
		effect.active = false
	}
}

// effct依赖收集
let uid = 0

function creatReactiveEffect (fn, options) {
	const effect = function () {
		if (!effectStack.includes(effect)) {
			cleanup(effect)
			// 通过入栈, 出栈保证手机effect是正确的, 避免嵌套effect情况下收集错误
			try {
				effectStack.push(effect)
				activeEffect = effect
				return fn() // 执行函数, 通过取值, 触发get
			} finally {
				effectStack.pop()
				activeEffect = effectStack[effectStack.length - 1]
			}
		}
	}
	// 唯一标识
	effect.id = uid++
	// 是否允许递归调用 默认false
	effect.allowRecurse = !!options.allowRecurse
	// 响应式effect标识
	effect._isEffect = true
	// effect是否激活 调用stop后, 设置为false
	effect.active = true
	// 保存原始函数
	effect.raw = fn
	// 持有当前effect的dep数组
	effect.deps = []
	// 保存用户属性
	effect.options = options
	return effect
}

// 清除
function cleanup(effect) {
	const { deps } = effect
	if (deps.length) {
		for (let i = 0; i < deps.length; i++) {
		deps[i].delete(effect)
		}
		deps.length = 0
	}
}

// 依赖收集, 让某个对象的属性, 收集它对应的effect
const targetMap = new WeakMap()
export function track (target, type, key) {
	if (activeEffect === undefined) {
		return
	}
	// 通过target获取它对应的dep
	let depsMap = targetMap.get(target)
	if (!depsMap) {
		targetMap.set(target, (depsMap = new Map()))
	}
	// 通过key收集它对应的dep, dep内就是effect
	let dep = depsMap.get(key)
	if (!dep) {
		depsMap.set(key, (dep = new Set()))
	}
	// 这里就是真正收集依赖了
	if (!dep.has(activeEffect)) {
		dep.add(activeEffect)
		// 这里的收集用作clean之用,  deps是array,里面每个元素是dep dep是set, 里面每个元素是effect
		// 这样清除的时候, 就可以循环deps,然后再把dep里面对应的effect清除掉
		activeEffect.deps.push(dep)
	}
}

// 触发更新 执行属性对应的effect
export function trigger (
	target,
	type,
	key?: unknown,
	newValue?: unknown,
	oldValue?: unknown,
	oldTarget?: unknown
) {
	// 如果触发的属性没有收集过effect, 则忽略
	const depsMap = targetMap.get(target)
	if (!depsMap) {
		return
	}
	// 通过set去重, 就不会重复执行了 这里是针对effect回调内的多次取值
	const effects = new Set()
	const add = (effectsAdd) => {
		if (effectsAdd) {
			// 避免死循环
			effectsAdd.forEach(effect => {
				if (effect !== activeEffect || effect.allowRecurse) {
					effects.add(effect)
				}
			})
		}
	}
	// 将所有需要执行的effect收集到一起, 然后一起执行
	// 1.如果修改的属性是length, 且target为数组, 则是对数组length进行改变
	if (key === 'length' && isArray(target) ) {
		depsMap.forEach((dep, key) => {
			// 如果直接改的数组长度, 或者之前收集的key比改动之后的大或者相等(说明会造成变动, 否则是不会发生变化的)
			// 注意这里使用length的值和下标对比
			if (key === 'length' || key >= newValue) {
				add(dep)
			}
		})
	} else {
		// 如果存在key 就是修改
		if (key !== undefined) {
			add(depsMap.get(key))
		}
		
		switch (type) {
			// 新增
			case TriggerOpTypes.ADD:
				// 如果添加数组的下标, 就触发length的更新
				if (isArray(target) && isIntegerKey(key)) {
					add(depsMap.get('length'))
				}
			break
			// 删除
			case TriggerOpTypes.DELETE:
			break
			// 修改
			case TriggerOpTypes.SET:
			break
		}
	}
	const run = function (effect) {
		// 如果存在scheduler调度函数, 则执行调度函数, 调度函数内部可能实行effect, 也可能不执行
		if (effect.options.scheduler) {
			effect.options.scheduler(effect)
		} else {
			// 否则直接执行effect
			effect()
		}
	}
	// 一起执行
	effects.forEach(run)
}