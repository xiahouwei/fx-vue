export const enum NodeTypes {
    ROOT,
    ELEMENT,
    TEXT,
    SIMPLE_EXPRESSION,
    INTERPOLATION,
    ATTRIBUTE,
    DIRECTIVE
}

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