// components组件类型
export const enum ShapeFlags {
  // element 最普通的元素
  ELEMENT = 1, // 00000001
  FUNCTIONAL_COMPONENT = 1 << 1,          // 0000000010
  // 组件类型
  STATEFUL_COMPONENT = 1 << 2,            // 0000000100
  // vnode 的 children 为 string 类型
  TEXT_CHILDREN = 1 << 3,                 // 0000001000
  // vnode 的 children 为数组类型
  ARRAY_CHILDREN = 1 << 4,                // 0000010000
  // vnode 的 children 为 slots 类型
  SLOTS_CHILDREN = 1 << 5,                // 0000100000
  TELEPORT = 1 << 6,                      // 0001000000
  SUSPENSE = 1 << 7,                      // 0010000000
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,   // 0100000000
  COMPONENT_KEPT_ALIVE = 1 << 9,          // 1000000000
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT // 0000000110
}
