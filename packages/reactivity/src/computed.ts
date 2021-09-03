import { isFunction, NOOP } from "@fx-vue/shared"
import { effect, track, trigger } from "./effect"
import { TrackOpTypes, TriggerOpTypes } from "./operations"
import { ReactiveFlags } from "./reactive"

// computed初始化类
class ComputedRefImpl {
    // 用于存储getter返回的值
    private _value
    // dirty标识, 用于实现惰性, 默认为true, 第一次就执行getter方法
    private _dirty = true
    // 用于存贮effect化的getter
    public readonly effect
    // ref标识
    public readonly __v_isRef = true
    // 只读标识
    public readonly [ReactiveFlags.IS_READONLY]

    constructor (
        getter,
        private readonly _setter,
        isReadonly: boolean
    ) {
        // 把getter进行effct化, effct执行,就会触发依赖收集
        this.effect = effect(getter, {
            // 不立即执行
            lazy: true,
            // 当属性依赖的值发生变化, 就会执行scheduler, 同时设置dirty状态
            scheduler: () => {
                if (!this._dirty) {
                    this._dirty = true
                    // 触发computed的value属性
                    trigger(this, TriggerOpTypes.SET, 'value')
                }
            }
        })
        // 设置只读标记
        this[ReactiveFlags.IS_READONLY] = isReadonly
    }
    
    // 通过代理value, 来对computed进行依赖收集
    get value () {
        // 如果是dirty的, 就执行getter, 然后改变dirty状态, 就实现了computed的惰性特征
        if (this._dirty) {
            // 这里_effect就是返回的getter,执行getter, 把gtter返回的结果赋值给value
            this._value = this.effect()
            this._dirty = false
            // 收集computed的value属性
            track(computed, TrackOpTypes.GET, 'value')
        }
        return this._value
    }

    // 如果对compouted进行set, 则触发设置的setter函数
    set value (newValue) {
        this._setter(newValue)
    }
    
}

// computed计算属性
export function computed (getterOrOptions) {
    let getter
    let setter
    // getterOrOptions参数可能是funciton 或者 对象, 根据传入参数的不同, 设置getter ,setter
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions
        setter = NOOP
    } else {
        getter = getterOrOptions.get
        setter = getterOrOptions.set
    }

    // 返回computed实例, 如果getter是个function, 或者没有传入setter 那么就是只读的
    return new ComputedRefImpl(getter, setter, isFunction(getterOrOptions) || !getterOrOptions.set)
}