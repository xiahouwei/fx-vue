import { isObject } from "@fx-vue/shared"
import {
    mutableHandlers,
    shallowReactiveHandlers,
    readonlyHandlers,
    shallowReadonlyHandlers
} from './baseHandlers'

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