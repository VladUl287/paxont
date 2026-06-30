export function getMaxBytesCount(charsCount: number): number {
    const maxBytesPerChar = 3
    return (charsCount * maxBytesPerChar) + maxBytesPerChar
}