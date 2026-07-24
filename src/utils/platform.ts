export const enum Platform {
    BROWSER = 1,
    NODE = 2,
    UNKNOWN = 3
}

const BROWSER = Platform.BROWSER
const NODE = Platform.NODE
const UNKNOWN = Platform.UNKNOWN

export const isNode = (platform: Platform): platform is Platform.NODE => platform === NODE
export const isBrowser = (platform: Platform): platform is Platform.BROWSER => platform === BROWSER
export const isUnknown = (platform: Platform): platform is Platform.UNKNOWN => platform === BROWSER

export const CURRENT_PLATFORM = detectPlatform()

export const IS_NODE = CURRENT_PLATFORM === NODE
export const IS_BROWSER = CURRENT_PLATFORM === BROWSER
export const IS_UNKNOWN = CURRENT_PLATFORM === UNKNOWN

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
