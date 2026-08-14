export const enum Platform {
    BROWSER = 1,
    NODE = 2,
    BUN = 3,
    UNKNOWN
}

const BROWSER = Platform.BROWSER
const NODE = Platform.NODE
const BUN = Platform.BUN
const UNKNOWN = Platform.UNKNOWN

export const isBun = (platform: Platform): platform is Platform.BUN => platform === BUN
export const isNode = (platform: Platform): platform is Platform.NODE => platform === NODE
export const isBrowser = (platform: Platform): platform is Platform.BROWSER => platform === BROWSER
export const isUnknown = (platform: Platform): platform is Platform.UNKNOWN => platform === BROWSER

export const CURRENT_PLATFORM = detectPlatform()

export const IS_NODE = CURRENT_PLATFORM === NODE
export const IS_BUN = CURRENT_PLATFORM === BUN
export const IS_BROWSER = CURRENT_PLATFORM === BROWSER
export const IS_UNKNOWN = CURRENT_PLATFORM === UNKNOWN

export function detectPlatform(): Platform {
    if (typeof process !== 'undefined' && process.versions && process.versions.node)
        return NODE

    if (typeof window !== 'undefined' && typeof document !== 'undefined')
        return BROWSER

    if (typeof process !== 'undefined' && process.versions?.bun)
        return BUN

    return UNKNOWN
}
