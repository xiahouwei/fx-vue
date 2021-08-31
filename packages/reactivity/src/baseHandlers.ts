import { extend, hasChanged, hasOwn, isArray, isIntegerKey, isObject } from "@fx-vue/shared"
import { track, trigger } from "./effect"
import { TrackOpTypes, TriggerOpTypes } from "./operations"
import { reactive, readonly } from "./reactive"


// 创建get
const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

// 生成Getter
function createGetter (isReadonly = false, shallow = false) {
    return function get (target, key, receiver) {
        const res = Reflect.get(target, key, receiver)
        if (!isReadonly) {
            // 收集依赖, 数据变化后更新视图
            track(target, TrackOpTypes.GET, key)
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

// 创建set
const set = createSetter()
const shallowSet = createSetter(true)

// 生成Setter
function createSetter (shallow = false) {
    return function set (target, key, value, receiver) {
        // 获取以前的值
        const oldValue = target[key]
        // 1.如果是数组,且改变的是下标, 通过判断key 和 数组lenth比 就可以知道是否存在
        // 2.否则就是对象, 就判断是否是自身的属性
        const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key)
        const result = Reflect.set(target, key, value, receiver)
        // 区分新增还是修改
        if (!hadKey) {
            // 没有key就是新增, 
            trigger(target, TriggerOpTypes.ADD, key, value)
        } else if (hasChanged(oldValue, value)) {
            // 有key就是修改
            trigger(target, TriggerOpTypes.SET, key, value, oldValue)
        }
        // 数据更新时, 通知对应的属性执行effect
        return result
    }
}
// 对应reactive的handler参数
export const mutableHandlers = {
    get,
    set
}
// 对应readonly的handler参数
export const readonlyHandlers = {
    get: readonlyGet,
    set: (target, key) => {
        console.warn(
            `Set operation on key "${String(key)}" failed: target is readonly.`,
            target
        )
        return true
    },
    deleteProperty: (target, key) => {
        console.warn(
            `Delete operation on key "${String(key)}" failed: target is readonly.`,
            target
        )
        return true
    }
}

// 对应shallowReactive的handler参数
export const shallowReactiveHandlers = extend(
    {},
    mutableHandlers,
    {
        get: shallowGet,
        set: shallowSet
    }
)

// 对应shallowReadonly的handler参数
export const shallowReadonlyHandlers = extend(
    {},
    readonlyHandlers,
    {
        get: shallowReadonlyGet
    }
)