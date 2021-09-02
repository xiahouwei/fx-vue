import { isFunction, NOOP } from "@fx-vue/shared"
import { effect, track, trigger } from "./effect"
import { TrackOpTypes, TriggerOpTypes } from "./operations"


// cpmuted计算属性
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

    // 默认第一次执行getter方法
    let dirty = true
    let computed
    // 把getter进行effct化, effct执行,就会触发依赖收集
    let _effect = effect(getter, {
        // 不立即执行
        lazy: true,
        // 当属性依赖的值发生变化, 就会执行scheduler, 同时设置dirty状态
        scheduler: () => {
            if (!dirty) {
                dirty = true
                // 触发computed的value属性
                trigger(computed, TriggerOpTypes.SET, 'value')
            }
        }
    })
    let value
    computed = {
        get value () {
            // 如果是dirty的, 就执行getter, 然后改变dirty状态, 就实现了computed的惰性特征
            if (dirty) {
                // 这里_effect就是返回的getter,执行getter, 把gtter返回的结果赋值给value
                value = _effect()
                dirty = false
                // 收集computed的value属性
                track(computed, TrackOpTypes.GET, 'value')
            }
            return value
        },
        set value (newValue) {
            setter(newValue)
        }
    }

    return computed
}