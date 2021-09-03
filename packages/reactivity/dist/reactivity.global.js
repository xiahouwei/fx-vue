var VueReactivity = (function (exports) {
  'use strict';

  // 空对象
  Object.freeze({});
  // 空数组
  Object.freeze([]);
  // 空函数
  const NOOP = () => { };
  // 合并
  const extend = Object.assign;
  // 判断非继承属性
  const hasOwnProperty = Object.prototype.hasOwnProperty;
  const hasOwn = (val = {}, key) => hasOwnProperty.call(val, key);
  // 判断是数组
  const isArray = Array.isArray;
  // 判断是function
  const isFunction = (val) => typeof val === 'function';
  // 判断是string
  const isString = (val) => typeof val === 'string';
  // 判断是对象
  const isObject = (val) => val !== null && typeof val === 'object';
  // 判断是否为字符串类型的正整数, 常用于key
  const isIntegerKey = (key) => isString(key) && key !== 'NaN' && key[0] !== '-' && '' + parseInt(key, 10) === key;
  // 判断是否发生变化
  const hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);

  const effectStack = [];
  let activeEffect;
  // 副作用函数
  function effect(fn, options = {}) {
      // 创建effect, 依赖收集
      const effect = creatReactiveEffect(fn, options);
      if (!options.lazy) {
          effect();
      }
      return effect;
  }
  // effct依赖收集
  let uid = 0;
  function creatReactiveEffect(fn, options) {
      const effect = function () {
          if (!effectStack.includes(effect)) {
              cleanup(effect);
              // 通过入栈, 出栈保证手机effect是正确的, 避免嵌套effect情况下收集错误
              try {
                  effectStack.push(effect);
                  activeEffect = effect;
                  return fn(); // 执行函数, 通过取值, 触发get
              }
              finally {
                  effectStack.pop();
                  activeEffect = effectStack[effectStack.length - 1];
              }
          }
      };
      // 唯一标识
      effect.id = uid++;
      // 是否允许递归调用 默认false
      effect.allowRecurse = !!options.allowRecurse;
      // 响应式effect标识
      effect._isEffect = true;
      // effect是否激活 调用stop后, 设置为false
      effect.active = true;
      // 保存原始函数
      effect.raw = fn;
      // 持有当前effect的dep数组
      effect.deps = [];
      // 保存用户属性
      effect.options = options;
      return effect;
  }
  // 清除
  function cleanup(effect) {
      const { deps } = effect;
      if (deps.length) {
          for (let i = 0; i < deps.length; i++) {
              deps[i].delete(effect);
          }
          deps.length = 0;
      }
  }
  // 依赖收集, 让某个对象的属性, 收集它对应的effect
  const targetMap = new WeakMap();
  function track(target, type, key) {
      if (activeEffect === undefined) {
          return;
      }
      // 通过target获取它对应的dep
      let depsMap = targetMap.get(target);
      if (!depsMap) {
          targetMap.set(target, (depsMap = new Map));
      }
      // 通过key收集它对应的dep, dep内就是effect
      let dep = depsMap.get(key);
      if (!dep) {
          depsMap.set(key, (dep = new Set()));
      }
      // 这里就是真正收集依赖了
      if (!dep.has(activeEffect)) {
          dep.add(activeEffect);
          // 这里的收集用作clean之用,  deps是array,里面每个元素是dep dep是set, 里面每个元素是effect
          // 这样清除的时候, 就可以循环deps,然后再把dep里面对应的effect清除掉
          activeEffect.deps.push(dep);
      }
  }
  // 触发更新 执行属性对应的effect
  function trigger(target, type, key, newValue, oldValue, oldTarget) {
      // 如果触发的属性没有收集过effect, 则忽略
      const depsMap = targetMap.get(target);
      if (!depsMap) {
          return;
      }
      // 通过set去重, 就不会重复执行了 这里是针对effect回调内的多次取值
      const effects = new Set();
      const add = (effectsAdd) => {
          if (effectsAdd) {
              // 避免死循环
              effectsAdd.forEach(effect => {
                  if (effect !== activeEffect || effect.allowRecurse) {
                      effects.add(effect);
                  }
              });
          }
      };
      // 将所有需要执行的effect收集到一起, 然后一起执行
      // 1.如果修改的属性是length, 且target为数组, 则是对数组length进行改变
      if (key === 'length' && isArray(target)) {
          depsMap.forEach((dep, key) => {
              // 如果直接改的数组长度, 或者之前收集的key比改动之后的大或者相等(说明会造成变动, 否则是不会发生变化的)
              // 注意这里使用length的值和下标对比
              if (key === 'length' || key >= newValue) {
                  add(dep);
              }
          });
      }
      else {
          // 如果存在key 就是修改
          if (key !== undefined) {
              add(depsMap.get(key));
          }
          switch (type) {
              // 新增
              case "add" /* ADD */:
                  // 如果添加数组的下标, 就触发length的更新
                  if (isArray(target) && isIntegerKey(key)) {
                      add(depsMap.get('length'));
                  }
                  break;
          }
      }
      const run = function (effect) {
          // 如果存在scheduler调度函数, 则执行调度函数, 调度函数内部可能实行effect, 也可能不执行
          if (effect.options.scheduler) {
              effect.options.scheduler(effect);
          }
          else {
              // 否则直接执行effect
              effect();
          }
      };
      // 一起执行
      effects.forEach(run);
  }

  // 创建get
  const get = createGetter();
  const shallowGet = createGetter(false, true);
  const readonlyGet = createGetter(true);
  const shallowReadonlyGet = createGetter(true, true);
  // 生成Getter
  function createGetter(isReadonly = false, shallow = false) {
      return function get(target, key, receiver) {
          const res = Reflect.get(target, key, receiver);
          if (!isReadonly) {
              // 收集依赖, 数据变化后更新视图
              track(target, "get" /* GET */, key);
          }
          if (shallow) {
              // 浅拦截不需要递归
              return res;
          }
          if (isObject(res)) {
              // 如果是深拦截且是对象 则递归
              return isReadonly ? readonly(res) : reactive(res);
          }
          return res;
      };
  }
  // 创建set
  const set = createSetter();
  const shallowSet = createSetter(true);
  // 生成Setter
  function createSetter(shallow = false) {
      return function set(target, key, value, receiver) {
          // 获取以前的值
          const oldValue = target[key];
          // 1.如果是数组,且改变的是下标, 通过判断key 和 数组lenth比 就可以知道是否存在
          // 2.否则就是对象, 就判断是否是自身的属性
          const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
          const result = Reflect.set(target, key, value, receiver);
          // 区分新增还是修改
          if (!hadKey) {
              // 没有key就是新增, 
              trigger(target, "add" /* ADD */, key, value);
          }
          else if (hasChanged(oldValue, value)) {
              // 有key就是修改
              trigger(target, "set" /* SET */, key, value);
          }
          // 数据更新时, 通知对应的属性执行effect
          return result;
      };
  }
  // 对应reactive的handler参数
  const mutableHandlers = {
      get,
      set
  };
  // 对应readonly的handler参数
  const readonlyHandlers = {
      get: readonlyGet,
      set: (target, key) => {
          console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
          return true;
      },
      deleteProperty: (target, key) => {
          console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
          return true;
      }
  };
  // 对应shallowReactive的handler参数
  const shallowReactiveHandlers = extend({}, mutableHandlers, {
      get: shallowGet,
      set: shallowSet
  });
  // 对应shallowReadonly的handler参数
  const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
      get: shallowReadonlyGet
  });

  // 自动垃圾回收
  const reactiveMap = new WeakMap();
  const readonlyMap = new WeakMap();
  // new Proxy() 拦截数据的get和set
  function createReactiveObject(target, isReadonly, baseHandlers) {
      // reactive只能拦截object
      if (!isObject(target)) {
          return target;
      }
      // 如果存在缓存,直接返回proxy实例
      const proxyMap = isReadonly ? readonlyMap : reactiveMap;
      const exisitProxy = proxyMap.get(target);
      if (exisitProxy) {
          return exisitProxy;
      }
      // 创建proxy实例, 进行拦截
      const proxy = new Proxy(target, baseHandlers);
      // 缓存
      proxyMap.set(target, proxy);
      return proxy;
  }
  function reactive(target) {
      return createReactiveObject(target, false, mutableHandlers);
  }
  function shallowReactive(target) {
      return createReactiveObject(target, false, shallowReactiveHandlers);
  }
  function readonly(target) {
      return createReactiveObject(target, true, readonlyHandlers);
  }
  function shallowReadonly(target) {
      return createReactiveObject(target, true, shallowReadonlyHandlers);
  }

  function ref(value) {
      return createRef(value);
  }
  function shallowRef(value) {
      return createRef(value, true);
  }
  const convert = (value) => isObject(value) ? reactive(value) : value;
  // ref类
  class RefImpl {
      _rawValue;
      _shallow;
      _value;
      __v_isRef = true;
      constructor(_rawValue, _shallow = false) {
          this._rawValue = _rawValue;
          this._shallow = _shallow;
          // 如果是浅的, 做一次代理就可以, 但是如果是深度的, 要进行深度代理了, 这里就可以用reactive了
          this._value = _shallow ? _rawValue : convert(_rawValue);
      }
      // ref类的属性访问器
      get value() {
          track(this, "get" /* GET */, 'value');
          return this._value;
      }
      // 通过代理 在实现触发依赖
      set value(newVal) {
          // 如果发生了改变
          if (hasChanged(newVal, this._rawValue)) {
              // 进行赋值
              this._rawValue = newVal;
              this._value = newVal;
              trigger(this, "set" /* SET */, 'value', newVal);
          }
      }
  }
  function createRef(rawValue, shallow = false) {
      return new RefImpl(rawValue, shallow);
  }
  // toRef实现类
  class ObjectRefImpl {
      _object;
      _key;
      __v_isRef = true;
      constructor(_object, _key) {
          this._object = _object;
          this._key = _key;
      }
      get value() {
          // 代理, 外界通过访问value, 代理到原始object对应的属性, 这样不就等于触发了原始object的依赖收集, 注意原对象必须是响应式的
          return this._object[this._key];
      }
      set value(newVal) {
          // 外界改变value, 同样去改变原始object的属性, 这样就触发了依赖
          this._object[this._key] = newVal;
      }
  }
  // 用来把一个响应式对象的的某个 key 值转换成 ref
  /*
   *  const obj = reactive({ foo: 1 }) // obj 是响应式数据
   *  const obj2 = { foo: obj.foo }*
   *  effect(() => {
   *      console.log(obj2.foo) // 这里读取 obj2.foo
   *  })
   *  obj.foo = 2  // 设置 obj.foo 显然无效
   */
  function toRef(object, key) {
      return new ObjectRefImpl(object, key);
  }
  function toRefs(object, key) {
      // object 可能是数组或者对象
      const ret = isArray(object) ? new Array(object.length) : {};
      for (let key in object) {
          ret[key] = toRef(object, key);
      }
      return ret;
  }

  // computed初始化类
  class ComputedRefImpl {
      _setter;
      // 用于存储getter返回的值
      _value;
      // dirty标识, 用于实现惰性, 默认为true, 第一次就执行getter方法
      _dirty = true;
      // 用于存贮effect化的getter
      effect;
      // ref标识
      __v_isRef = true;
      // 只读标识
      ["__v_isReadonly" /* IS_READONLY */];
      constructor(getter, _setter, isReadonly) {
          this._setter = _setter;
          // 把getter进行effct化, effct执行,就会触发依赖收集
          this.effect = effect(getter, {
              // 不立即执行
              lazy: true,
              // 当属性依赖的值发生变化, 就会执行scheduler, 同时设置dirty状态
              scheduler: () => {
                  if (!this._dirty) {
                      this._dirty = true;
                      // 触发computed的value属性
                      trigger(this, "set" /* SET */, 'value');
                  }
              }
          });
          // 设置只读标记
          this["__v_isReadonly" /* IS_READONLY */] = isReadonly;
      }
      // 通过代理value, 来对computed进行依赖收集
      get value() {
          // 如果是dirty的, 就执行getter, 然后改变dirty状态, 就实现了computed的惰性特征
          if (this._dirty) {
              // 这里_effect就是返回的getter,执行getter, 把gtter返回的结果赋值给value
              this._value = this.effect();
              this._dirty = false;
              // 收集computed的value属性
              track(computed, "get" /* GET */, 'value');
          }
          return this._value;
      }
      // 如果对compouted进行set, 则触发设置的setter函数
      set value(newValue) {
          this._setter(newValue);
      }
  }
  // computed计算属性
  function computed(getterOrOptions) {
      let getter;
      let setter;
      // getterOrOptions参数可能是funciton 或者 对象, 根据传入参数的不同, 设置getter ,setter
      if (isFunction(getterOrOptions)) {
          getter = getterOrOptions;
          setter = NOOP;
      }
      else {
          getter = getterOrOptions.get;
          setter = getterOrOptions.set;
      }
      // 返回computed实例, 如果getter是个function, 或者没有传入setter 那么就是只读的
      return new ComputedRefImpl(getter, setter, isFunction(getterOrOptions) || !getterOrOptions.set);
  }

  exports.computed = computed;
  exports.effect = effect;
  exports.reactive = reactive;
  exports.readonly = readonly;
  exports.ref = ref;
  exports.shallowReactive = shallowReactive;
  exports.shallowReadonly = shallowReadonly;
  exports.shallowRef = shallowRef;
  exports.toRef = toRef;
  exports.toRefs = toRefs;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
//# sourceMappingURL=reactivity.global.js.map
