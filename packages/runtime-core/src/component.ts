import { emit } from "./componentEmits";

// 创建组件实例
export function createComponentInstance (vnode, parent) {
	const instance = {
		type: vnode.type,
		vnode,
		next: null, // 需要更新的 vnode，用于更新 component 类型的组件
		props: {},
		parent,
		provides: parent ? parent.provides : {}, //  获取 parent 的 provides 作为当前组件的初始化值 这样就可以继承 parent.provides 的属性了
		proxy: null,
		isMounted: false,
		attrs: {}, // 存放 attrs 的数据
		slots: {}, // 存放插槽的数据
		ctx: {}, // context 对象
		setupState: {}, // 存储 setup 的返回值
		emit: () => {},
	}
	// 在 prod 坏境下的 ctx 只是下面简单的结构
	// 在 dev 环境下会更复杂
	instance.ctx = {
		_: instance
	}

	// 赋值 emit
	// 这里使用 bind 把 instance 进行绑定
	// 后面用户使用的时候只需要给 event 和参数即可
  	instance.emit = emit.bind(null, instance) as any;

  	return instance;
}

// 设置compont
export function setupComponent (instance) {
	// 创建代理
	// instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
}