import { makeMap } from './makeMap'
export { makeMap }


// 空对象
export const EMPTY_OBJ = Object.freeze({})

// 空数组
export const EMPTY_ARR = Object.freeze([])

// 空函数
export const NOOP = () => {}

// 永远返回false
export const NO = () => false

// 匹配on
const onRE = /^on[^a-z]/
export const isOn = (key: string) => onRE.test(key)

// 匹配onUpdate
export const isModelListener = (key: string) => key.startsWith('onUpdate:')

// 合并
export const extend = Object.assign

// 删除
export const remove = (arr = [], el) => {
    const i = arr.indexOf(el)
    if (~i) {
        arr.splice(i, 1)
    }
}
// 判断非继承属性
const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (val = {},key: string | symbol): key is keyof typeof val => hasOwnProperty.call(val, key)

// 判断是数组
export const isArray = Array.isArray

// 判断是map
export const isMap = (val: unknown): val is Map<any, any> => toTypeString(val) === '[object Map]'

// 判断是set
export const isSet = (val: unknown): val is Set<any> => toTypeString(val) === '[object Set]'

// 判断是日期对象
export const isDate = (val: unknown): val is Date => val instanceof Date

// 判断是function
export const isFunction = (val: unknown): val is Function => typeof val === 'function'

// 判断是string
export const isString = (val: unknown): val is string => typeof val === 'string'

// 判断是symbol
export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'

// 判断是对象
export const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object'

// 判断是promise
export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
    return isObject(val) && isFunction(val.then) && isFunction(val.catch)
}

export const objectToString = Object.prototype.toString

export const toTypeString = (value: unknown): string => objectToString.call(value)

// 通过toString获取原始类型
export const toRawType = (value: unknown): string => {
    // extract "RawType" from strings like "[object RawType]"
    return toTypeString(value).slice(8, -1)
}

// 判断是否为一个纯粹对象
export const isPlainObject = (val: unknown): val is object =>
  toTypeString(val) === '[object Object]'

// 判断是否为字符串类型的正整数, 常用于key
export const isIntegerKey = (key: unknown) => isString(key) && key !== 'NaN' && key[0] !== '-' && '' + parseInt(key, 10) === key

// 是否为vue关键字
export const isReservedProp = /*#__PURE__*/ makeMap(
    // 前导逗号是有意为之的，因此空字符串""也包含在内  
    ',key,ref,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted'
)

// 缓存String - function
const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
    const cache: Record<string, string> = Object.create(null)
    return ((str: string) => {
        const hit = cache[str]
        return hit || (cache[str] = fn(str))
    }) as any
}

// 驼峰
const camelizeRE = /-(\w)/g
/**
 * @private
 */
export const camelize = cacheStringFunction(
    (str: string): string => {
        return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
    }
)

// 判断是否发生变化
export const hasChanged = (value, oldValue) =>  value !== oldValue && (value === value || oldValue === oldValue)