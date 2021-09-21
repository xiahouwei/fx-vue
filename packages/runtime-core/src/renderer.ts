import { isBoolean, ShapeFlags } from "@fx-vue/shared"
import { createAppAPI } from "./apiCreateApp"
import { Fragment, Text } from "./vnode"

export function render (vnode, container) {
    mount(vnode, container)
}

// 创建renderer函数 返回renderer对象
export function createRenderer (options) {
    return baseCreateRenderer(options)
}

// 返回createApp 常用中main.js中初始化使用
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
    debugger
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
            } else if (shapeFlag & ShapeFlags.COMPONENT) {
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
    // 生成元素
    const el = document.createElement(type)
    // 生成属性
    mountProps(props, el)
    // 生成子元素
    mountChildren(vnode, el)
    // 挂载
    conatainer.appendChild(el)
}

// 渲染组件
function mountComponent (vnode, container) {
    // 如果是组件 type 内必然有render函数
    const _vnode = vnode.type.render()
    mount(_vnode, container)
}

// 渲染传送门节点
function mountFragment (vnode, conatainer) {
    mountChildren(vnode, conatainer)
}

// 渲染子节点
function mountChildren (vnode, conatainer) {
    const { shapeFlag, children } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 子节点为文本
        mountTextNode(vnode, conatainer)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 子节点为数组
        children.forEach(child => {
            mount(child, conatainer)
        })
    }
}


const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/
// 渲染属性
function mountProps (props, el) {
    for (const key in props) {
        let value = props[key]
        switch (key) {
            // 类名
            case 'class':
                el.className = value
                break
            // 样式
            case 'style':
                for (const styleName in value) {
                    el.style[styleName] = value[styleName]
                }
                break
            default:
                // 事件
                if (/^on[^a-z]/.test(key)) {
                    const eventName = key.slice(2).toLowerCase()
                    el.addEventListener(eventName, value)
                } else if (domPropsRE.test(key)) {
                    // value|checked|selected|muted|disabled 这几种属性直接在dom上赋值
                    if (value === '' && isBoolean(el[key])) {
                        value = true
                    }
                    el[key] = value
                } else {
                    // 剩下的属性使用attr的api进行操作
                    if (value == null || value === false) {
                        el.removeAttribute(key)
                    } else {
                        el.setAttribute(key, value)
                    }
                }
                break
        }
    }
}
