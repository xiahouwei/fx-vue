import { NO } from "@fx-vue/shared";
import { createVNode } from "./vnode";

let uid = 0
// 返回createApp函数
export function createAppAPI (render) {
	return function createApp (rootComponent, rootProps = null) {
		// 创建app上下文
		const context = createAppContext()
		// 收集已安装的插件
		const installedPlugins = new Set()
		// mounted标记
    	let isMounted = false
		const app = (context.app = {
			_uid: uid++,
			_component: rootComponent,
			_props: rootProps,
			_container: null,
			_context: context,

			mount (rootContainer) {
				if (!isMounted) {
					// 创建vnode
					const vnode:any = createVNode(rootComponent, rootProps)
					// 赋值vnode上下文
					vnode.appContext = context
					// 渲染
					render(vnode, rootContainer)
					// 设置mounted标记
					isMounted = true
					// 设置容器
					app._container = rootContainer
					// 赋值app
					rootContainer.__vue_app__ = app
					return vnode.component && vnode.component.proxy
				}
			}
		})
		return app
	}
}
// 创建app上下文对象
export function createAppContext () {
	return {
		app: null,
		config: {
			isNativeTag: NO,
			performance: false,
			globalProperties: {},
			optionMergeStrategies: {},
			errorHandler: undefined,
			warnHandler: undefined,
			compilerOptions: {}
		},
		mixins: [],
		components: {},
		directives: {},
		provides: Object.create(null),
		optionsCache: new WeakMap(),
		propsCache: new WeakMap(),
		emitsCache: new WeakMap()
	}
}