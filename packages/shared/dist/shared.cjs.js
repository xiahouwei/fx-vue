'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/*
 * 创建一个 map 并且返回一个 function,  function接受一个参数key, 用来检查是否存在于map中
 * 重要: 所有调用这个function必须是\/\*#\_\_PURE\_\_\*\/前缀
 * 作用是给rollup用来tree-shake, 即没用到则不需要打包
 */
function makeMap(str, expectsLowerCase) {
    const map = Object.create(null);
    const list = str.split(',');
    for (let i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val];
}

/**
 * dev only flag -> name mapping
 */
const PatchFlagNames = {
    [1 /* TEXT */]: `TEXT`,
    [2 /* CLASS */]: `CLASS`,
    [4 /* STYLE */]: `STYLE`,
    [8 /* PROPS */]: `PROPS`,
    [16 /* FULL_PROPS */]: `FULL_PROPS`,
    [32 /* HYDRATE_EVENTS */]: `HYDRATE_EVENTS`,
    [64 /* STABLE_FRAGMENT */]: `STABLE_FRAGMENT`,
    [128 /* KEYED_FRAGMENT */]: `KEYED_FRAGMENT`,
    [256 /* UNKEYED_FRAGMENT */]: `UNKEYED_FRAGMENT`,
    [512 /* NEED_PATCH */]: `NEED_PATCH`,
    [1024 /* DYNAMIC_SLOTS */]: `DYNAMIC_SLOTS`,
    [2048 /* DEV_ROOT_FRAGMENT */]: `DEV_ROOT_FRAGMENT`,
    [-1 /* HOISTED */]: `HOISTED`,
    [-2 /* BAIL */]: `BAIL`
};

// 空对象
const EMPTY_OBJ = Object.freeze({});
// 空数组
const EMPTY_ARR = Object.freeze([]);
// 空函数
const NOOP = () => { };
// 永远返回false
const NO = () => false;
// 匹配on
const onRE = /^on[^a-z]/;
const isOn = (key) => onRE.test(key);
// 匹配onUpdate
const isModelListener = (key) => key.startsWith('onUpdate:');
// 合并
const extend = Object.assign;
// 删除
const remove = (arr = [], el) => {
    const i = arr.indexOf(el);
    if (~i) {
        arr.splice(i, 1);
    }
};
// 判断非继承属性
const hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (val = {}, key) => hasOwnProperty.call(val, key);
// 判断是数组
const isArray = Array.isArray;
// 判断是map
const isMap = (val) => toTypeString(val) === '[object Map]';
// 判断是set
const isSet = (val) => toTypeString(val) === '[object Set]';
// 判断是日期对象
const isDate = (val) => val instanceof Date;
// 判断是function
const isFunction = (val) => typeof val === 'function';
// 判断是string
const isString = (val) => typeof val === 'string';
// 判断是symbol
const isSymbol = (val) => typeof val === 'symbol';
// 判断是Boolean
const isBoolean = (val) => typeof val === 'boolean';
// 判断是对象
const isObject = (val) => val !== null && typeof val === 'object';
// 判断是promise
const isPromise = (val) => {
    return isObject(val) && isFunction(val.then) && isFunction(val.catch);
};
const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);
// 通过toString获取原始类型
const toRawType = (value) => {
    // extract "RawType" from strings like "[object RawType]"
    return toTypeString(value).slice(8, -1);
};
// 判断是否为一个纯粹对象
const isPlainObject = (val) => toTypeString(val) === '[object Object]';
// 判断是否为字符串类型的正整数, 常用于key
const isIntegerKey = (key) => isString(key) && key !== 'NaN' && key[0] !== '-' && '' + parseInt(key, 10) === key;
// 是否为vue关键字
const isReservedProp = /*#__PURE__*/ makeMap(
// 前导逗号是有意为之的，因此空字符串""也包含在内  
',key,ref,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted');
// 缓存String - function
const cacheStringFunction = (fn) => {
    const cache = Object.create(null);
    return ((str) => {
        const hit = cache[str];
        return hit || (cache[str] = fn(str));
    });
};
// 烤肉串 => 驼峰
const camelizeRE = /-(\w)/g;
const camelize = cacheStringFunction((str) => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
});
// 驼峰 => 烤肉串
const hyphenateRE = /\B([A-Z])/g;
const hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, '-$1').toLowerCase());
// 转大写
const capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
// 转on命名
const toHandlerKey = cacheStringFunction((str) => (str ? `on${capitalize(str)}` : ``));
// 判断是否发生变化
const hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);
// 循环调用函数
const invokeArrayFns = (fns, arg) => {
    for (let i = 0; i < fns.length; i++) {
        fns[i](arg);
    }
};
// defineProperty
const def = (obj, key, value) => {
    Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: false,
        value
    });
};
// 转nuber
const toNumber = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? val : n;
};
// 获取全局对象
let _globalThis;
const getGlobalThis = () => {
    return (_globalThis ||
        (_globalThis =
            typeof globalThis !== 'undefined'
                ? globalThis
                : typeof self !== 'undefined'
                    ? self
                    : typeof window !== 'undefined'
                        ? window
                        : typeof global !== 'undefined'
                            ? global
                            : {}));
};

exports.EMPTY_ARR = EMPTY_ARR;
exports.EMPTY_OBJ = EMPTY_OBJ;
exports.NO = NO;
exports.NOOP = NOOP;
exports.PatchFlagNames = PatchFlagNames;
exports.camelize = camelize;
exports.capitalize = capitalize;
exports.def = def;
exports.extend = extend;
exports.getGlobalThis = getGlobalThis;
exports.hasChanged = hasChanged;
exports.hasOwn = hasOwn;
exports.hyphenate = hyphenate;
exports.invokeArrayFns = invokeArrayFns;
exports.isArray = isArray;
exports.isBoolean = isBoolean;
exports.isDate = isDate;
exports.isFunction = isFunction;
exports.isIntegerKey = isIntegerKey;
exports.isMap = isMap;
exports.isModelListener = isModelListener;
exports.isObject = isObject;
exports.isOn = isOn;
exports.isPlainObject = isPlainObject;
exports.isPromise = isPromise;
exports.isReservedProp = isReservedProp;
exports.isSet = isSet;
exports.isString = isString;
exports.isSymbol = isSymbol;
exports.makeMap = makeMap;
exports.objectToString = objectToString;
exports.remove = remove;
exports.toHandlerKey = toHandlerKey;
exports.toNumber = toNumber;
exports.toRawType = toRawType;
exports.toTypeString = toTypeString;
//# sourceMappingURL=shared.cjs.js.map
