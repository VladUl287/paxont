export function genUnrolledFromCharCode(length: number): (data: ArrayLike<number>, i: number) => string {
    return new Function('a', 'i', `return String.fromCharCode(${new Array(length).fill(0).map((_, i) => `a[i + ${i}]`)})`) as any
}