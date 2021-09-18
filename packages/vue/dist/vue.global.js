var VueShared = (function (exports) {
  'use strict';

  // 空对象
  Object.freeze({});
  // 空数组
  Object.freeze([]);
  // 永远返回false
  const NO = () => false;
  // 判断是数组
  const isArray = Array.isArray;
  // 判断是string
  const isString = (val) => typeof val === 'string';
  // 判断是对象
  const isObject = (val) => val !== null && typeof val === 'object';

  // 创建vnode
  function createVNode(type, props, children) {
      if (!props) {
          props = {};
      }
      // type 为 string : createVNode("div")
      // type 为 object : createVNode(App) 用户传入了options
      // 根据传入的节点类型type生成shapeFlag
      const shapeFlag = isString(type)
          ? 1 /* ELEMENT */
          : isObject(type)
              ? 4 /* STATEFUL_COMPONENT */
              : 0;
      const vnode = {
          el: null,
          component: null,
          key: props.key || null,
          type,
          props,
          children,
          shapeFlag
      };
      // 格式化children, 以及通过位运算 更新shapeFlag
      normalizeChildren(vnode, children);
      return vnode;
  }
  // 格式化children
  function normalizeChildren(vnode, children) {
      let type = 0;
      const { shapeFlag } = vnode;
      // children为 null / undifined
      if (children == null) {
          children = null;
      }
      else if (isArray(type)) {
          // children为数组 更新父的shapFlag
          type = 16 /* ARRAY_CHILDREN */;
      }
      else if (typeof children === 'object') {
          // 如果children是object 暂时只标识slots_children这种类型
          // 这里父暂时只有 element 和 component
          // 只要父是component, 那么 children就是 slots
          if (shapeFlag & 1 /* ELEMENT */) ;
          else {
              // children是slots, 更新父的shapFlag
              type = 32 /* SLOTS_CHILDREN */;
          }
      }
      else {
          // 剩下的children都格式化为文本
          children = String(children);
          type = 8 /* TEXT_CHILDREN */;
      }
      // 赋值children
      vnode.children = children;
      // 赋值shapeFlag
      vnode.shapeFlag |= type;
  }

  let uid = 0;
  // 返回createApp函数
  function createAppAPI(render) {
      return function createApp(rootComponent, rootProps = null) {
          // 创建app上下文
          const context = createAppContext();
          // mounted标记
          let isMounted = false;
          const app = (context.app = {
              _uid: uid++,
              _component: rootComponent,
              _props: rootProps,
              _container: null,
              _context: context,
              mount(rootContainer) {
                  if (!isMounted) {
                      // 创建vnode
                      const vnode = createVNode(rootComponent, rootProps);
                      // 赋值vnode上下文
                      vnode.appContext = context;
                      // 渲染
                      render(vnode, rootContainer);
                      // 设置mounted标记
                      isMounted = true;
                      // 设置容器
                      app._container = rootContainer;
                      // 
                      rootContainer.__vue_app__ = app;
                      return vnode.component.proxy;
                  }
              }
          });
          return app;
      };
  }
  // 创建app上下文对象
  function createAppContext() {
      return {
          app: null,
          config: {
              isNativeTag: NO,
              performance: false,
              globalProperties: {},
              optionMergeStrategies: {},
              errorHandler: undefined,
              warnHandler: undefined,
              compilerOptions: {}
          },
          mixins: [],
          components: {},
          directives: {},
          provides: Object.create(null)
      };
  }

  function createRenderer(options) {
      return baseCreateRenderer();
  }
  function baseCreateRenderer(optons) {
      const render = (vnode, container) => {
          if (vnode == null) {
              if (container._vnode) ;
          }
          container._vnode = vnode;
      };
      return {
          render,
          createApp: createAppAPI(render)
      };
  }

  let renderer;
  function ensureRenderer() {
      return renderer || (renderer = createRenderer);
  }
  function createApp(...args) {
      const app = ensureRenderer().createApp(...args);
      const { mount } = app;
      app.mount = function (containerOrSelector) {
          const container = normalizeContainer(containerOrSelector);
          if (!container)
              return;
          // const component = app._component
          // clear content before mounting
          container.innerHTML = '';
          const proxy = mount(container, false);
          if (container instanceof Element) {
              container.removeAttribute('v-cloak');
              container.setAttribute('data-v-app', '');
          }
          return proxy;
      };
      return app;
  }
  function normalizeContainer(container) {
      if (isString(container)) {
          const res = document.querySelector(container);
          return res;
      }
      return container;
  }

  exports.createApp = createApp;
  exports.createRenderer = createRenderer;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
//# sourceMappingURL=vue.global.js.map
