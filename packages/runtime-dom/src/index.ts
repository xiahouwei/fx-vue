import { createRenderer } from '@fx-vue/runtime-core'
import { isString } from '@fx-vue/shared'

let renderer

function ensureRenderer () {
    return renderer || (renderer = createRenderer)
}

export function createApp (...args) {
    const app = ensureRenderer().createApp(...args)
    const { mount } = app
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

function normalizeContainer (container) {
    if (isString(container)) {
        const res = document.querySelector(container)
        return res
    }
    return container
}

export * from '@fx-vue/runtime-core'