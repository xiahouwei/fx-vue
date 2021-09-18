import { ShapeFlags } from "@fx-vue/shared"
import { createAppAPI } from "./apiCreateApp"
import { Fragment, Text } from "./vnode"

export function createRenderer (options) {
    return baseCreateRenderer(options)
}

function baseCreateRenderer (optons) {
    const render = (vnode, container) => {
        if (vnode == null) {
            if (container._vnode) {
                // 如果存在vnode, 则unmount
            }
        } else {
            // patch
            mount(vnode, container)
        }
        container._vnode = vnode
    }
    return {
        render,
        createApp: createAppAPI(render)
    }
}

// 根据vnode生成节点, 后期改为patch
function mount (vnode, container) {
    const { type, shapeFlag } = vnode
    switch (type) {
        case Text:
            // 文本节点
            mountTextNode(vnode, container)
            break
        case Fragment:
            // 传送门节点
            mountFragment(vnode, container)
        default:
            if (shapeFlag & ShapeFlags.ELEMENT) {
                // 元素节点
                mountElement(vnode, container)
            } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                // 组件节点
                mountComponent(vnode, container)
            }
    }
}

// 渲染文本节点
function mountTextNode (vnode, conatainer) {
    const textNode = document.createTextNode(vnode.children)
    conatainer.appendChild(textNode)
}

// 渲染元素节点
function mountElement (vnode, conatainer) {
    const { type, props, children } = vnode
    const el = document.createElement(type)
    mountProps(props, el)
    mountChildren(vnode, el)
    conatainer.appendChild(el)
}

// 渲染组件节点
function mountComponent (vnode, conatainer) {

}

// 渲染传送门节点
function mountFragment (vnode, conatainer) {
    mountChildren(vnode, conatainer)
}

function mountChildren (vnode, conatainer) {
    const { shapeFlag, children } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        mountTextNode(vnode, conatainer)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        children.forEach(child => {
            mount(child, conatainer)
        })
    }
}

function mountProps (props, el) {
    for (const key in props) {
        const value = props[key]
        switch (key) {
            case 'class':
                el.className = value
                break
            case 'style':
                for (const styleName in value) {
                    el.style[styleName] = value[styleName]
                }
                break
            default:
                if (/^on[^a-z]/.test(key)) {
                    const eventName = key.slice(2).toLowerCase()
                    el.addEventListener(eventName, value)
                }
                break
        }
    }
}
