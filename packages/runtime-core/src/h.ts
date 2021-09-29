import { isArray, isObject } from "@fx-vue/shared";
import { createVNode, isVNode } from "./vnode";

export function h(type: any, propsOrChildren: any, children: String | Array<any>) {
    // 为了方便h函数的使用, 应该允许用户不传propsOrChildren, 所以要做一些处理
    const l = arguments.length
    if (l === 2) {
        // propsOrChildren  是对象不是数组, 那么可能传的是props, 也可能传的是  vnode类型的children
        if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
            if (isVNode(propsOrChildren)) {
                return createVNode(type, null, [propsOrChildren])
            }
            return createVNode(type, propsOrChildren)
        } else {
            // propsOrChildren 是数组, 必然是children
            return createVNode(type, null, propsOrChildren)
        }
    } else {
        if (l > 3) {
            // 如果参数大于3个, 则把第三个开始的参数 至 最后一个参数都当作children
            children = Array.prototype.slice.call(arguments, 2)
        } else if (l === 3 && isVNode(children)) {
            // 如果传了3个参数, 但是最后一个参数不是数组 而是vnode, 那么帮他转成数组
            children = [children]
        }
        return createVNode(type, propsOrChildren, children)
    }
}