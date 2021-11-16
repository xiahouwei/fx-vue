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
const EMPTY_ARR = Object.freeze([]);
// 空函数
const NOOP = () => { };
// 永远返回false
const NO = () => false;
// 匹配on
const onRE = /^on[^a-z]/;
const isOn = (key) => onRE.test(key);
// 合并
const extend = Object.assign;
// 判断非继承属性
const hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (val = {}, key) => hasOwnProperty.call(val, key);
// 判断是数组
const isArray = Array.isArray;
// 判断是map
const isMap = (val) => toTypeString(val) === '[object Map]';
// 判断是function
const isFunction = (val) => typeof val === 'function';
// 判断是string
const isString = (val) => typeof val === 'string';
// 判断是symbol
const isSymbol = (val) => typeof val === 'symbol';
// 判断是Boolean
const isBoolean = (val) => typeof val === 'boolean';
// 判断是对象
const isObject = (val) => val !== null && typeof val === 'object';
const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);
// 通过toString获取原始类型
const toRawType = (value) => {
    // extract "RawType" from strings like "[object RawType]"
    return toTypeString(value).slice(8, -1);
};
// 判断是否为字符串类型的正整数, 常用于key
const isIntegerKey = (key) => isString(key) && key !== 'NaN' && key[0] !== '-' && '' + parseInt(key, 10) === key;
// 是否为vue关键字
const isReservedProp = /*#__PURE__*/ makeMap(
// 前导逗号是有意为之的，因此空字符串""也包含在内  
',key,ref,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted');
// 缓存String - function
const cacheStringFunction = (fn) => {
    const cache = Object.create(null);
    return ((str) => {
        const hit = cache[str];
        return hit || (cache[str] = fn(str));
    });
};
// 烤肉串 => 驼峰
const camelizeRE = /-(\w)/g;
const camelize = cacheStringFunction((str) => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
});
// 转大写
const capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
// 转on命名
const toHandlerKey = cacheStringFunction((str) => (str ? `on${capitalize(str)}` : ``));
// 判断是否发生变化
const hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);

// 碎片节点
const Fragment = Symbol('Fragment');
// 文本节点
const Text = Symbol('Text');
// 注释节点
const Comment = Symbol('Comment');
// 格式化key, key不能为null, 但是可以为undefined
const normalizeKey = ({ key }) => key != null ? key : null;
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
        // vnode标识
        __v_isVNode: true,
        // skip标识
        __v_skip: true,
        // vnode种类
        type,
        // vnode属性
        props,
        // vnode key
        key: props && normalizeKey(props),
        children,
        component: null,
        // dom元素
        el: null,
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

// 迭代行为专用key
const ITERATE_KEY = Symbol('');
// effect栈
const effectStack = [];
// 当前要收集的effect
let activeEffect;
// 副作用函数
function effect(fn, options = {}) {
    console.log('创建effect');
    // 创建effect, 依赖收集
    const effect = creatReactiveEffect(fn, options);
    if (!options.lazy) {
        console.log('effect不是lazy的, 执行effect');
        effect();
    }
    return effect;
}
// effct依赖收集
let uid$2 = 0;
function creatReactiveEffect(fn, options) {
    const effect = function () {
        console.log('执行effect, 通过堆栈来缓存当前activeEffect');
        // 避免重复收集
        if (!effectStack.includes(effect)) {
            cleanup(effect);
            // 通过入栈, 出栈保证收集effect是正确的, 避免嵌套effect情况下收集错误
            // 因为如果是effect内嵌套effect 如 effect(() => { effect(() => {}) })
            // 缓存activeEffect后 执行fn 就会执行下层的effect, 这时有可能还没有触发上层的track, 就已经更新了activeEffect
            // 这样当上层再track收集依赖的时候,activeEffect就不正确了
            try {
                console.log('effect堆栈 push effect, 设置为activeEffect');
                effectStack.push(effect);
                activeEffect = effect;
                console.log('执行effect内的fn');
                return fn(); // 执行函数, 通过取值, 触发get
            }
            finally {
                console.log('effect堆栈 pop effect, activeEffect设置为堆栈最后一个');
                effectStack.pop();
                activeEffect = effectStack[effectStack.length - 1];
            }
        }
    };
    // 唯一标识
    effect.id = uid$2++;
    // 是否允许递归调用 默认false
    effect.allowRecurse = !!options.allowRecurse;
    // 响应式effect标识
    effect._isEffect = true;
    // effect是否激活 调用stop后, 设置为false
    effect.active = true;
    // 保存原始函数
    effect.raw = fn;
    // 持有当前effect的dep数组
    effect.deps = [];
    // 保存用户属性
    effect.options = options;
    return effect;
}
// 清除
function cleanup(effect) {
    const { deps } = effect;
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].delete(effect);
        }
        deps.length = 0;
    }
}
// 依赖收集, 让某个对象的属性, 收集它对应的effect
const targetMap = new WeakMap();
function track(target, type, key) {
    console.log('执行track, 收集effect', target, key);
    if (activeEffect === undefined) {
        console.log('当前没有任何activeEffect, 停止track');
        return;
    }
    // 通过target获取它对应的dep
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }
    // 通过key收集它对应的dep, dep内就是effect
    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
    }
    // 这里就是真正收集依赖了, 且避免重复收集
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
        // 这里的收集用作clean之用,  deps是array,里面每个元素是dep dep是set, 里面每个元素是effect
        // 这样清除的时候, 就可以循环deps,然后再把dep里面对应的effect清除掉
        activeEffect.deps.push(dep);
    }
    console.log('track收集后的依赖为:', targetMap);
}
// 触发更新 执行属性对应的effect
function trigger(target, type, key, newValue, oldValue, oldTarget) {
    console.log('执行trigger', target, key);
    // 如果触发的属性没有收集过effect, 则忽略
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        return;
    }
    // 通过set去重, 就不会重复执行了 这里是针对effect回调内的多次取值
    const effects = new Set();
    // 声明add用于收集要触发的effect, 通过add收集起来, 然后统一执行
    const add = (effectsAdd) => {
        if (effectsAdd) {
            // 避免死循环
            effectsAdd.forEach(effect => {
                if (effect !== activeEffect || effect.allowRecurse) {
                    effects.add(effect);
                }
            });
        }
    };
    // 将所有需要执行的effect收集到一起, 然后一起执行
    // 1.如果修改的属性是length, 且target为数组, 则是对数组length进行改变
    if (key === 'length' && isArray(target)) {
        depsMap.forEach((dep, key) => {
            // 如果直接改的数组长度, 或者之前收集的key比改动之后的大或者相等(说明会造成变动, 否则是不会发生变化的)
            // 注意这里使用length的值和下标对比
            if (key === 'length' || key >= newValue) {
                add(dep);
            }
        });
    }
    else {
        // 2.如果存在key 就是修改
        if (key !== undefined) {
            add(depsMap.get(key));
        }
        switch (type) {
            // 新增
            case "add" /* ADD */:
                // 如果是不是数组, 触发迭代更新
                if (!isArray(target)) {
                    add(depsMap.get(ITERATE_KEY));
                }
                // 如果添加数组的下标, 就触发length的更新
                else if (isIntegerKey(key)) {
                    add(depsMap.get('length'));
                }
                break;
            // 删除
            case "delete" /* DELETE */:
                // 如果是不是数组, 触发迭代更新
                if (!isArray(target)) {
                    add(depsMap.get(ITERATE_KEY));
                }
                break;
            // 修改
            case "set" /* SET */:
                // 如果是Map, 修改操作也要触发迭代的更新
                if (isMap(target)) {
                    add(depsMap.get(ITERATE_KEY));
                }
                break;
        }
    }
    const run = function (effect) {
        // 如果存在scheduler调度函数, 则执行调度函数, 调度函数内部可能实行effect, 也可能不执行
        if (effect.options.scheduler) {
            console.log('发现effect有调度器, 执行调度器');
            effect.options.scheduler(effect);
        }
        else {
            console.log('effect没有调度器 执行effect');
            // 否则直接执行effect
            effect();
        }
    };
    // 一起执行
    effects.forEach(run);
}

// 收集Symbol的内置方法, 用于判断某个key是否为Symbol的内置方法
const builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol)
    .map(key => Symbol[key])
    .filter(isSymbol));
// 创建get
const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
// 生成Getter
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        const res = Reflect.get(target, key, receiver);
        if (!isReadonly) {
            // 收集依赖, 数据变化后更新视图
            track(target, "get" /* GET */, key);
        }
        if (shallow) {
            // 浅拦截不需要递归
            return res;
        }
        if (isObject(res)) {
            // 如果是深拦截且是对象 则递归
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
// 创建set
const set = createSetter();
const shallowSet = createSetter(true);
// 生成Setter
function createSetter(shallow = false) {
    return function set(target, key, value, receiver) {
        // 获取以前的值
        const oldValue = target[key];
        // 1.如果是数组,且改变的是下标, 通过判断key 和 数组lenth比 就可以知道是否存在
        // 2.否则就是对象, 就判断是否是自身的属性
        const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
        const result = Reflect.set(target, key, value, receiver);
        // 区分新增还是修改
        if (!hadKey) {
            // 没有key就是新增, 
            trigger(target, "add" /* ADD */, key, value);
        }
        else if (hasChanged(oldValue, value)) {
            // 有key就是修改
            trigger(target, "set" /* SET */, key, value);
        }
        // 数据更新时, 通知对应的属性执行effect
        return result;
    };
}
// 删除deleteProperty
function deleteProperty(target, key) {
    // 判断key是否存在
    const hasKey = hasOwn(target, key);
    // 缓存原始值
    target[key];
    // 执行删除操作
    const result = Reflect.deleteProperty(target, key);
    // 如果删除成功, 且target存在key 则进行trigger, 触发依赖
    if (result && hasKey) {
        trigger(target, "delete" /* DELETE */, key, undefined);
    }
    return result;
}
function has(target, key) {
    const result = Reflect.has(target, key);
    // 如果不key不是Symbol类型, 或者不是Symbol的内置参数, 则收集依赖
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
        track(target, "has" /* HAS */, key);
    }
    return result;
}
function ownKeys(target) {
    // 如果迭代数组, 用length作为key收集依赖, 其他的用便准迭代key收集
    track(target, "iterate" /* ITERATE */, isArray(target) ? 'length' : ITERATE_KEY);
    return Reflect.ownKeys(target);
}
// 对应reactive的handler参数
const mutableHandlers = {
    get,
    set,
    deleteProperty,
    has,
    ownKeys
};
// 对应readonly的handler参数
const readonlyHandlers = {
    get: readonlyGet,
    set: (target, key) => {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
        return true;
    },
    deleteProperty: (target, key) => {
        console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
        return true;
    }
};
// 对应shallowReactive的handler参数
extend({}, mutableHandlers, {
    get: shallowGet,
    set: shallowSet
});
// 对应shallowReadonly的handler参数
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

// 过去target类型
function targetTypeMap(rawType) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return 1 /* COMMON */;
        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
            return 2 /* COLLECTION */;
        default:
            return 0 /* INVALID */;
    }
}
function getTargetType(value) {
    // 如果target 有忽略标记, 或者被冻结, 则属于无效类型, 否则根据原始类型来判断
    return value["__v_skip" /* SKIP */] || !Object.isExtensible(value)
        ? 0 /* INVALID */
        : targetTypeMap(toRawType(value));
}
// 自动垃圾回收
const reactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
// new Proxy() 拦截数据的get和set
function createReactiveObject(target, isReadonly, baseHandlers) {
    // reactive只能拦截object
    if (!isObject(target)) {
        return target;
    }
    // 只有白名单内的value 类型允许被观测, 有忽略标记, 或者被冻结都不允许观测
    const targetType = getTargetType(target);
    if (targetType === 0 /* INVALID */) {
        return target;
    }
    // 如果存在缓存,直接返回proxy实例
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    const exisitProxy = proxyMap.get(target);
    if (exisitProxy) {
        return exisitProxy;
    }
    // 创建proxy实例, 进行拦截
    // @TODO baseHandlers还要考虑集合的情况(map, set, weakmap, weakset)
    const proxy = new Proxy(target, baseHandlers);
    // 缓存
    proxyMap.set(target, proxy);
    return proxy;
}
function reactive(target) {
    return createReactiveObject(target, false, mutableHandlers);
}
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers);
}

// 这个函数的目的是
// 帮助解构 ref
// 比如在 template 中使用 ref 的时候，直接使用就可以了
// 例如： const count = ref(0) -> 在 template 中使用的话 可以直接 count
// 解决方案就是通过 proxy 来对 ref 做处理
const shallowUnwrapHandlers = {
    get(target, key, receiver) {
        // 如果里面是一个 ref 类型的话，那么就返回 .value
        // 如果不是的话，那么直接返回value 就可以了
        return unRef(Reflect.get(target, key, receiver));
    },
    set(target, key, value, receiver) {
        const oldValue = target[key];
        if (isRef(oldValue) && !isRef(value)) {
            return (target[key].value = value);
        }
        else {
            return Reflect.set(target, key, value, receiver);
        }
    },
};
// 这里没有处理 objectWithRefs 是 reactive 类型的时候
// TODO reactive 里面如果有 ref 类型的 key 的话， 那么也是不需要调用 ref .value 的 
// （but 这个逻辑在 reactive 里面没有实现）
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
// 把 ref 里面的值拿到
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function isRef(value) {
    return !!value.__v_isRef;
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

let uid$1 = 0;
// 返回createApp函数
function createAppAPI(render) {
    return function createApp(rootComponent, rootProps = null) {
        // 创建app上下文
        const context = createAppContext();
        // mounted标记
        let isMounted = false;
        const app = (context.app = {
            _uid: uid$1++,
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
        provides: Object.create(null),
        optionsCache: new WeakMap(),
        propsCache: new WeakMap(),
        emitsCache: new WeakMap()
    };
}

let activeEffectScope;
const effectScopeStack = [];
class EffectScope {
    active = true;
    effects = [];
    cleanups = [];
    parent;
    scopes;
    /**
     * track a child scope's index in its parent's scopes array for optimized
     * removal
     */
    index;
    constructor(detached = false) {
        if (!detached && activeEffectScope) {
            this.parent = activeEffectScope;
            this.index =
                (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(this) - 1;
        }
    }
    run(fn) {
        if (this.active) {
            try {
                this.on();
                return fn();
            }
            finally {
                this.off();
            }
        }
    }
    on() {
        if (this.active) {
            effectScopeStack.push(this);
            activeEffectScope = this;
        }
    }
    off() {
        if (this.active) {
            effectScopeStack.pop();
            activeEffectScope = effectScopeStack[effectScopeStack.length - 1];
        }
    }
    stop(fromParent) {
        if (this.active) {
            this.effects.forEach(e => e.stop());
            this.cleanups.forEach(cleanup => cleanup());
            if (this.scopes) {
                this.scopes.forEach(e => e.stop(true));
            }
            // nested scope, dereference from parent to avoid memory leaks
            if (this.parent && !fromParent) {
                // optimized O(1) removal
                const last = this.parent.scopes.pop();
                if (last && last !== this) {
                    this.parent.scopes[this.index] = last;
                    last.index = this.index;
                }
            }
            this.active = false;
        }
    }
}

function emit(instance, event, ...rawArgs) {
    // 1. emit 是基于 props 里面的 onXXX 的函数来进行匹配的
    // 所以我们先从 props 中看看是否有对应的 event handler
    const props = instance.props;
    // ex: event -> click 那么这里取的就是 onClick
    // 让事情变的复杂一点如果是烤肉串命名的话，需要转换成  change-page -> changePage
    // 需要得到事件名称
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    if (handler) {
        handler(...rawArgs);
    }
}

function initProps(instance, rawProps) {
    console.log("initProps");
    // TODO
    // 应该还有 attrs 的概念
    // attrs
    // 如果组件声明了 props 的话，那么才可以进入 props 属性内
    // 不然的话是需要存储在 attrs 内
    // 这里暂时直接赋值给 instance.props 即可
    instance.props = rawProps;
}

const publicPropertiesMap = {
    // 当用户调用 instance.proxy.$emit 时就会触发这个函数
    // i 就是 instance 的缩写 也就是组件实例对象
    $el: (i) => i.vnode.el,
    $emit: (i) => i.emit,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
};
// 需要让用户可以直接在 render 函数内直接使用 this 来触发 proxy
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // 用户访问 proxy[key]
        // 这里就匹配一下看看是否有对应的 function
        // 有的话就直接调用这个 function
        const { setupState, props } = instance;
        console.log(`触发 proxy hook , key -> : ${key}`);
        if (key !== '$') {
            if (hasOwn(setupState, key)) {
                return setupState[key];
            }
            else if (hasOwn(props, key)) {
                return props[key];
            }
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter[instance];
        }
    },
    set({ _: instance }, key, value) {
        const { setupState } = instance;
        if (setupState && hasOwn(setupState, key)) {
            setupState[key] = value;
        }
    }
};

const emptyAppContext = createAppContext();
let uid = 0;
// 创建组件实例
function createComponentInstance(vnode, parent, suspense = null) {
    // 获取组件type
    const type = vnode.type;
    // 获取组件上下文
    const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext;
    const instance = {
        uid: uid++,
        vnode,
        type,
        parent,
        appContext,
        root: null,
        next: null,
        subTree: null,
        update: null,
        scope: new EffectScope(true /* detached */),
        render: null,
        proxy: null,
        exposed: null,
        exposeProxy: null,
        withProxy: null,
        provides: parent ? parent.provides : Object.create(appContext.provides),
        accessCache: null,
        renderCache: [],
        // local resovled assets
        components: null,
        directives: null,
        // @TODO resolved props and emits options
        // propsOptions: normalizePropsOptions(type, appContext), // props
        // emitsOptions: normalizeEmitsOptions(type, appContext), // emits
        // emit
        emit: null,
        emitted: null,
        // props default value
        propsDefaults: EMPTY_OBJ,
        // inheritAttrs
        inheritAttrs: type.inheritAttrs,
        // state
        ctx: EMPTY_OBJ,
        data: EMPTY_OBJ,
        props: EMPTY_OBJ,
        attrs: EMPTY_OBJ,
        slots: EMPTY_OBJ,
        refs: EMPTY_OBJ,
        setupState: EMPTY_OBJ,
        setupContext: null,
        // suspense related
        suspense,
        suspenseId: suspense ? suspense.pendingId : 0,
        asyncDep: null,
        asyncResolved: false,
        // lifecycle hooks
        // not using enums here because it results in computed properties
        isMounted: false,
        isUnmounted: false,
        isDeactivated: false,
        // 各种钩子
        bc: null,
        c: null,
        bm: null,
        m: null,
        bu: null,
        u: null,
        um: null,
        bum: null,
        da: null,
        a: null,
        rtg: null,
        rtc: null,
        ec: null,
        sp: null // SERVER_PREFETCH
    };
    // 在 prod 坏境下的 ctx 只是下面简单的结构
    // 在 dev 环境下会更复杂
    instance.ctx = {
        _: instance
    };
    // root为实力本身
    instance.root = parent ? parent.root : instance;
    // 赋值 emit
    // 这里使用 bind 把 instance 进行绑定
    // 后面用户使用的时候只需要给 event 和参数即可
    instance.emit = emit.bind(null, instance);
    return instance;
}
function isStatefulComponent(instance) {
    return instance.vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */;
}
function setupComponent(instance) {
    // 1. 处理 props
    // 取出存在 vnode 里面的 props
    const { props, children } = instance.vnode;
    // 判断是否为状态组件(options为状态组件, function 为非状态组件)
    const isStateful = isStatefulComponent(instance);
    initProps(instance, props);
    // 2. @TODO 处理 slots
    // initSlots(instance, children)
    // 执行setup
    const setupResult = isStateful ? setupStatefulComponent(instance) : undefined;
    return setupResult;
}
function setupStatefulComponent(instance) {
    // 用户声明的对象就是 instance.type
    // const Component = {setup(),render()} ....
    const Component = instance.type;
    // 0. 设置缓存
    instance.accessCache = Object.create(null);
    // 1. 创建代理 proxy
    console.log("创建 proxy");
    // proxy 对象其实是代理了 instance.ctx 对象
    // 我们在使用的时候需要使用 instance.proxy 对象
    // 因为 instance.ctx 在 prod 和 dev 坏境下是不同的
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
    // 2. 调用 setup
    // 调用 setup 的时候传入 props
    const { setup } = Component;
    if (setup) {
        // 设置当前 currentInstance 的值
        // 必须要在调用 setup 之前
        setCurrentInstance(instance);
        const setupContext = createSetupContext(instance);
        // 真实的处理场景里面应该是只在 dev 环境才会把 props 设置为只读的
        const setupResult = setup && setup(shallowReadonly(instance.props), setupContext);
        // 取消currentInstance的值
        unsetCurrentInstance();
        // 3. 处理 setupResult
        handleSetupResult(instance, setupResult);
    }
    else {
        finishComponentSetup(instance);
    }
}
function createSetupContext(instance) {
    console.log("初始化 setup context");
    return {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: instance.emit,
        expose: () => { }, // TODO 实现 expose 函数逻辑  组件暴露的对象
    };
}
function handleSetupResult(instance, setupResult) {
    // setup 返回值不一样的话，会有不同的处理
    // 1. 看看 setupResult 是个什么
    if (typeof setupResult === "function") {
        // 如果返回的是 function 的话，那么绑定到 render 上
        // 认为是 render 逻辑
        // setup(){ return ()=>(h("div")) }
        instance.render = setupResult;
    }
    else if (typeof setupResult === "object") {
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
function finishComponentSetup(instance) {
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
let currentInstance = {};
function setCurrentInstance(instance) {
    currentInstance = instance;
}
const unsetCurrentInstance = () => {
    currentInstance && currentInstance.scope.off();
    currentInstance = null;
};

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    //   const emits = component!.emitsOptions;
    // 这里主要是检测组件的 props
    // 核心：只要是 props 发生改变了，那么这个 component 就需要更新
    // 1. props 没有变化，那么不需要更新
    if (prevProps === nextProps) {
        return false;
    }
    // 如果之前没有 props，那么就需要看看现在有没有 props 了
    // 所以这里基于 nextProps 的值来决定是否更新
    if (!prevProps) {
        return !!nextProps;
    }
    // 之前有值，现在没值，那么肯定需要更新
    if (!nextProps) {
        return true;
    }
    // 以上都是比较明显的可以知道 props 是否是变化的
    // 在 hasPropsChanged 会做更细致的对比检测
    return hasPropsChanged(prevProps, nextProps);
}
function hasPropsChanged(prevProps, nextProps) {
    // 依次对比每一个 props.key
    // 提前对比一下 length ，length 不一致肯定是需要更新的
    const nextKeys = Object.keys(nextProps);
    if (nextKeys.length !== Object.keys(prevProps).length) {
        return true;
    }
    // 只要现在的 prop 和之前的 prop 不一样那么就需要更新
    for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i];
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

const queue = [];
const p = Promise.resolve();
let isFlushPending = false;
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJob(job) {
    if (!queue.includes(job)) {
        queue.push(job);
        // 执行所有的 job
        queueFlush();
    }
}
function queueFlush() {
    // 如果同时触发了两个组件的更新的话
    // 这里就会触发两次 then （微任务逻辑）
    // 但是着是没有必要的
    // 我们只需要触发一次即可处理完所有的 job 调用
    // 所以需要判断一下 如果已经触发过 nextTick 了
    // 那么后面就不需要再次触发一次 nextTick 逻辑了
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    while ((job = queue.shift())) {
        if (job) {
            job();
        }
    }
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
        // 挂载组件
        mountComponent(n2, container, anchor, parentComponent);
    }
    else {
        // 更新组件
        updateComponent(n1, n2);
    }
}
// 更新组件节点
function updateComponent(n1, n2, container) {
    console.log('updateComponent 更新组件');
    const instance = (n2.component = n1.component);
    if (shouldUpdateComponent(n1, n2)) {
        console.log(`组件需要更新: ${instance}`);
        // 那么 next 就是新的 vnode 了（也就是 n2）
        instance.next = n2;
        // 这里的 update 是在 setupRenderEffect 里面初始化的，update 函数除了当内部的响应式对象发生改变的时候会调用
        // 还可以直接主动的调用(这是属于 effect 的特性)
        // 调用 update 再次更新调用 patch 逻辑
        // 在update 中调用的 next 就变成了 n2了
        // ps：可以详细的看看 update 中 next 的应用
        // TODO 需要在 update 中处理支持 next 的逻辑
        instance.update();
    }
    else {
        console.log(`组件不需要更新: ${instance}`);
        // 不需要更新的话，那么只需要覆盖下面的属性即可
        n2.component = n1.component;
        n2.el = n1.el;
        instance.vnode = n2;
    }
}
// 挂载组件节点
function mountComponent(initialVNode, container, anchor, parentComponent) {
    // 1. 先创建一个 component instance
    const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
    // 2. 给 instance 加工加工
    setupComponent(instance);
    // 3.渲染component的render, 且通过effect触发update
    setupRenderEffect(instance, initialVNode, anchor, container);
}
// 渲染组件节点, 设置effect
function setupRenderEffect(instance, initialVNode, anchor, container) {
    function componentUpdateFn() {
        // 如果没有挂载过
        if (!instance.isMounted) {
            const proxyToUse = instance.proxy;
            // 通过render生成subTree
            const subTree = (instance.subTree = instance.render.call(proxyToUse, proxyToUse));
            patch(null, subTree, container, anchor, instance);
            initialVNode.el = subTree.el;
            instance.isMounted = true;
        }
        else {
            const { next, vnode } = instance;
            if (next) {
                next.el = vnode.el;
                updateComponentPreRender(instance, next);
            }
            const proxyToUse = instance.proxy;
            const nextTree = instance.render.call(proxyToUse, proxyToUse);
            // 替换之前的 subTree
            const prevTree = instance.subTree;
            instance.subTree = nextTree;
            // 触发 beforeUpdated hook
            console.log("beforeUpdated hook");
            console.log("onVnodeBeforeUpdate hook");
            // 用旧的 vnode 和新的 vnode 交给 patch 来处理
            patch(prevTree, nextTree, prevTree.el, anchor, instance);
            // 触发 updated hook
            console.log("updated hook");
            console.log("onVnodeUpdated hook");
        }
    }
    instance.update = effect(componentUpdateFn, {
        scheduler: () => {
            // 把 effect 推到微任务的时候在执行
            // queueJob(effect);
            queueJob(instance.update);
        }
    });
}
function updateComponentPreRender(instance, nextVNode) {
    const { props } = nextVNode;
    console.log("更新组件的 props", props);
    instance.props = props;
    // console.log("更新组件的 slots");
    // TODO 更新组件的 slots
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
                    patchUnkeyedChildren(c1, c2, container, anchor, parentComponent);
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
function patchUnkeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
    console.log('patchUnKeyedChildren');
    console.log(c1);
    console.log(c2);
    const oldLenght = c1.length;
    const newLenght = c2.length;
    const commonLength = Math.min(oldLenght, newLenght);
    // 循环公共长度, 进行patch
    for (let i = 0; i < commonLength; i++) {
        patch(c1[i], c2[i], container, parentAnchor, parentComponent);
    }
    if (oldLenght > newLenght) {
        // 旧节点大于新节点, 需要删除
        unmountChildren(c1.slice(commonLength), parentComponent, true);
    }
    else {
        // 旧节点小于新节点, 需要挂载
        mountChildren(c2.slice(commonLength), container, parentAnchor, parentComponent);
    }
}
// 最长增长子序列的diff算法
// function patchKeyedChildren (c1, c2, container, parentAnchor, parentComponent) {
// 	// j记录的是老元素 从首位开始 找相同key的新元素, 一旦找不到就停止
// 	let j = 0
// 	let prevVNode = c1[j]
// 	let nextVNode = c2[j]
// 	let prevEnd = c1.length - 1
// 	let nextEnd = c2.length - 1
// 	// 从开头比较, 如果key相同就pacth, 如果不同就停止
// 	// 再从末尾比较, 如果key相同就patch, 如果不同就停止
// 	outer: {
// 		while (prevVNode.key === nextVNode.key) {
// 			patch(prevVNode, nextVNode, container, parentAnchor, parentComponent)
// 			j++
// 			if (j > prevEnd || j > nextEnd) {
// 				break outer
// 			}
// 			prevVNode = c1[j]
// 			nextVNode = c2[j]
// 		}
// 		prevVNode = c1[prevEnd]
// 		nextVNode = c2[nextEnd]
// 		while (prevVNode.key === nextVNode.key) {
// 			patch(prevVNode, nextVNode, container, parentAnchor, parentComponent)
// 			prevEnd--
// 			nextEnd--
// 			if (j > prevEnd || j > nextEnd) {
// 				break outer
// 			}
// 			prevVNode = c1[prevEnd]
// 			nextVNode = c2[nextEnd]
// 		}
// 	}
// 	// 相同的比较完了, 要把从索引j到末尾, 老元素不存在的新元素挂载
// 	if (j > prevEnd && j <= nextEnd) {
// 		const nextPos = nextEnd + 1
// 		const refNode = nextPos < c2.length ? c2[nextPos].el : null
// 		while (j <= nextEnd) {
// 			patch(null, c2[j++], container, refNode, parentComponent)
// 		}
// 	} else if (j > nextEnd) {
// 		// 再把从索引j开始, 新元素没有的老元素卸载
// 		while (j <= prevEnd) {
// 			unmount(c1[j], parentComponent, null, true)
// 		}
// 	} else {
// 		// 下面是进行移动
// 		// nextEnd是尾相等的索引, 他的前一位就是 开始比较不同的索引
// 		const nextLeft = nextEnd - j + 1
// 		// source数组作用是 生成一个 与 待比较新元素个数相同的 每个值为-1(-1证明没有相同key的老元素) 的数组 
// 		const source = []
// 		for (let i = 0; i < nextLeft; i++) {
// 			source.push(-1)
// 		}
// 		const prevStart = j
// 		const nextStart = j
// 		let moved = false
// 		let pos = 0
// 		// 生成索引表
// 		const keyIndex = {}
// 		for (let i = nextStart; i <= nextEnd; i++) {
// 			keyIndex[c2[i].key] = i
// 		}
// 		// 如果进行了patch, 就记录一下
// 		let patched = 0
// 		// 遍历旧子元素剩余未处理的节点
// 		for (let i = prevStart; i <= prevEnd; i++) {
// 			prevVNode = c1[i]
// 			// 已更新的节点, 要小于需要更新的节点, 才会patch, 否则就删除
// 			if (patched < nextLeft) {
// 				// 通过索引表 找出新子元素 有相同key的节点的位置
// 				const k = keyIndex[prevVNode.key]
// 				// 如果找到了 就进行patch
// 				if (typeof k !== 'undefined') {
// 					nextVNode = c2[k]
// 					patch(prevVNode, nextVNode, container, parentAnchor, parentComponent)
// 					patched++
// 					// 更新source, 把-1更新为 当前的索引
// 					source[k - nextStart] = i
// 					// 判断是否需要移动
// 					if (k < pos) {
// 						moved = true
// 					} else {
// 						pos = k
// 					}
// 				} else {
// 					// 如果没找到就移除
// 					unmount(prevVNode, parentComponent, null, true)
// 				}
// 			} else {
// 				unmount(prevVNode, parentComponent, null, true)
// 			}
// 			if (moved) {
// 				const seq = getSequence(source)
// 				// j 指向最长递增子序列的最后一个值
// 				let j = seq.length - 1
// 				// 从后向前遍历新 children 中的剩余未处理节点
// 				for (let i = nextLeft - 1; i >= 0; i--) {
// 					if (i === -1) {
// 						// 作为全新的节点挂载
// 						const pos = i + nextStart
// 						const nextVNode = c2[pos]
// 						const nextPos = pos + 1
// 						patch(null, nextVNode, container, nextPos < c2.length ? c2[nextPos].el : null, parentComponent)
// 					} else if (i !== seq[j]) {
// 						// 说明该节点需要移动
// 						const pos = i + nextStart
// 						const nextVNode = c2[pos]
// 						const nextPos = pos + 1
// 						container.insertBefore(nextVNode.el, nextPos < c2.length ? c2[nextPos].el : null)
// 					} else {
// 						// 当 i === seq[j] 时，说明该位置的节点不需要移动
// 						// 并让 j 指向下一个位置
// 						j--
// 					}
// 				}
// 			}
// 		}
// 	}
// }
// 最长增长子序列的diff算法
function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
    // 比较索引
    let i = 0;
    // 新节点的长度
    const l2 = c2.length;
    // 旧节点末尾指针
    let e1 = c1.length - 1;
    // 新节点末尾指针
    let e2 = l2 - 1;
    // 1.从首至尾依次对比
    while (i <= e1 && i <= e2) {
        const n1 = c1[i];
        const n2 = c2[i];
        // 如果发现相同key的节点则patch, 否则跳出循环
        if (isSameVNodeType(n1, n2)) {
            patch(n1, n2, container, parentAnchor, parentComponent);
        }
        else {
            break;
        }
        i++;
    }
    // 2.从尾至首依次对比
    while (i <= e1 && i <= e2) {
        const n1 = c1[e1];
        const n2 = c2[e2];
        // 如果发现相同key的节点则patch, 否则跳出循环
        if (n1 && n2 && isSameVNodeType(n1, n2)) {
            patch(n1, n2, container, parentAnchor, parentComponent);
        }
        else {
            break;
        }
        e1--;
        e2--;
    }
    // 3.[1, 2, 3] => [1, 4, 2, 3]这种情况,要处理4 (i:1, e1:0, e2:1)
    // 当前后对比结束, 比较索引比旧节点末尾指针大(证明旧节点遍历完了), 且比新节点末尾指针小, 说明有没挂载的新节点
    if (i > e1) {
        if (i <= e2) {
            // nextPos是已经处理的新节点 的 最后一个的末尾指针
            const nextPos = e2 + 1;
            // 设置锚点, 这个已处理新节点末尾指针小于新节点个数, 则插到已处理末尾新节点之前, 否则就插入到最后
            const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
            while (i <= e2) {
                patch(null, c2[i], container, anchor, parentComponent);
                i++;
            }
        }
    }
    // 4.[1, 2, 3, 4] => [1, 3, 4]这种情况,要处理2
    // 当前后对比结束, 比较索引比新节点末尾指针大(证明新节点遍历完了), 且比旧节点末尾指针小, 说明有没写在的旧节点
    else if (i > e2) {
        while (i <= e1) {
            unmount(c1[i], parentComponent, null, true);
            i++;
        }
    }
    // 5.未知序列的处理
    // a b [c d e] f g
    // a b [d e c h] f g
    // i = 2, e1 = 4, e2 = 5
    else {
        // 旧起始索引
        const s1 = i;
        // 新起始索引
        const s2 = i;
        // 5.1 创建未处理节点索引map
        const keyToNewIndexMap = new Map();
        // 循环 待处理新节点, 设置map, key为节点key, value为节点本身索引
        // {d: 2, e: 3, c: 4, h: 5}
        for (i = s2; i <= e2; i++) {
            const nextChild = c2[i] || {};
            if (nextChild.key != null) {
                keyToNewIndexMap.set(nextChild.key, i);
            }
        }
        console.log('keyToNewIndexMap', keyToNewIndexMap);
        // 5.2 从后向前循环遍历需要patch的旧节点, 且patch
        let j;
        // 待处理老节点指针, 用来标记当前已经遍历了几个待处理老节点
        let patched = 0;
        // 新节点中待处理的节点数[d e c h] 4个
        const toBePatched = e2 - s2 + 1;
        // 节点是否需要移动的标记
        let moved = false;
        // 最大索引指针
        let maxNewIndexSoFar = 0;
        // 待处理新节点对应旧节点索引数组, 简称 新对旧索引数组
        const newIndexToOldIndexMap = new Array(toBePatched);
        // 新对旧索引数组初始化每个元素为0 [0, 0, 0, 0]
        for (i = 0; i < toBePatched; i++)
            newIndexToOldIndexMap[i] = 0;
        // 循环 待处理旧节点
        for (i = s1; i <= e1; i++) {
            const prevChild = c1[i] || {};
            // 如果当前已遍历的待处理老节点大于待处理新节点, 说明剩下的待处理老节点都需要卸载
            if (patched >= toBePatched) {
                unmount(prevChild, parentComponent, null, true);
                continue;
            }
            // 如果当前遍历的待处理旧节点有key,从待处理新节点map取出对应key的待处理新节点的index (d:2)
            let newIndex;
            if (prevChild.key != null) {
                newIndex = keyToNewIndexMap.get(prevChild.key);
            }
            else {
                // 如果不存在key, 循环待处理新结点, 试着找出相同类型的节点, newIndex赋值他的索引
                for (j = s2; j <= e2; j++) {
                    if (newIndexToOldIndexMap[j - s2] === 0 && isSameVNodeType(prevChild, c2[j])) {
                        newIndex = j;
                        break;
                    }
                }
            }
            if (newIndex === undefined) {
                // newIndex不存在证明没有可复用的旧节点, 需要卸载这个待处理旧节点
                unmount(prevChild, parentComponent, null, true);
            }
            else {
                // 如果找到了 则说明可以复用, 新对旧索引数组 把新节点都赋值上对应的旧节点索引(对应不上的还是0)
                // [4, 5, 3, 0]
                newIndexToOldIndexMap[newIndex - s2] = i + 1;
                if (newIndex >= maxNewIndexSoFar) {
                    // 如果索引大于最大索引指针, 更新索引指针
                    maxNewIndexSoFar = newIndex;
                }
                else {
                    // 如果索引小于最大索引指针, 说明需要移动
                    moved = true;
                }
                // patch新旧节点
                patch(prevChild, c2[newIndex], container, null, parentComponent);
                // 待处理指针向后进一位
                patched++;
            }
        }
        // 5.3 移动于与挂载
        // 根据新对旧索引数组 计算出 最长增长子序列 [d, e] [0, 1]
        const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : EMPTY_ARR;
        // 获取 最长增长子序列 的 尾索引
        j = increasingNewIndexSequence.length - 1;
        // 待处理新节点从后向前循环
        for (i = toBePatched - 1; i >= 0; i--) {
            // 获取新节点索引, 以及新节点
            const nextIndex = s2 + i;
            const nextChild = c2[nextIndex];
            // 设置锚点, 待处理新节点后面还有节点,就插在这个节点的前面,否则就插入到最后
            const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;
            // 如果新对旧索引值为0, 说明他没有课复用的节点, 需要挂载
            if (newIndexToOldIndexMap[i] === 0) {
                patch(null, nextChild, container, anchor, parentComponent);
            }
            else if (moved) {
                // 如果有移动标记, 证明需要移动
                // 待处理新节点的索引, 和 最长增长子序列 里面存储 旧节点索引不一致, 就移动节点
                // j < 0 指 最长增长子序列为空数组 []
                if (j < 0 || i !== increasingNewIndexSequence[j]) {
                    move(nextChild, container, anchor);
                }
                else {
                    j--;
                }
            }
        }
    }
}
const move = (vnode, container, anchor, moveType, parentSuspense = null) => {
    const { el, type, children, shapeFlag } = vnode;
    renderApi.hostInsert(el, container, anchor);
};
// 求最长增长子序列
// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = ((u + v) / 2) | 0;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
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

export { Fragment, Text, createRenderer, h, render };
//# sourceMappingURL=runtime-core.esm-bundler.js.map
