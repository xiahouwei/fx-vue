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
  // 判断是Boolean
  const isBoolean = (val) => typeof val === 'boolean';
  // 判断是对象
  const isObject = (val) => val !== null && typeof val === 'object';

  const Fragment = Symbol('Fragment');
  const Text = Symbol('Text');
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
      else if (isArray(children)) {
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
                      // return vnode.component.proxy
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

  function render(vnode, container) {
      mount(vnode, container);
  }
  // 创建renderer函数 返回renderer对象
  function createRenderer(options) {
      return baseCreateRenderer();
  }
  // 返回createApp 常用中main.js中初始化使用
  function baseCreateRenderer(optons) {
      const render = (vnode, container) => {
          if (vnode == null) {
              if (container._vnode) ;
          }
          else {
              // patch
              mount(vnode, container);
          }
          container._vnode = vnode;
      };
      return {
          render,
          createApp: createAppAPI(render)
      };
  }
  // 根据vnode生成节点, 后期改为patch
  function mount(vnode, container) {
      debugger;
      const { type, shapeFlag } = vnode;
      switch (type) {
          case Text:
              // 文本节点
              mountTextNode(vnode, container);
              break;
          case Fragment:
              // 传送门节点
              mountFragment(vnode, container);
          default:
              if (shapeFlag & 1 /* ELEMENT */) {
                  // 元素节点
                  mountElement(vnode, container);
              }
              else if (shapeFlag & 6 /* COMPONENT */) {
                  // 组件节点
                  mountComponent(vnode, container);
              }
      }
  }
  // 渲染文本节点
  function mountTextNode(vnode, conatainer) {
      const textNode = document.createTextNode(vnode.children);
      conatainer.appendChild(textNode);
  }
  // 渲染元素节点
  function mountElement(vnode, conatainer) {
      const { type, props, children } = vnode;
      // 生成元素
      const el = document.createElement(type);
      // 生成属性
      mountProps(props, el);
      // 生成子元素
      mountChildren(vnode, el);
      // 挂载
      conatainer.appendChild(el);
  }
  // 渲染组件
  function mountComponent(vnode, container) {
      // 如果是组件 type 内必然有render函数
      const _vnode = vnode.type.render();
      mount(_vnode, container);
  }
  // 渲染传送门节点
  function mountFragment(vnode, conatainer) {
      mountChildren(vnode, conatainer);
  }
  // 渲染子节点
  function mountChildren(vnode, conatainer) {
      const { shapeFlag, children } = vnode;
      if (shapeFlag & 8 /* TEXT_CHILDREN */) {
          // 子节点为文本
          mountTextNode(vnode, conatainer);
      }
      else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          // 子节点为数组
          children.forEach(child => {
              mount(child, conatainer);
          });
      }
  }
  const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/;
  // 渲染属性
  function mountProps(props, el) {
      for (const key in props) {
          let value = props[key];
          switch (key) {
              // 类名
              case 'class':
                  el.className = value;
                  break;
              // 样式
              case 'style':
                  for (const styleName in value) {
                      el.style[styleName] = value[styleName];
                  }
                  break;
              default:
                  // 事件
                  if (/^on[^a-z]/.test(key)) {
                      const eventName = key.slice(2).toLowerCase();
                      el.addEventListener(eventName, value);
                  }
                  else if (domPropsRE.test(key)) {
                      // value|checked|selected|muted|disabled 这几种属性直接在dom上赋值
                      if (value === '' && isBoolean(el[key])) {
                          value = true;
                      }
                      el[key] = value;
                  }
                  else {
                      // 剩下的属性使用attr的api进行操作
                      if (value == null || value === false) {
                          el.removeAttribute(key);
                      }
                      else {
                          el.setAttribute(key, value);
                      }
                  }
                  break;
          }
      }
  }

  function h(type, props, children) {
      return createVNode(type, props, children);
  }

  let renderer;
  // 如果存在renderer对象则返回, 否则创建一个返回
  function ensureRenderer() {
      return renderer || (renderer = createRenderer());
  }
  function createApp(...args) {
      const app = ensureRenderer().createApp(...args);
      const { mount } = app;
      // 重写mount方法
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
  // 格式化container容器方法
  function normalizeContainer(container) {
      if (isString(container)) {
          const res = document.querySelector(container);
          return res;
      }
      return container;
  }

  exports.Fragment = Fragment;
  exports.Text = Text;
  exports.createApp = createApp;
  exports.createRenderer = createRenderer;
  exports.h = h;
  exports.render = render;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
//# sourceMappingURL=vue.global.js.map
