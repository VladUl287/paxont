export const IS_NODE = typeof process === 'object' && process !== null && process.versions?.node !== null
export const IS_BROWSER = !IS_NODE