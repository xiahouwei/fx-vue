var VueShared = (function (exports) {
	'use strict';

	// 空对象
	Object.freeze({});
	// 空数组
	Object.freeze([]);
	// 空函数
	const NOOP = () => { };
	// 永远返回false
	const NO = () => false;
	// 合并
	const extend = Object.assign;
	// 判断是数组
	const isArray = Array.isArray;
	// 判断是string
	const isString = (val) => typeof val === 'string';
	// 判断是Boolean
	const isBoolean = (val) => typeof val === 'boolean';
	// 判断是对象
	const isObject = (val) => val !== null && typeof val === 'object';

	const Fragment = Symbol('Fragment');
	const Text = Symbol('Text');
	const Comment = Symbol('Comment');
	// 创建vnode
	function createVNode(type, props, children) {
	    if (!props) {
	        props = {};
	    }
	    // type 为 string : createVNode("div")
	    // type 为 object : createVNode(App) 用户传入了options
	    // 根据传入的节点类型type生成shapeFlag
	    const shapeFlag = isString(type)
	        ? 1 /* ELEMENT */
	        : isObject(type)
	            ? 4 /* STATEFUL_COMPONENT */
	            : 0;
	    const vnode = {
	        el: null,
	        component: null,
	        key: props.key || null,
	        type,
	        props,
	        children,
	        shapeFlag
	    };
	    // 格式化children, 以及通过位运算 更新shapeFlag
	    normalizeChildren(vnode, children);
	    return vnode;
	}
	// 格式化children
	function normalizeChildren(vnode, children) {
	    let type = 0;
	    const { shapeFlag } = vnode;
	    // children为 null / undifined
	    if (children == null) {
	        children = null;
	    }
	    else if (isArray(children)) {
	        // children为数组 更新父的shapFlag
	        type = 16 /* ARRAY_CHILDREN */;
	    }
	    else if (typeof children === 'object') {
	        // 如果children是object 暂时只标识slots_children这种类型
	        // 这里父暂时只有 element 和 component
	        // 只要父是component, 那么 children就是 slots
	        if (shapeFlag & 1 /* ELEMENT */) ;
	        else {
	            // children是slots, 更新父的shapFlag
	            type = 32 /* SLOTS_CHILDREN */;
	        }
	    }
	    else {
	        // 剩下的children都格式化为文本
	        children = String(children);
	        type = 8 /* TEXT_CHILDREN */;
	    }
	    // 赋值children
	    vnode.children = children;
	    // 赋值shapeFlag
	    vnode.shapeFlag |= type;
	}
	// 格式化vnode
	function normalizeVNode(child) {
	    if (child == null || typeof child === 'boolean') {
	        // empty placeholder
	        return createVNode(Comment);
	    }
	    else if (isArray(child)) {
	        // fragment
	        return createVNode(Fragment, null, child);
	    }
	    else if (typeof child === 'object') {
	        // already vnode, this should be the most common since compiled templates
	        // always produce all-vnode children arrays
	        return child.el === null ? child : cloneVNode(child);
	    }
	    else {
	        // strings and numbers
	        return createVNode(Text, null, String(child));
	    }
	}
	function cloneVNode(vnode) {
	    const cloned = {};
	    for (const key of vnode) {
	        cloned[key] = vnode[key];
	    }
	    return cloned;
	}
	// 判断是否为同类型的vnode
	function isSameVNodeType(n1, n2) {
	    return n1.type === n2.type && n1.key === n2.key;
	}

	let uid = 0;
	// 返回createApp函数
	function createAppAPI(render) {
	    return function createApp(rootComponent, rootProps = null) {
	        // 创建app上下文
	        const context = createAppContext();
	        // mounted标记
	        let isMounted = false;
	        const app = (context.app = {
	            _uid: uid++,
	            _component: rootComponent,
	            _props: rootProps,
	            _container: null,
	            _context: context,
	            mount(rootContainer) {
	                if (!isMounted) {
	                    // 创建vnode
	                    const vnode = createVNode(rootComponent, rootProps);
	                    // 赋值vnode上下文
	                    vnode.appContext = context;
	                    // 渲染
	                    render(vnode, rootContainer);
	                    // 设置mounted标记
	                    isMounted = true;
	                    // 设置容器
	                    app._container = rootContainer;
	                    // 
	                    rootContainer.__vue_app__ = app;
	                    // return vnode.component.proxy
	                }
	            }
	        });
	        return app;
	    };
	}
	// 创建app上下文对象
	function createAppContext() {
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
	        provides: Object.create(null)
	    };
	}

	let renderApi = null;
	// renderApi用来解耦, 接收不同容器的dom操作api
	function initRenderApi(options) {
	    if (!renderApi) {
	        renderApi = {
	            // 插入
	            hostInsert: options.insert,
	            // 删除
	            hostRemove: options.remove,
	            // 创建元素节点
	            hostCreateElement: options.createElement,
	            // 创建文本节点
	            hostCreateText: options.createText,
	            // 创建注释节点
	            hostCreateComment: options.createComment,
	            // 设置文本节点内容
	            hostSetText: options.setText,
	            // 设置元素节点内容
	            hostSetElementText: options.setElementText,
	            // 获取父节点
	            hostParentNode: options.parentNode,
	            // 获取相邻节点
	            hostNextSibling: options.nextSibling,
	            hostSetScopeId: NOOP,
	            // 克隆节点
	            hostCloneNode: options.cloneNode,
	            // 插入模板节点
	            hostInsertStaticContent: options.insertStaticContent
	        };
	    }
	    return renderApi;
	}
	// 渲染函数
	function render(vnode, container) {
	    console.log('render 渲染vnode');
	    // 这里默认为浏览器api, 没使用createApp也可以使用render
	    initRenderApi(rendererOptions);
	    if (vnode == null) {
	        if (container._vnode) {
	            // 如果存在vnode, 则unmount
	            unmount(container._vnode, null, null, true);
	        }
	    }
	    else {
	        // patch
	        patch(container._vnode || null, vnode, container);
	    }
	    // _vnode用于判断container是否进行过渲染
	    container._vnode = vnode;
	}
	// 创建renderer函数 返回renderer对象
	function createRenderer(options) {
	    return baseCreateRenderer(options);
	}
	// 返回createApp 常用中main.js中初始化使用
	function baseCreateRenderer(options) {
	    initRenderApi(options);
	    return {
	        render,
	        createApp: createAppAPI(render)
	    };
	}
	// 根据vnode生成节点
	function patch(n1, n2, container, anchor = null, parentComponent = null) {
	    console.log('patch patch节点');
	    // 如果n1, n2为不同类型的vnode则对n1进行取消挂载
	    if (n1 && !isSameVNodeType(n1, n2)) {
	        unmount(n1, parentComponent, null, true);
	        n1 = null;
	    }
	    // 生成节点的条件需要 根据n2的属性来判断
	    const { type, shapeFlag } = n2;
	    switch (type) {
	        case Text:
	            // 文本节点
	            processText(n1, n2, container, anchor);
	            break;
	        case Fragment:
	            // 传送门节点
	            processFragment(n1, n2, container, anchor, parentComponent);
	            break;
	        default:
	            if (shapeFlag & 1 /* ELEMENT */) {
	                // 元素节点
	                processElement(n1, n2, container, anchor, parentComponent);
	            }
	            else if (shapeFlag & 6 /* COMPONENT */) {
	                // 组件节点
	                processComponent(n1, n2, container);
	            }
	    }
	}
	// 处理文本节点
	function processText(n1, n2, container, anchor) {
	    console.log('processText 处理文本节点');
	    // 如果不存在n1,则为第一次渲染, 否则为更新节点
	    if (n1 == null) {
	        // 创建文本节点, 然后插入到container
	        renderApi.hostInsert((n2.el = renderApi.hostCreateText(n2.children)), container, anchor);
	    }
	    else {
	        // 否则为更新节点
	        // 获取node节点el, 且新的node节点el指向旧的node节点el
	        const el = (n2.el = n1.el);
	        // 判断当内容发生变化, 则进行更新
	        if (n2.children !== n1.children) {
	            // 设置文本节点内容
	            renderApi.hostSetText(el, n2.children);
	        }
	    }
	}
	// 处理元素节点
	function processElement(n1, n2, container, anchor, parentComponent) {
	    console.log('processElement 处理元素节点');
	    if (n1 == null) {
	        mountElement(n2, container, anchor, parentComponent);
	    }
	    else {
	        patchElement();
	    }
	}
	// 处理传送门节点
	function processFragment(n1, n2, container, anchor, parentComponent) {
	    console.log('processFragment 处理传送门节点');
	    const fragmentStartAnchor = (n2.el = n1 ? n1.el : renderApi.hostCreateText(''));
	    const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : renderApi.hostCreateText(''));
	    if (n1 == null) {
	        renderApi.hostInsert(fragmentStartAnchor, container, anchor);
	        renderApi.hostInsert(fragmentEndAnchor, container, anchor);
	        mountChildren(n2.children, container, fragmentEndAnchor, parentComponent);
	    }
	}
	// 处理组件节点
	function processComponent(n1, n2, container, anchor, parentComponent) {
	    console.log('processComponent 处理组件节点');
	    if (n1 == null) {
	        mountComponent(n2, container);
	    }
	    else {
	        updateComponent();
	    }
	}
	// 挂载元素节点
	function mountElement(vnode, container, anchor, parentComponent) {
	    console.log('mountElement 挂载元素节点');
	    const { type, props, shapeFlag, children } = vnode;
	    // 生成元素
	    const el = vnode.el = renderApi.hostCreateElement(type, false, props && props.is, props);
	    // 生成子元素
	    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
	        // 子节点为文本
	        renderApi.hostSetElementText(el, vnode.children);
	    }
	    else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
	        // 子节点为数组
	        mountChildren(vnode.children, el, null, parentComponent);
	    }
	    // 生成属性
	    mountProps(props, el);
	    // 挂载
	    container.appendChild(el);
	}
	// 挂载组件节点
	function mountComponent(vnode, container, parentComponent) {
	    // 如果是组件 type 内必然有render函数
	    const _vnode = vnode.type.render();
	    patch(container._vnode, _vnode, container);
	}
	// 挂载子节点
	function mountChildren(children, container, anchor, parentComponent, start = 0) {
	    for (let i = start; i < children.length; i++) {
	        const child = normalizeVNode(children[i]);
	        patch(null, child, container, anchor, parentComponent);
	    }
	}
	const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/;
	// 挂载属性
	function mountProps(props, el) {
	    for (const key in props) {
	        let value = props[key];
	        switch (key) {
	            // 类名
	            case 'class':
	                el.className = value;
	                break;
	            // 样式
	            case 'style':
	                for (const styleName in value) {
	                    el.style[styleName] = value[styleName];
	                }
	                break;
	            default:
	                // 事件
	                if (/^on[^a-z]/.test(key)) {
	                    const eventName = key.slice(2).toLowerCase();
	                    el.addEventListener(eventName, value);
	                }
	                else if (domPropsRE.test(key)) {
	                    // value|checked|selected|muted|disabled 这几种属性直接在dom上赋值
	                    if (value === '' && isBoolean(el[key])) {
	                        value = true;
	                    }
	                    el[key] = value;
	                }
	                else {
	                    // 剩下的属性使用attr的api进行操作
	                    if (value == null || value === false) {
	                        el.removeAttribute(key);
	                    }
	                    else {
	                        el.setAttribute(key, value);
	                    }
	                }
	                break;
	        }
	    }
	}
	// @TODO patch元素节点
	function patchElement(n1, n2, container) {
	    console.log('patchElement patch元素节点');
	}
	// @TODO 更新组件节点
	function updateComponent(n1, n2, container) {
	    console.log('updateComponent 更新组件');
	}
	// 取消挂载
	function unmount(vnode, parentComponent, parentSuspense, doRemove = false) {
	    console.log('unmount 取消挂载');
	    // 删除元素
	    if (doRemove) {
	        remove(vnode);
	    }
	}
	// 删除节点
	function remove(vnode) {
	    const { type, el, anchor } = vnode;
	    // 如果是传送门类型, 则调用专用删除函数
	    if (type === Fragment) {
	        removeFragment(el, anchor);
	        return;
	    }
	    // 删除元素
	    if (el) {
	        renderApi.hostRemove(el);
	    }
	}
	// 删除传送门元素
	function removeFragment(cur, end) {
	    let next;
	    while (cur !== end) {
	        next = renderApi.hostNextSibling(cur);
	        renderApi.hostRemove(cur);
	        cur = next;
	    }
	    renderApi.hostRemove(end);
	}

	function h(type, props, children) {
	    return createVNode(type, props, children);
	}

	// SVG命名空间
	const svgNS = 'http://www.w3.org/2000/svg';
	const doc = typeof document !== 'undefined' ? document : null;
	let tempContainer;
	let tempSVGContainer;
	// nodeOps内部是各种dom的操作api, 在createRenderer时进行挂载, 这样做的目的是为了解耦, 在不同的容器内可以使用不同的dom api
	const nodeOps = {
	    // 插入元素
	    insert: (child, parent, anchor) => {
	        parent.insertBefore(child, anchor || null);
	    },
	    // 删除元素
	    remove: child => {
	        const parent = child.parentNode;
	        if (parent) {
	            parent.removeChild(child);
	        }
	    },
	    // 创建节点
	    createElement: (tag, isSVG, is, props) => {
	        // 如果是创建svg则用createElementNS, 普通元素用createElement
	        const el = isSVG
	            ? doc.createElementNS(svgNS, tag)
	            : doc.createElement(tag, is ? { is } : undefined);
	        // select标签需要判断是否设置多选属性multiple(用ctrl进行多选)
	        if (tag === 'select' && props && props.multiple != null) {
	            el.setAttribute('multiple', props.multiple);
	        }
	        return el;
	    },
	    // 创建文本节点
	    createText: text => doc.createTextNode(text),
	    // 创建注释节点
	    createComment: text => doc.createComment(text),
	    // 仅仅对CDATA片段，注释comment，Processing Instruction节点或text节点有效
	    setText: (node, text) => {
	        node.nodeValue = text;
	    },
	    // 改变元素文本(纯文本, 不会解析为html)
	    setElementText: (el, text) => {
	        el.textContent = text;
	    },
	    // 获取父节点
	    parentNode: node => node.parentNode,
	    // 相邻节点
	    nextSibling: node => node.nextSibling,
	    // 选择器
	    querySelector: selector => doc.querySelector(selector),
	    // 设置id
	    setScopeId(el, id) {
	        el.setAttribute(id, '');
	    },
	    // 克隆节点
	    // 在patchDOMProp中，vue将实际值存储在el._value属性, _value属于自定义属性 cloneNode不会复制自定义属性
	    // 未来也要考虑其他的自定义属性
	    cloneNode(el) {
	        const cloned = el.cloneNode(true);
	        if (`_value` in el) {
	            cloned._value = el._value;
	        }
	        return cloned;
	    },
	    // 接收一个innerHTML模版字符串（n2.children），并将其插入到createElement创建出的临时容器，将innerHTML中包含的子节点按顺序依次根据anchor插入（决定了removeStaticNode的内容），并返回插入的首尾节点。
	    insertStaticContent(content, parent, anchor, isSVG) {
	        // 创建临时节点
	        const temp = isSVG
	            ? tempSVGContainer || (tempSVGContainer = doc.createElementNS(svgNS, 'svg'))
	            : tempContainer || (tempContainer = doc.createElement('div'));
	        // 设置临时节点内容
	        temp.innerHTML = content;
	        // 获取临时节点第一个元素
	        const first = temp.firstChild;
	        let node = first;
	        let last = node;
	        // 循环临时节点, insert到parent中
	        while (node) {
	            last = node;
	            nodeOps.insert(node, parent, anchor);
	            node = temp.firstChild;
	        }
	        return [first, last];
	    }
	};

	// nodeOps为各种dom操作api
	const rendererOptions = extend({}, nodeOps);
	let renderer;
	// 如果存在renderer对象则返回, 否则创建一个返回
	function ensureRenderer() {
	    return renderer || (renderer = createRenderer(rendererOptions));
	}
	function createApp(...args) {
	    const app = ensureRenderer().createApp(...args);
	    const { mount } = app;
	    // 重写mount方法
	    app.mount = function (containerOrSelector) {
	        const container = normalizeContainer(containerOrSelector);
	        if (!container)
	            return;
	        // const component = app._component
	        // clear content before mounting
	        container.innerHTML = '';
	        const proxy = mount(container, false);
	        if (container instanceof Element) {
	            container.removeAttribute('v-cloak');
	            container.setAttribute('data-v-app', '');
	        }
	        return proxy;
	    };
	    return app;
	}
	// 格式化container容器方法
	function normalizeContainer(container) {
	    if (isString(container)) {
	        const res = document.querySelector(container);
	        return res;
	    }
	    return container;
	}

	exports.Fragment = Fragment;
	exports.Text = Text;
	exports.createApp = createApp;
	exports.createRenderer = createRenderer;
	exports.h = h;
	exports.render = render;
	exports.rendererOptions = rendererOptions;

	Object.defineProperty(exports, '__esModule', { value: true });

	return exports;

}({}));
//# sourceMappingURL=vue.global.js.map
