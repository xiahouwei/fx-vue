import { isObject, toRawType } from "@fx-vue/shared"
import {
    mutableHandlers,
    shallowReactiveHandlers,
    readonlyHandlers,
    shallowReadonlyHandlers
} from './baseHandlers'


// reactiveflag枚举
export const enum ReactiveFlags {
    SKIP = '__v_skip',
    IS_REACTIVE = '__v_isReactive',
    IS_READONLY = '__v_isReadonly',
    RAW = '__v_raw'
}
// target类型枚举
const enum TargetType {
    // 无效
    INVALID = 0,
    // Object, Array
    COMMON = 1,
    // Map, Set, WeakMap, WeakSet
    COLLECTION = 2
}

// 过去target类型
function targetTypeMap (rawType) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return TargetType.COMMON
        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
            return TargetType.COLLECTION
        default:
            return TargetType.INVALID
    }
}

function getTargetType (value) {
    // 如果target 有忽略标记, 或者被冻结, 则属于无效类型, 否则根据原始类型来判断
    return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
        ? TargetType.INVALID
        : targetTypeMap(toRawType(value))
}
  

// 自动垃圾回收
const reactiveMap = new WeakMap()
const readonlyMap = new WeakMap()
// new Proxy() 拦截数据的get和set
export function createReactiveObject (target, isReadonly, baseHandlers) {
    // reactive只能拦截object
    if (!isObject(target)) {
        return target
    }
    // 如果存在缓存,直接返回proxy实例
    const proxyMap = isReadonly ? readonlyMap : reactiveMap
    const exisitProxy = proxyMap.get(target)
    if (exisitProxy) {
        return exisitProxy
    }
    // 创建proxy实例, 进行拦截
    // @TODO baseHandlers还要考虑集合的情况(map, set, weakmap, weakset)
    const proxy = new Proxy(target, baseHandlers)
    // 缓存
    proxyMap.set(target, proxy)
    return proxy
}


export function reactive (target) {
    return createReactiveObject(target, false, mutableHandlers)
}


export function shallowReactive (target) {
    return createReactiveObject(target, false, shallowReactiveHandlers)
}


export function readonly (target) {
    return createReactiveObject(target, true, readonlyHandlers)
}


export function shallowReadonly (target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers)
}