import { hasChanged, isArray, isObject } from "@fx-vue/shared"
import { track, trigger } from "./effect"
import { TrackOpTypes, TriggerOpTypes } from "./operations"
import { reactive } from "./reactive"

export function ref (value) {
    return createRef(value)
}

export function shallowRef (value) {
    return createRef(value, true)
}

const convert = (value) => isObject(value) ? reactive(value) : value

// ref类
class RefImpl {
    private _value

    public readonly __v_isRef = true

    constructor (private _rawValue, public readonly _shallow = false) {
        // 如果是浅的, 做一次代理就可以, 但是如果是深度的, 要进行深度代理了, 这里就可以用reactive了
        this._value = _shallow ? _rawValue : convert(_rawValue)
    }

    // ref类的属性访问器
    get value () {
        track(this, TrackOpTypes.GET, 'value')
        return this._value
    }

    // 通过代理 在实现触发依赖
    set value (newVal) {
        // 如果发生了改变
        if (hasChanged(newVal, this._rawValue)) {
            // 进行赋值
            this._rawValue = newVal
            this._value = newVal
            trigger(this, TriggerOpTypes.SET, 'value', newVal)
        }
    }
}


function createRef (rawValue, shallow = false) {
    return new RefImpl(rawValue, shallow)
}

// toRef实现类
class ObjectRefImpl {
    public readonly __v_isRef = true

    constructor (private readonly _object, private readonly _key) {}

    get value () {
        // 代理, 外界通过访问value, 代理到原始object对应的属性, 这样不就等于触发了原始object的依赖收集, 注意原对象必须是响应式的
        return this._object[this._key]
    }

    set value (newVal) {
        // 外界改变value, 同样去改变原始object的属性, 这样就触发了依赖
        this._object[this._key] = newVal
    }
}

// 用来把一个响应式对象的的某个 key 值转换成 ref
/*
 *  const obj = reactive({ foo: 1 }) // obj 是响应式数据
 *  const obj2 = { foo: obj.foo }*
 *  effect(() => {
 *      console.log(obj2.foo) // 这里读取 obj2.foo
 *  })
 *  obj.foo = 2  // 设置 obj.foo 显然无效
 */
export function toRef (object, key) {
    return new ObjectRefImpl(object, key)
}

export function toRefs (object, key) {
    // object 可能是数组或者对象
    const ret = isArray(object) ? new Array(object.length) : {}
    for (let key in object) {
        ret[key] = toRef(object, key)
    }
    return ret
}