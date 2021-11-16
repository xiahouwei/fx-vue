import { EMPTY_OBJ, hasOwn } from "@fx-vue/shared"

const publicPropertiesMap = {
	// 当用户调用 instance.proxy.$emit 时就会触发这个函数
	// i 就是 instance 的缩写 也就是组件实例对象
	$el: (i) => i.vnode.el,
	$emit: (i) => i.emit,
	$slots: (i) => i.slots,
	$props: (i) => i.props,
}

const enum AccessTypes {
	SETUP,
	DATA,
	PROPS,
	CONTEXT,
	OTHER
}
const shouldCacheAccess = false

// 需要让用户可以直接在 render 函数内直接使用 this 来触发 proxy
export const PublicInstanceProxyHandlers = {
	get({ _: instance }, key) {
		const { ctx, setupState, data, props, accessCache, type, appContext } = instance
		let normalizedProps
		if (key[0] !== '$') {
			const n = accessCache![key]
			if (n !== undefined) {
				switch (n) {
					case AccessTypes.SETUP:
						return setupState[key]
					case AccessTypes.DATA:
						return data[key]
					case AccessTypes.CONTEXT:
						return ctx[key]
					case AccessTypes.PROPS:
						return props![key]
					// default: just fallthrough
				}
			} else if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
				accessCache![key] = AccessTypes.SETUP
				return setupState[key]
			} else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
				accessCache![key] = AccessTypes.DATA
				return data[key]
			} else if (
				// only cache other properties when instance has declared (thus stable)
				// props
				(normalizedProps = instance.propsOptions[0]) &&
				hasOwn(normalizedProps, key)
			) {
				accessCache![key] = AccessTypes.PROPS
				return props![key]
			} else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
				accessCache![key] = AccessTypes.CONTEXT
				return ctx[key]
			} else if (shouldCacheAccess) {
				accessCache![key] = AccessTypes.OTHER
			}
		}
		console.log(`触发 proxy hook , key -> : ${key}`)

		const publicGetter = publicPropertiesMap[key]
		if (publicGetter) {
			return publicGetter[instance]
		}
	},

	set({ _: instance }, key, value) {
		const { data, setupState, ctx } = instance
		if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
			setupState[key] = value
		} else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
			data[key] = value
		} else if (hasOwn(instance.props, key)) {
			return false
		}
		if (key[0] === '$' && key.slice(1) in instance) {
			return false
		} else {
			ctx[key] = value
		}
		return true
	},

	has(
		{
			_: { data, setupState, accessCache, ctx, appContext, propsOptions }
		},
		key: string
	) {
		let normalizedProps
		return (
			accessCache![key] !== undefined ||
			(data !== EMPTY_OBJ && hasOwn(data, key)) ||
			(setupState !== EMPTY_OBJ && hasOwn(setupState, key)) ||
			((normalizedProps = propsOptions[0]) && hasOwn(normalizedProps, key)) ||
			hasOwn(ctx, key) ||
			hasOwn(publicPropertiesMap, key) ||
			hasOwn(appContext.config.globalProperties, key)
		)
	}
}