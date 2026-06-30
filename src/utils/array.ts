export function createFactory<T extends ArrayLike<any>>(ctor: new (length: number) => T) {
    let array: T | null = null
    return (length: number) => {
        if (array && array.length >= length)
            return array
        
        array = new ctor(length)
        return array
    }
}