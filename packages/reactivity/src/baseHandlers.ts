import { extend, isObject } from "../../shared/src/index"
import { reactive, readonly } from "./reactive"
// 生成Getter
function createGetter (isReadonly = false, shallow = false) {
    return function get (target, key, receiver) {
        const res = Reflect.get(target, key, receiver)
        if (!isReadonly) {
            // 收集依赖, 数据变化后更新视图
        }
        if (shallow) {
            // 浅拦截不需要递归
            return res
        }
        if (isObject(res)) {
            // 如果是深拦截且是对象 则递归
            return isReadonly ? readonly(res) : reactive(res)
        }
        return res
    }
}
// 生成Setter
function createSetter (isReadonly = false) {
    return function set (target, key, value, receiver) {
        const result = Reflect.set(target, key, value, receiver)
        return result
    }
}

const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

const set = createSetter()
const shallowSet = createSetter(true)

export const mutableHandlers = {
    get,
    set
}
export const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet
}
let readonlyObj = {
    set: (tareget, key) => {
        console.warn(`set on key ${key} failed`)
    }
}
export const readonlyHandler = extend({
    get: readonlyGet
}, readonlyObj)
export const shallowReadonlyHandlers = extend({
    get: shallowReadonlyGet
}, readonlyObj)