import { shallowReadonly } from "@fx-vue/reactivity";
import { EMPTY_OBJ, ShapeFlags } from "@fx-vue/shared";
import { EffectScope } from "packages/reactivity/src/effectScope";
import { proxyRefs } from "packages/reactivity/src/ref";
import { createAppContext } from "./apiCreateApp";
import { emit } from "./componentEmits";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";

export const enum LifecycleHooks {
	BEFORE_CREATE = 'bc',
	CREATED = 'c',
	BEFORE_MOUNT = 'bm',
	MOUNTED = 'm',
	BEFORE_UPDATE = 'bu',
	UPDATED = 'u',
	BEFORE_UNMOUNT = 'bum',
	UNMOUNTED = 'um',
	DEACTIVATED = 'da',
	ACTIVATED = 'a',
	RENDER_TRIGGERED = 'rtg',
	RENDER_TRACKED = 'rtc',
	ERROR_CAPTURED = 'ec',
	SERVER_PREFETCH = 'sp'
  }

const emptyAppContext = createAppContext()

let uid = 0
// 创建组件实例
export function createComponentInstance(vnode, parent, suspense = null) {
	// 获取组件type
	const type = vnode.type
	// 获取组件上下文
	const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext
	const instance = {
		uid: uid++, // 组件id
		vnode,
		type, // 组件类型(option对象 或 函数)
		parent, // 父组件实例
		appContext, // app上下文
		root: null, // 跟组件实例
		next: null, // 需要更新的 vnode，用于更新 component 类型的组件
		subTree: null, // subTree是render的返回子树vnode
		update: null, // 带副作用的渲染函数
		scope: new EffectScope(true /* detached */), // 收集响应式依赖的作用域
		render: null, // 渲染函数
		proxy: null, // 渲染上下文的代理对象, 使用this就是这个对象
		exposed: null, // 组件暴露的对象
		exposeProxy: null, // 组件暴露的代理对象
		withProxy: null, // 带有with区块(block)的渲染上下文代理对象
		provides: parent ? parent.provides : Object.create(appContext.provides), // 依赖注入的数据 获取 parent 的 provides 作为当前组件的初始化值 这样就可以继承 parent.provides 的属性了
		accessCache: null!, // 读取属性值的缓存
    	renderCache: [], // 渲染缓存

		// local resovled assets
		components: null, // 注册的组件
		directives: null, // 注册的指令

		// @TODO resolved props and emits options
		// propsOptions: normalizePropsOptions(type, appContext), // props
		// emitsOptions: normalizeEmitsOptions(type, appContext), // emits

		// emit
		emit: null!, // emit函数
		emitted: null, // 记录被v-once修饰已经触发的事件
	
		// props default value
		propsDefaults: EMPTY_OBJ,  // 工厂函数生成的默认
	
		// inheritAttrs
		inheritAttrs: type.inheritAttrs,

		// state
		ctx: EMPTY_OBJ, // context 对象
		data: EMPTY_OBJ, // data数据
		props: EMPTY_OBJ, // props数据
		attrs: EMPTY_OBJ, // 存放 attrs 的数据
		slots: EMPTY_OBJ, // 存放插槽的数据
		refs: EMPTY_OBJ, // 组件dom的refs引用
		setupState: EMPTY_OBJ, // setup函数返回的响应式结果
		setupContext: null, // setup函数上下文数据

		// suspense related
		suspense, // 异步组件
		suspenseId: suspense ? suspense.pendingId : 0, // 异步组件id
		asyncDep: null, // setup函数返回的异步函数结果
		asyncResolved: false, // 异步函数调用已完成

		// lifecycle hooks
		// not using enums here because it results in computed properties
		isMounted: false, // 是否已挂载
		isUnmounted: false, // 是否已卸载
		isDeactivated: false, // 是否已去激活
		// 各种钩子
		bc: null, // BEFORE_CREATE
		c: null, // CREATED
		bm: null, // BEFORE_MOUNT
		m: null, // MOUNTED
		bu: null, // BEFORE_UPDATE
		u: null, // UPDATED
		um: null, // UNMOUNTED
		bum: null, // BEFORE_UNMOUNT
		da: null, // DEACTIVATED
		a: null, // ACTIVATED
		rtg: null, // RENDER_TRIGGERED
		rtc: null, // RENDER_TRACKED
		ec: null, // ERROR_CAPTURED
		sp: null // SERVER_PREFETCH
	}
	// 在 prod 坏境下的 ctx 只是下面简单的结构
	// 在 dev 环境下会更复杂
	instance.ctx = {
		_: instance
	}
	// root为实力本身
	instance.root = parent ? parent.root : instance
	// 赋值 emit
	// 这里使用 bind 把 instance 进行绑定
	// 后面用户使用的时候只需要给 event 和参数即可
	instance.emit = emit.bind(null, instance) as any

	return instance
}

export function isStatefulComponent(instance) {
	return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
}
  

export function setupComponent(instance) {
	// 1. 处理 props
	// 取出存在 vnode 里面的 props
	const { props, children } = instance.vnode
	// 判断是否为状态组件(options为状态组件, function 为非状态组件)
	const isStateful = isStatefulComponent(instance)
	initProps(instance, props)
	// 2. @TODO 处理 slots
	// initSlots(instance, children)

	// 执行setup
	const setupResult = isStateful ? setupStatefulComponent(instance) : undefined
	return setupResult
}

function setupStatefulComponent(instance) {
	// 用户声明的对象就是 instance.type
	// const Component = {setup(),render()} ....
	const Component = instance.type

	// 0. 设置缓存
	instance.accessCache = Object.create(null)

	// 1. 创建代理 proxy
	console.log("创建 proxy");
	// proxy 对象其实是代理了 instance.ctx 对象
	// 我们在使用的时候需要使用 instance.proxy 对象
	// 因为 instance.ctx 在 prod 和 dev 坏境下是不同的
	instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers as any)

	// 2. 调用 setup
	// 调用 setup 的时候传入 props
	const { setup } = Component
	if (setup) {
		// 设置当前 currentInstance 的值
		// 必须要在调用 setup 之前
		setCurrentInstance(instance)
		const setupContext = createSetupContext(instance)
		// 真实的处理场景里面应该是只在 dev 环境才会把 props 设置为只读的
		const setupResult = setup && setup(shallowReadonly(instance.props), setupContext)

		// 取消currentInstance的值
		unsetCurrentInstance()
		// 3. 处理 setupResult
    	handleSetupResult(instance, setupResult)
	} else {
		finishComponentSetup(instance)
	}
}

function createSetupContext(instance) {
	console.log("初始化 setup context")
	return {
		attrs: instance.attrs,
		slots: instance.slots,
		emit: instance.emit,
		expose: () => { }, // TODO 实现 expose 函数逻辑  组件暴露的对象
	}
}

function handleSetupResult (instance, setupResult) {
	 // setup 返回值不一样的话，会有不同的处理
	// 1. 看看 setupResult 是个什么
	if (typeof setupResult === "function") {
		// 如果返回的是 function 的话，那么绑定到 render 上
		// 认为是 render 逻辑
		// setup(){ return ()=>(h("div")) }
		instance.render = setupResult;
	} else if (typeof setupResult === "object") {
		// 返回的是一个对象的话
		// 先存到 setupState 上
		// 先使用 @vue/reactivity 里面的 proxyRefs
		// 后面我们自己构建
		// proxyRefs 的作用就是把 setupResult 对象做一层代理
		// 方便用户直接访问 ref 类型的值
		// 比如 setupResult 里面有个 count 是个 ref 类型的对象，用户使用的时候就可以直接使用 count 了，而不需要在 count.value
		// 这里也就是官网里面说到的自动结构 Ref 类型
		instance.setupState = proxyRefs(setupResult);
	}

 	finishComponentSetup(instance);
}

function finishComponentSetup (instance) {
	// 给 instance 设置 render

	// 先取到用户设置的 component options
	const Component = instance.type;

	if (!instance.render) {
		// todo
		// 调用 compile 模块来编译 template
		// Component.render = compile(Component.template, {
		//     isCustomElement: instance.appContext.config.isCustomElement || NO
		//   })
		instance.render = Component.render;
	}

	// applyOptions()
}

let currentInstance = {}
// 这个接口暴露给用户，用户可以在 setup 中获取组件实例 instance
export function getCurrentInstance(): any {
	return currentInstance
}

export function setCurrentInstance(instance) {
	currentInstance = instance
}

export const unsetCurrentInstance = () => {
	currentInstance && (currentInstance as any).scope.off()
	currentInstance = null
}
