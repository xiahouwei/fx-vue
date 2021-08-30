const isObject = (value) => typeof value === 'object' && value !== null;
const extend = Object.assign;

// 生成Getter
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        const res = Reflect.get(target, key, receiver);
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
// 生成Setter
function createSetter(isReadonly = false) {
    return function set(target, key, value, receiver) {
        const result = Reflect.set(target, key, value, receiver);
        return result;
    };
}
const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const set = createSetter();
const shallowSet = createSetter(true);
const mutableHandlers = {
    get,
    set
};
const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet
};
let readonlyObj = {
    set: (tareget, key) => {
        console.warn(`set on key ${key} failed`);
    }
};
const readonlyHandler = extend({
    get: readonlyGet
}, readonlyObj);
const shallowReadonlyHandlers = extend({
    get: shallowReadonlyGet
}, readonlyObj);

// 自动垃圾回收
const reactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
// new Proxy() 拦截数据的get和set
function createReactiveObject(target, isReadonly, baseHandlers) {
    // reactive只能拦截object
    if (!isObject(target)) {
        return target;
    }
    // 如果存在缓存,直接返回proxy实例
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    const exisitProxy = proxyMap.get(target);
    if (exisitProxy) {
        return exisitProxy;
    }
    // 创建proxy实例, 进行拦截
    const proxy = new Proxy(target, baseHandlers);
    // 缓存
    proxyMap.set(target, proxy);
    return proxy;
}
function reactive(target) {
    return createReactiveObject(target, false, mutableHandlers);
}
function shallowReactive(target) {
    return createReactiveObject(target, false, shallowReactiveHandlers);
}
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandler);
}
function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers);
}

export { reactive, readonly, shallowReactive, shallowReadonly };
//# sourceMappingURL=reactivity.esm-bundler.js.map
