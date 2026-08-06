type FromCharCodeUnrolled = (data: ArrayLike<number>, i: number) => string

export function genUnrolledFromCharCode(length: number): (data: ArrayLike<number>, i: number) => string {
    return new Function('a', 'i', `return String.fromCharCode(${new Array(length).fill(0).map((_, i) => `a[i + ${i}]`)})`) as any
}

export function genUnrolledFromCharCode16(length: number): FromCharCodeUnrolled {
    let i = 0
    const params = new Array(length / 2).fill(0).map((_) => {
        const result = `a[i+${i + 1}]<<8|a[i+${i}]`
        i += 2
        return result
    })
    return new Function('a', 'i', `return String.fromCharCode(${params})`) as FromCharCodeUnrolled
}