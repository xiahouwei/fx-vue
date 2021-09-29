// components组件类型
export const enum ShapeFlags {
  // element 最普通的元素
  ELEMENT = 1, // 00000001
  // 函数组件
  FUNCTIONAL_COMPONENT = 1 << 1,          // 0000000010
  // 状态的组件 即 非函数组件
  STATEFUL_COMPONENT = 1 << 2,            // 0000000100
  // vnode 的 children 为 string 类型
  TEXT_CHILDREN = 1 << 3,                 // 0000001000
  // vnode 的 children 为数组类型
  ARRAY_CHILDREN = 1 << 4,                // 0000010000
  // vnode 的 children 为 slots 类型
  SLOTS_CHILDREN = 1 << 5,                // 0000100000
  // 传送门类型
  TELEPORT = 1 << 6,                      // 0001000000
  // 异步组件
  SUSPENSE = 1 << 7,                      // 0010000000
  // 需要被keep-alive的组件
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,   // 0100000000
  // 已经被keep-alive的组件
  COMPONENT_KEPT_ALIVE = 1 << 9,          // 1000000000
  // 组件(状态组件和函数组件)
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT // 0000000110
}
