'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/*
 * 创建一个 map 并且返回一个 function,  function接受一个参数key, 用来检查是否存在于map中
 * 重要: 所有调用这个function必须是\/\*#\_\_PURE\_\_\*\/前缀
 * 作用是给rollup用来tree-shake, 即没用到则不需要打包
 */
function makeMap(str, expectsLowerCase) {
    const map = Object.create(null);
    const list = str.split(',');
    for (let i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val];
}

// 空对象
const EMPTY_OBJ = Object.freeze({});
// 空数组
Object.freeze([]);
// 空函数
const NOOP = () => { };
// 永远返回false
const NO = () => false;
// 匹配on
const onRE = /^on[^a-z]/;
const isOn = (key) => onRE.test(key);
// 合并
const extend = Object.assign;
// 判断是数组
const isArray = Array.isArray;
// 判断是function
const isFunction = (val) => typeof val === 'function';
// 判断是string
const isString = (val) => typeof val === 'string';
// 判断是Boolean
const isBoolean = (val) => typeof val === 'boolean';
// 判断是对象
const isObject = (val) => val !== null && typeof val === 'object';
// 是否为vue关键字
const isReservedProp = /*#__PURE__*/ makeMap(
// 前导逗号是有意为之的，因此空字符串""也包含在内  
',key,ref,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted');

// 碎片节点
const Fragment = Symbol('Fragment');
// 文本节点
const Text = Symbol('Text');
// 注释节点
const Comment = Symbol('Comment');
// 创建vnode
function createVNode(type, props = null, children) {
    // type 为 string : createVNode("div")
    // type 为 object : createVNode(App) 用户传入了options
    // 根据传入的节点类型type生成shapeFlag
    const shapeFlag = isString(type)
        ? 1 /* ELEMENT */
        : isObject(type)
            ? 4 /* STATEFUL_COMPONENT */
            : isFunction(type)
                ? 2 /* FUNCTIONAL_COMPONENT */
                : 0;
    const vnode = {
        el: null,
        component: null,
        key: props && props.key || null,
        type,
        props,
        children,
        shapeFlag,
        // anchor是Fragment的专用属性
        anchor: null
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
// 判断是不是vnode类型
function isVNode(value) {
    return value ? value.__v_isVNode === true : false;
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
            hostInsertStaticContent: options.insertStaticContent,
            // patch属性
            hostPatchProp: options.patchProp
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
        // 设置n1为null, 就不会进入patch了, 而是进行mount
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
            // 碎片节点
            processFragment(n1, n2, container, anchor, parentComponent);
            break;
        default:
            if (shapeFlag & 1 /* ELEMENT */) {
                // 元素节点
                processElement(n1, n2, container, anchor, parentComponent);
            }
            else if (shapeFlag & 6 /* COMPONENT */) {
                // 组件节点
                processComponent(n1, n2, container, anchor, parentComponent);
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
        patchElement(n1, n2, container, anchor, parentComponent);
    }
}
// 处理碎片节点
function processFragment(n1, n2, container, anchor, parentComponent) {
    console.log('processFragment 处理碎片节点');
    // 这两个空文本节点, 一个作为el, 一个作为anchor 且把它们赋值到vnode上
    const fragmentStartAnchor = (n2.el = n1 ? n1.el : renderApi.hostCreateText(''));
    const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : renderApi.hostCreateText(''));
    if (n1 == null) {
        // 先插入空节点
        renderApi.hostInsert(fragmentStartAnchor, container, anchor);
        renderApi.hostInsert(fragmentEndAnchor, container, anchor);
        // 再挂载子元素, 这里锚点传入, 挂载的子元素位置就是正确的
        mountChildren(n2.children, container, fragmentEndAnchor, parentComponent);
    }
    else {
        patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent);
    }
}
// 处理组件节点
function processComponent(n1, n2, container, anchor, parentComponent) {
    console.log('processComponent 处理组件节点');
    if (n1 == null) {
        mountComponent(n2, container, anchor, parentComponent);
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
    if (props) {
        for (const key in props) {
            // 非vue保留字属性, 设置到元素el上
            if (!isReservedProp(key)) {
                renderApi.hostPatchProp(el, key, null, props[key]);
            }
        }
    }
    // 挂载 这里传入的anchor参数 是为了保证fragment挂载位置正确
    renderApi.hostInsert(el, container, anchor);
}
// 挂载组件节点
function mountComponent(vnode, container, anchor, parentComponent) {
    // 如果是组件 type 内必然有render函数
    const instance = vnode;
    instance.$vnode = instance.type.render();
    patch(container._vnode, instance.$vnode, container, anchor, parentComponent);
}
// 挂载子节点
function mountChildren(children, container, anchor, parentComponent, start = 0) {
    for (let i = start; i < children.length; i++) {
        const child = normalizeVNode(children[i]);
        patch(null, child, container, anchor, parentComponent);
    }
}
// patch元素节点
function patchElement(n1, n2, container, anchor, parentComponent) {
    console.log('patchElement patch元素节点');
    // 需要把 el 挂载到新的 vnode
    const el = (n2.el = n1.el);
    // 对比 props
    const oldProps = (n1 && n1.props) || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    patchProps(el, n2, oldProps, newProps);
    // 对比 children
    patchChildren(n1, n2, el, anchor, parentComponent);
}
// patch属性
function patchProps(el, vnode, oldProps, newProps) {
    // 如果新旧属性一致, 则不处理
    if (oldProps === newProps) {
        return false;
    }
    // 循环新属性, 设置到元素el上
    for (const key in newProps) {
        // 如果是vue保留字属性 则跳过
        if (isReservedProp)
            continue;
        const next = newProps[key];
        const prev = oldProps[key];
        if (prev !== next) {
            renderApi.hostPatchProp(el, key, prev, next);
        }
    }
    // 循环旧属性, 把新属性里没有的旧属性删除掉
    if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
            if (!(key in newProps)) {
                renderApi.hostPatchProp(el, key, oldProps[key], null);
            }
        }
    }
}
/**
 * patch子元素
 * 根据子元素的类型, 有9种可能
 * 1.n2 text n1 text => 更新textContent
 * 2.n2 text n1 array => 删除n1(unmountChildren), 更新textContent
 * 3.n2 text n1 null => 更新textContent
 * 4.n2 array n1 text => 删除n1  mount n2
 * 5.n2 array n1 array => patchArrayChildren
 * 6.n2 array n1 null => mount n2
 * 7.n2 null n1 text => 删除 n1
 * 8.n2 null n1 array => 删除 n1 (unmountChildren)
 * 9.n2 null n1 null => 不处理
*/
function patchChildren(n1, n2, container, anchor, parentComponent) {
    const { shapeFlag: prevShapeFlag, children: c1 } = n1;
    const { shapeFlag, children: c2 } = n2;
    // n2为text, 则n1有三种可能
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
        // 如果n1为数组, 先删除n1
        if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
            unmountChildren(c1, parentComponent);
        }
        // 三种情况最后都要更新textContent
        if (c2 !== c1) {
            renderApi.hostSetElementText(container, c2);
        }
    }
    else {
        // 否则n2可能是null 或者 array
        // 如果n1是array
        if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
            // 如果n2也是array
            if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                // 则进行patch子节点
                // @TODO 暂时判断是否有key
                if (c1[0] && c1[0].key != null && c2[0] && c2[0].key != null) {
                    patchKeyedChildren(c1, c2, container, anchor, parentComponent);
                }
                else {
                    patchUnKeyedChildren(c1, c2, container, anchor, parentComponent);
                }
            }
            else {
                // 否则删除n1, 没有n2, 仅仅是删除n1
                unmountChildren(c1, parentComponent, true);
            }
        }
        else {
            // 如果n1是null或者text
            // 如果n1是text, 必然要删除n1
            if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
                renderApi.hostSetElementText(container, '');
            }
            // 如果n2是array, 必然要mount n2
            if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                mountChildren(c2, container, anchor, parentComponent);
            }
        }
    }
}
// @TODO 更新组件节点
function updateComponent(n1, n2, container) {
    console.log('updateComponent 更新组件');
}
// 取消挂载
function unmount(vnode, parentComponent, parentSuspense, doRemove = false) {
    console.log('unmount 取消挂载');
    const { type, shapeFlag } = vnode;
    if (shapeFlag & 6 /* COMPONENT */) ;
    else if (type === Fragment) {
        // 取消挂载碎片节点
        unmountChildren(vnode, parentComponent);
    }
    // 删除元素
    if (doRemove) {
        remove(vnode);
    }
}
// 取消挂载子元素
function unmountChildren(children, parentComponent, doRemove = false, start = 0) {
    for (let i = start; i < children.length; i++) {
        unmount(children[i], parentComponent, null, doRemove);
    }
}
// 删除节点
function remove(vnode) {
    const { type, el, anchor } = vnode;
    // 如果是碎片类型, 则调用专用删除函数
    if (type === Fragment) {
        removeFragment(el, anchor);
        return;
    }
    // 删除元素
    if (el) {
        renderApi.hostRemove(el);
    }
}
// 删除碎片元素
function removeFragment(cur, end) {
    // cur为开始的text节点, end为结束的text节点
    let next;
    // 通过 指针指向下一个, 删除当前, 当前指针指向下一个, 重复这个步骤, 达到删除 start => end 所有节点
    while (cur !== end) {
        next = renderApi.hostNextSibling(cur);
        renderApi.hostRemove(cur);
        cur = next;
    }
    // 最后把结束节点删除
    renderApi.hostRemove(end);
}
// patch 没有key的子节点, 因为没有key, 只能根据索引比较
function patchUnKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
    console.log('patchUnKeyedChildren');
    const oldLenght = c1.length;
    const newLenght = c2.length;
    const commonLength = Math.min(oldLenght, newLenght);
    // 循环公共长度, 进行patch
    for (let i = 0; i < commonLength; i++) {
        patch(c1[i], c2[i], container, parentAnchor, parentComponent);
    }
    if (oldLenght > newLenght) {
        // 旧节点大于新节点, 需要删除
        unmountChildren(c1.slice(commonLength), parentComponent);
    }
    else {
        // 旧节点小于新节点, 需要挂载
        mountChildren(c2.slice(commonLength), container, parentAnchor, parentComponent);
    }
}
// 双端比较型diff
function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
    // 声明四个指针, 分别指向旧元素第一个, 旧元素最后一个, 新元素第一个, 新元素最后一个
    let oldStartIdx = 0;
    let oldEndIdx = c1.length - 1;
    let newStartIdx = 0;
    let newEndIdx = c2.length - 1;
    // 声明指针对应的VNode
    let oldStartVNode = c1[oldStartIdx];
    let oldEndVNode = c1[oldEndIdx];
    let newStartVNode = c2[newStartIdx];
    let newEndVNode = c2[newEndIdx];
    // 旧元素第一个 小于等于 旧元素最后一个 且 新节点第一个 小于等于 新结点最后一个, 就说明有需要循环比较的节点存在
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        if (!oldStartVNode) {
            // 如果节点不存在 证明这个节点刚才移动过, 只需要更新指针
            oldStartVNode = c1[++oldStartIdx];
        }
        else if (!oldEndVNode) {
            // 如果节点不存在 证明这个节点刚才移动过, 只需要更新指针
            oldEndVNode = c1[--oldEndIdx];
        }
        else if (oldStartVNode.key === newStartVNode.key) {
            // 首首对比
            // 先进行patch更新
            patch(oldStartVNode, newStartVNode, container, parentAnchor, parentComponent);
            // 更新指针
            // 旧节点第一位 向后移动一位
            oldStartVNode = c1[++oldStartIdx];
            // 新结点第一位 向后移动一位
            newStartVNode = c2[++newStartIdx];
        }
        else if (oldEndVNode.key === newEndVNode.key) {
            // 尾尾对比
            // 先进行patch更新
            patch(oldEndVNode, newEndVNode, container, parentAnchor, parentComponent);
            // 不需要移动, 只需更新指针
            // 旧节点最后一个和新节点最后一个 分别向前移动一位
            oldEndVNode = c1[--oldEndIdx];
            newEndVNode = c1[--newEndIdx];
        }
        else if (oldStartVNode.key === newEndVNode.key) {
            // 首尾对比
            // 先进行patch更新
            patch(oldStartVNode, newEndVNode, container, parentAnchor, parentComponent);
            // 把旧元素的第一个 移动到 最后一位
            container.insertBefore(oldStartVNode.el, oldEndVNode.el.nextSibling);
            // 更新指针
            // 旧节点第一位 向后移动一位
            oldStartVNode = c1[++oldStartIdx];
            // 新节点最后一位  向前移动一位
            newEndVNode = c2[--newEndIdx];
        }
        else if (oldEndVNode.key === newStartVNode.key) {
            // 尾首对比
            // 先进行patch更新
            patch(oldEndVNode, newStartVNode, container, parentAnchor, parentComponent);
            // 把旧节点的最后一个 移动到第一个
            container.insertBefore(oldEndVNode.el, oldStartVNode.el);
            // 更新指针
            // 旧节点最后一个 向前移动一位
            oldEndVNode = c1[--oldEndIdx];
            // 新结点第一个 向后移动一位
            newStartVNode = c2[++newStartIdx];
        }
        else {
            // 找到旧节点中 与新节点第一个 相同key的节点
            const indexInOld = c1.findIndex(node => node.key === newStartVNode);
            if (~indexInOld) {
                // 如果找到了进行patch更新
                const moveVNode = c1[indexInOld];
                patch(moveVNode, newStartVNode, container, parentAnchor, parentComponent);
                // 把此节点移动到 首位
                container.insertBefore(moveVNode.el, oldStartVNode.el);
                // 把此节点原来的位置置空, 置空的目的在下次循环到这里的时候 进行忽略处理
                c1[indexInOld] = undefined;
            }
            else {
                // 如果没找到, 则这个节点需要挂载, 挂载后的位置就是旧节点第一个之前, 也就是首位
                patch(null, newStartVNode, container, oldStartVNode.el);
            }
            // 更新指针
            // 新结点第一个向后移动一位
            newStartVNode = c2[++newStartIdx];
        }
        // 循环结束后, 发现旧节点 末尾指针 小于 起始指针, 此时后可能, 新节点找不到相同key的节点, 而且还没有挂载
        if (oldEndIdx < oldStartIdx) {
            // 如果新节点首尾有一个或多个, 需要把这些没有对应key的节点 挂载起来
            for (let i = newStartIdx; i <= newEndIdx; i++) {
                patch(null, c2[i], container, oldStartVNode.el);
            }
        }
        else if (newEndIdx < newStartIdx) {
            // 如果循环后, 新结点指针的末尾 小于 起始, 此时后可能 旧节点有找不到key, 而且没有卸载的
            // 如果旧节点首尾有一个或多个, 需要把这些没有对应key的节点 卸载
            for (let i = oldStartIdx; i <= oldEndIdx; i++) {
                unmount(c1[i], parentComponent, null, true);
            }
        }
    }
}

function h(type, propsOrChildren, children) {
    // 为了方便h函数的使用, 应该允许用户不传propsOrChildren, 所以要做一些处理
    const l = arguments.length;
    if (l === 2) {
        // propsOrChildren  是对象不是数组, 那么可能传的是props, 也可能传的是  vnode类型的children
        if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
            if (isVNode(propsOrChildren)) {
                return createVNode(type, null, [propsOrChildren]);
            }
            return createVNode(type, propsOrChildren);
        }
        else {
            // propsOrChildren 是数组, 必然是children
            return createVNode(type, null, propsOrChildren);
        }
    }
    else {
        if (l > 3) {
            // 如果参数大于3个, 则把第三个开始的参数 至 最后一个参数都当作children
            children = Array.prototype.slice.call(arguments, 2);
        }
        else if (l === 3 && isVNode(children)) {
            // 如果传了3个参数, 但是最后一个参数不是数组 而是vnode, 那么帮他转成数组
            children = [children];
        }
        return createVNode(type, propsOrChildren, children);
    }
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

// patch 元素的 class
function patchClass(el, value, isSVG) {
    // 如果不处理, null, undefined会以字符串的形式赋值到class上
    if (value == null) {
        value = '';
    }
    if (isSVG) {
        el.setAttribute('class', value);
    }
    else {
        // @TODO 这里还应该处理transitionClasses
        el.className = value;
    }
}

// patch 元素的style
function patchStyle(el, prev, next) {
    const style = el.style;
    // 如果新的style不存在, 则删除元素的style
    if (!next) {
        el.removeAttribute('style');
    }
    else if (isString(next)) {
        // 这里缓存了一下元素的display, 在后面的逻辑用到
        const current = style.display;
        // 从cssText可以直接以字符串的方式对元素的style进行赋值
        style.cssText = next;
        // _vod 表示元素 是否 通过 v-show来进行显示, 通过之前的缓存,  能够让cssText不影响v-show的功能
        if ('_vod' in el) {
            style.display = current;
        }
    }
    else {
        // style是对象
        // 先把需要赋值的style设置到元素上
        for (const key in next) {
            setStyle(style, key, next[key]);
        }
        // 再把需要删除的style 从元素上删除
        if (prev && !isString(prev)) {
            for (const key in prev) {
                if (next[key] == null) {
                    setStyle(style, key, '');
                }
            }
        }
    }
}
function setStyle(style, name, val) {
    // @TODO 这里还应该处理自定义属性, 和 !important 的情况
    style[name] = val;
}

const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/;
const patchProp = (el, key, prevValue, nextValue, isSVG = false) => {
    switch (key) {
        case 'class':
            patchClass(el, nextValue, isSVG);
            break;
        case 'style':
            patchStyle(el, prevValue, nextValue);
            break;
        default:
            // 处理事件
            if (isOn(key)) {
                const eventName = key.slice(2).toLowerCase();
                if (prevValue) {
                    el.removeEventListener(eventName, prevValue);
                }
                if (nextValue) {
                    el.addEventListener(eventName, nextValue);
                }
            }
            else if (domPropsRE.test(key)) {
                // value|checked|selected|muted|disabled 这几种属性直接在dom上赋值
                if (nextValue === '' && isBoolean(el[key])) {
                    nextValue = true;
                }
                el[key] = nextValue;
            }
            else {
                // 剩下的属性使用attr的api进行操作
                if (nextValue == null || nextValue === false) {
                    el.removeAttribute(key);
                }
                else {
                    el.setAttribute(key, nextValue);
                }
            }
            break;
    }
};

// nodeOps为各种dom操作api
const rendererOptions = extend({
    patchProp
}, nodeOps);
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
//# sourceMappingURL=vue.cjs.js.map
