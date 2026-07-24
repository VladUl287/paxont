export const enum Platform {
    BROWSER = 1,
    NODE = 2,
    UNKNOWN = 3
}

const BROWSER = Platform.BROWSER
const NODE = Platform.NODE
const UNKNOWN = Platform.UNKNOWN

export const isNode = (platform: Platform) => platform === NODE
export const isBrowser = (platform: Platform) => platform === BROWSER

export const IS_NODE = detectPlatform() === NODE
export const IS_BROWSER = detectPlatform() === BROWSER

export function detectPlatform(): Platform {
    if (typeof process !== 'undefined' &&
        process.versions &&
        process.versions.node) {
        return NODE
    }

    if (typeof window !== 'undefined' &&
        typeof document !== 'undefined') {
        return BROWSER
    }

    return UNKNOWN
}
