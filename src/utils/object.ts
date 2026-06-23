export function isPlainObject<T>(value: T) {
    return Object.prototype.toString.call(value) === '[object Object]'
}
