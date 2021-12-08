// 节点类型枚举
export const enum NodeTypes {
    ROOT,   // 根
    ELEMENT, // 元素
    TEXT,  // 文本
    SIMPLE_EXPRESSION, // 简单表达式
    INTERPOLATION, // 差值
    ATTRIBUTE, // 属性
    DIRECTIVE // 指令
}

// 标签类型枚举
export const enum ElementTypes {
    ELEMENT,
    COMPONENT
}

export function createRoot (children) {
    return {
        type: NodeTypes.ROOT,
        children
    }
}