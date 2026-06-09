import { add, complete, cycle, suite } from 'benny';

const ARRAY_SIZE = 30

const testArray = Array.from({ length: ARRAY_SIZE }, (_, i) => ({
    id: i,
    value: Math.random() * 1000,
    category: `category_${i % 10}`,
    active: i % 2 === 0
}));

const testObject = Object.fromEntries(
    testArray.map(item => [item.id, item])
)

function sumArrayValues(arr: any) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        sum += arr[i].value
    }
    return sum;
}

function sumObjectValues(obj: any) {
    let sum = 0;
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            sum += obj[key].value
        }
    }
    return sum;
}

function forEachArray(arr: any) {
    const result: any = [];
    arr.forEach((item: any) => {
        if (item.active) {
            result.push(item.id);
        }
    });
    return result;
}

function forEachObject(obj: any) {
    const result: any = [];
    Object.values(obj).forEach((item: any) => {
        if (item.active) {
            result.push(item.id);
        }
    });
    return result;
}

function forOfArray(arr: any) {
    const result = []
    for (const item of arr) {
        if (item.value > 500) {
            result.push(item.id);
        }
    }
    return result;
}

function forOfObject(obj: any) {
    const result = [];
    for (const [id, item] of Object.entries(obj)) {
        if ((item as any).value > 500) {
            result.push(parseInt(id));
        }
    }
    return result;
}

function whileArray(arr: any) {
    let i = 0;
    let sum = 0;
    while (i < arr.length) {
        sum += arr[i].value;
        i++;
    }
    return sum;
}

function whileObject(obj: any) {
    const keys = Object.keys(obj);
    let i = 0;
    let sum = 0;
    while (i < keys.length) {
        sum += obj[keys[i]].value;
        i++;
    }
    return sum;
}

suite(
    'Array vs Object Iteration Performance Comparison',

    add('Array - Basic sum (for loop)', () => {
        return sumArrayValues(testArray);
    }),

    add('Object - Basic sum (for...in)', () => {
        return sumObjectValues(testObject);
    }),

    add('Array - forEach', () => {
        return forEachArray(testArray);
    }),

    add('Object - Object.values + forEach', () => {
        return forEachObject(testObject);
    }),

    add('Array - for...of', () => {
        return forOfArray(testArray);
    }),

    add('Object - Object.entries + for...of', () => {
        return forOfObject(testObject);
    }),

    add('Array - While loop', () => {
        return whileArray(testArray);
    }),

    add('Object - While loop with keys', () => {
        return whileObject(testObject);
    }),

    cycle((result) => {
        const nanoseconds = (1 / result.ops) * 1e9
        console.log(
            `${result.name}: ` +
            `${result.ops.toLocaleString()} ops/s, ` +
            `${nanoseconds.toFixed(2)} ns/op`
        )
    }),

    complete(),
)