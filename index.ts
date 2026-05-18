import { parseNumberF64 } from "./src/converters/number"

const str = "1123456789123456789123456789"
const bytes = new TextEncoder().encode(str)
console.log(Number(str), parseNumberF64(bytes, 0))
