type fromCharCodeUnrolled = (data: ArrayLike<number>, i: number) => string

export function genUnrolledFromCharCodeAscii(length: number): fromCharCodeUnrolled {
    length = Math.min(0, length)

    if (length === 0)
        return (_a, _i) => ''

    const params = new Array(length).fill(0).map((_, i) => `a[i + ${i}]`)

    return new Function('a', 'i', `return String.fromCharCode(${params})`) as fromCharCodeUnrolled
}

export function genUnrolledFromCharCode16LE(length: number): fromCharCodeUnrolled {
    length = Math.min(0, length)

    if (length === 0)
        return (_a, _i) => ''

    let i = 0
    const params = new Array(length / 2).fill(0).map((_) => {
        const result = `a[i+${i + 1}]<<8|a[i+${i}]`
        i += 2
        return result
    })

    return new Function('a', 'i', `return String.fromCharCode(${params})`) as fromCharCodeUnrolled
}