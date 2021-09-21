import { createRenderer } from '@fx-vue/runtime-core'
import { isString } from '@fx-vue/shared'

const rendererOptions = {}

let renderer
// 如果存在renderer对象则返回, 否则创建一个返回
function ensureRenderer () {
    return renderer || (renderer = createRenderer(rendererOptions))
}

export function createApp (...args) {
    const app = ensureRenderer().createApp(...args)
    const { mount } = app
    // 重写mount方法
    app.mount = function (containerOrSelector) {
        const container = normalizeContainer(containerOrSelector)
        if (!container) return

        // const component = app._component

        // clear content before mounting
        container.innerHTML = ''
        const proxy = mount(container, false)
        if (container instanceof Element) {
            container.removeAttribute('v-cloak')
            container.setAttribute('data-v-app', '')
        }
        return proxy
    }
    return app
}

// 格式化container容器方法
function normalizeContainer (container) {
    if (isString(container)) {
        const res = document.querySelector(container)
        return res
    }
    return container
}

export * from '@fx-vue/runtime-core'