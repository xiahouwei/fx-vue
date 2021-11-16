import { hasChanged, isArray, isObject } from "@fx-vue/shared"
import { track, trigger } from "./effect"
import { TrackOpTypes, TriggerOpTypes } from "./operations"
import { reactive } from "./reactive"

export function ref(value) {
    return createRef(value)
}

export function shallowRef(value) {
    return createRef(value, true)
}

// 如果传入对象, 则返回响应式的对象
const convert = (value) => isObject(value) ? reactive(value) : value

// ref类
class RefImpl {
    private _value

    public readonly __v_isRef = true

    constructor(private _rawValue, public readonly _shallow = false) {
        console.log('创建ref', _rawValue)
        // 如果是浅的, 做一次代理就可以, 但是如果是深度的, 要进行深度代理了, 这里就可以用reactive了
        this._value = _shallow ? _rawValue : convert(_rawValue)
    }

    // ref类的属性访问器
    get value() {
        console.log('ref, 触发get value 执行track')
        track(this, TrackOpTypes.GET, 'value')
        return this._value
    }

    // 通过代理 在实现触发依赖
    set value(newVal) {
        // 如果发生了改变
        if (hasChanged(newVal, this._rawValue)) {
            console.log('ref, 触发set value 执行trigger', newVal)
            // 进行赋值
            this._rawValue = newVal
            this._value = newVal
            trigger(this, TriggerOpTypes.SET, 'value', newVal)
        }
    }
}


function createRef(rawValue, shallow = false) {
    return new RefImpl(rawValue, shallow)
}

// toRef实现类
class ObjectRefImpl {
    public readonly __v_isRef = true

    constructor(private readonly _object, private readonly _key) { }

    get value() {
        // 代理, 外界通过访问value, 代理到原始object对应的属性, 这样不就等于触发了原始object的依赖收集, 注意原对象必须是响应式的
        return this._object[this._key]
    }

    set value(newVal) {
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
export function toRef(object, key) {
    return new ObjectRefImpl(object, key)
}

export function toRefs(object, key) {
    // object 可能是数组或者对象
    const ret = isArray(object) ? new Array(object.length) : {}
    for (let key in object) {
        ret[key] = toRef(object, key)
    }
    return ret
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
        } else {
            return Reflect.set(target, key, value, receiver);
        }
    },
};

// 这里没有处理 objectWithRefs 是 reactive 类型的时候
// TODO reactive 里面如果有 ref 类型的 key 的话， 那么也是不需要调用 ref .value 的 
// （but 这个逻辑在 reactive 里面没有实现）
export function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, shallowUnwrapHandlers);
}

// 把 ref 里面的值拿到
export function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}

export function isRef(value) {
    return !!value.__v_isRef;
}
