import { createVNode } from "./vnode";

export function h (type:any, props:any, children: String | Array<any>) {
    return createVNode(type, props, children)
}