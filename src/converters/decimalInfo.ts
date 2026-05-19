export default class DecimalInfo {
    num_digits
    decimal_point
    negative
    truncated
    digits

    constructor() {
        this.num_digits = 0
        this.decimal_point = 0
        this.negative = false
        this.truncated = false
        this.digits = new Array(CalculationConstants.max_digits).fill(0)
    }

    public static readonly numberOfDigitsDecimalLeftShiftTable: number[] = [
        0x0000, 0x0800, 0x0801, 0x0803, 0x1006, 0x1009, 0x100D, 0x1812, 0x1817,
        0x181D, 0x2024, 0x202B, 0x2033, 0x203C, 0x2846, 0x2850, 0x285B, 0x3067,
        0x3073, 0x3080, 0x388E, 0x389C, 0x38AB, 0x38BB, 0x40CC, 0x40DD, 0x40EF,
        0x4902, 0x4915, 0x4929, 0x513E, 0x5153, 0x5169, 0x5180, 0x5998, 0x59B0,
        0x59C9, 0x61E3, 0x61FD, 0x6218, 0x6A34, 0x6A50, 0x6A6D, 0x6A8B, 0x72AA,
        0x72C9, 0x72E9, 0x7B0A, 0x7B2B, 0x7B4D, 0x8370, 0x8393, 0x83B7, 0x83DC,
        0x8C02, 0x8C28, 0x8C4F, 0x9477, 0x949F, 0x94C8, 0x9CF2, 0x051C, 0x051C,
        0x051C, 0x051C
    ]

    public static readonly powersOf5Table: number[] = [
        5, 2, 5, 1, 2, 5, 6, 2, 5, 3, 1, 2, 5, 1, 5, 6, 2, 5, 7, 8, 1, 2, 5, 3,
        9, 0, 6, 2, 5, 1, 9, 5, 3, 1, 2, 5, 9, 7, 6, 5, 6, 2, 5, 4, 8, 8, 2, 8,
        1, 2, 5, 2, 4, 4, 1, 4, 0, 6, 2, 5, 1, 2, 2, 0, 7, 0, 3, 1, 2, 5, 6, 1,
        0, 3, 5, 1, 5, 6, 2, 5, 3, 0, 5, 1, 7, 5, 7, 8, 1, 2, 5, 1, 5, 2, 5, 8,
        7, 8, 9, 0, 6, 2, 5, 7, 6, 2, 9, 3, 9, 4, 5, 3, 1, 2, 5, 3, 8, 1, 4, 6,
        9, 7, 2, 6, 5, 6, 2, 5, 1, 9, 0, 7, 3, 4, 8, 6, 3, 2, 8, 1, 2, 5, 9, 5,
        3, 6, 7, 4, 3, 1, 6, 4, 0, 6, 2, 5, 4, 7, 6, 8, 3, 7, 1, 5, 8, 2, 0, 3,
        1, 2, 5, 2, 3, 8, 4, 1, 8, 5, 7, 9, 1, 0, 1, 5, 6, 2, 5, 1, 1, 9, 2, 0,
        9, 2, 8, 9, 5, 5, 0, 7, 8, 1, 2, 5, 5, 9, 6, 0, 4, 6, 4, 4, 7, 7, 5, 3,
        9, 0, 6, 2, 5, 2, 9, 8, 0, 2, 3, 2, 2, 3, 8, 7, 6, 9, 5, 3, 1, 2, 5, 1,
        4, 9, 0, 1, 1, 6, 1, 1, 9, 3, 8, 4, 7, 6, 5, 6, 2, 5, 7, 4, 5, 0, 5, 8,
        0, 5, 9, 6, 9, 2, 3, 8, 2, 8, 1, 2, 5, 3, 7, 2, 5, 2, 9, 0, 2, 9, 8, 4,
        6, 1, 9, 1, 4, 0, 6, 2, 5, 1, 8, 6, 2, 6, 4, 5, 1, 4, 9, 2, 3, 0, 9, 5,
        7, 0, 3, 1, 2, 5, 9, 3, 1, 3, 2, 2, 5, 7, 4, 6, 1, 5, 4, 7, 8, 5, 1, 5,
        6, 2, 5, 4, 6, 5, 6, 6, 1, 2, 8, 7, 3, 0, 7, 7, 3, 9, 2, 5, 7, 8, 1, 2,
        5, 2, 3, 2, 8, 3, 0, 6, 4, 3, 6, 5, 3, 8, 6, 9, 6, 2, 8, 9, 0, 6, 2, 5,
        1, 1, 6, 4, 1, 5, 3, 2, 1, 8, 2, 6, 9, 3, 4, 8, 1, 4, 4, 5, 3, 1, 2, 5,
        5, 8, 2, 0, 7, 6, 6, 0, 9, 1, 3, 4, 6, 7, 4, 0, 7, 2, 2, 6, 5, 6, 2, 5,
        2, 9, 1, 0, 3, 8, 3, 0, 4, 5, 6, 7, 3, 3, 7, 0, 3, 6, 1, 3, 2, 8, 1, 2,
        5, 1, 4, 5, 5, 1, 9, 1, 5, 2, 2, 8, 3, 6, 6, 8, 5, 1, 8, 0, 6, 6, 4, 0,
        6, 2, 5, 7, 2, 7, 5, 9, 5, 7, 6, 1, 4, 1, 8, 3, 4, 2, 5, 9, 0, 3, 3, 2,
        0, 3, 1, 2, 5, 3, 6, 3, 7, 9, 7, 8, 8, 0, 7, 0, 9, 1, 7, 1, 2, 9, 5, 1,
        6, 6, 0, 1, 5, 6, 2, 5, 1, 8, 1, 8, 9, 8, 9, 4, 0, 3, 5, 4, 5, 8, 5, 6,
        4, 7, 5, 8, 3, 0, 0, 7, 8, 1, 2, 5, 9, 0, 9, 4, 9, 4, 7, 0, 1, 7, 7, 2,
        9, 2, 8, 2, 3, 7, 9, 1, 5, 0, 3, 9, 0, 6, 2, 5, 4, 5, 4, 7, 4, 7, 3, 5,
        0, 8, 8, 6, 4, 6, 4, 1, 1, 8, 9, 5, 7, 5, 1, 9, 5, 3, 1, 2, 5, 2, 2, 7,
        3, 7, 3, 6, 7, 5, 4, 4, 3, 2, 3, 2, 0, 5, 9, 4, 7, 8, 7, 5, 9, 7, 6, 5,
        6, 2, 5, 1, 1, 3, 6, 8, 6, 8, 3, 7, 7, 2, 1, 6, 1, 6, 0, 2, 9, 7, 3, 9,
        3, 7, 9, 8, 8, 2, 8, 1, 2, 5, 5, 6, 8, 4, 3, 4, 1, 8, 8, 6, 0, 8, 0, 8,
        0, 1, 4, 8, 6, 9, 6, 8, 9, 9, 4, 1, 4, 0, 6, 2, 5, 2, 8, 4, 2, 1, 7, 0,
        9, 4, 3, 0, 4, 0, 4, 0, 0, 7, 4, 3, 4, 8, 4, 4, 9, 7, 0, 7, 0, 3, 1, 2,
        5, 1, 4, 2, 1, 0, 8, 5, 4, 7, 1, 5, 2, 0, 2, 0, 0, 3, 7, 1, 7, 4, 2, 2,
        4, 8, 5, 3, 5, 1, 5, 6, 2, 5, 7, 1, 0, 5, 4, 2, 7, 3, 5, 7, 6, 0, 1, 0,
        0, 1, 8, 5, 8, 7, 1, 1, 2, 4, 2, 6, 7, 5, 7, 8, 1, 2, 5, 3, 5, 5, 2, 7,
        1, 3, 6, 7, 8, 8, 0, 0, 5, 0, 0, 9, 2, 9, 3, 5, 5, 6, 2, 1, 3, 3, 7, 8,
        9, 0, 6, 2, 5, 1, 7, 7, 6, 3, 5, 6, 8, 3, 9, 4, 0, 0, 2, 5, 0, 4, 6, 4,
        6, 7, 7, 8, 1, 0, 6, 6, 8, 9, 4, 5, 3, 1, 2, 5, 8, 8, 8, 1, 7, 8, 4, 1,
        9, 7, 0, 0, 1, 2, 5, 2, 3, 2, 3, 3, 8, 9, 0, 5, 3, 3, 4, 4, 7, 2, 6, 5,
        6, 2, 5, 4, 4, 4, 0, 8, 9, 2, 0, 9, 8, 5, 0, 0, 6, 2, 6, 1, 6, 1, 6, 9,
        4, 5, 2, 6, 6, 7, 2, 3, 6, 3, 2, 8, 1, 2, 5, 2, 2, 2, 0, 4, 4, 6, 0, 4,
        9, 2, 5, 0, 3, 1, 3, 0, 8, 0, 8, 4, 7, 2, 6, 3, 3, 3, 6, 1, 8, 1, 6, 4,
        0, 6, 2, 5, 1, 1, 1, 0, 2, 2, 3, 0, 2, 4, 6, 2, 5, 1, 5, 6, 5, 4, 0, 4,
        2, 3, 6, 3, 1, 6, 6, 8, 0, 9, 0, 8, 2, 0, 3, 1, 2, 5, 5, 5, 5, 1, 1, 1,
        5, 1, 2, 3, 1, 2, 5, 7, 8, 2, 7, 0, 2, 1, 1, 8, 1, 5, 8, 3, 4, 0, 4, 5,
        4, 1, 0, 1, 5, 6, 2, 5, 2, 7, 7, 5, 5, 5, 7, 5, 6, 1, 5, 6, 2, 8, 9, 1,
        3, 5, 1, 0, 5, 9, 0, 7, 9, 1, 7, 0, 2, 2, 7, 0, 5, 0, 7, 8, 1, 2, 5, 1,
        3, 8, 7, 7, 7, 8, 7, 8, 0, 7, 8, 1, 4, 4, 5, 6, 7, 5, 5, 2, 9, 5, 3, 9,
        5, 8, 5, 1, 1, 3, 5, 2, 5, 3, 9, 0, 6, 2, 5, 6, 9, 3, 8, 8, 9, 3, 9, 0,
        3, 9, 0, 7, 2, 2, 8, 3, 7, 7, 6, 4, 7, 6, 9, 7, 9, 2, 5, 5, 6, 7, 6, 2,
        6, 9, 5, 3, 1, 2, 5, 3, 4, 6, 9, 4, 4, 6, 9, 5, 1, 9, 5, 3, 6, 1, 4, 1,
        8, 8, 8, 2, 3, 8, 4, 8, 9, 6, 2, 7, 8, 3, 8, 1, 3, 4, 7, 6, 5, 6, 2, 5,
        1, 7, 3, 4, 7, 2, 3, 4, 7, 5, 9, 7, 6, 8, 0, 7, 0, 9, 4, 4, 1, 1, 9, 2,
        4, 4, 8, 1, 3, 9, 1, 9, 0, 6, 7, 3, 8, 2, 8, 1, 2, 5, 8, 6, 7, 3, 6, 1,
        7, 3, 7, 9, 8, 8, 4, 0, 3, 5, 4, 7, 2, 0, 5, 9, 6, 2, 2, 4, 0, 6, 9, 5,
        9, 5, 3, 3, 6, 9, 1, 4, 0, 6, 2, 5,
    ]

    toString() {
        let result = "0."
        for (let i = 0; i < this.num_digits; i++) {
            result += this.digits[i]
        }
        result += ` * 10 ** ${this.decimal_point}`
        return result
    }

    trim() {
        while (this.num_digits > 0 && this.digits[this.num_digits - 1] === 0) {
            this.num_digits--
        }
    }

    static getNumberOfDigitsDecimalLeftShift(shift: number) {
        return DecimalInfo.numberOfDigitsDecimalLeftShiftTable[shift]
    }

    number_of_digits_decimal_left_shift(shift: number) {
        shift &= 63
        let x_a = DecimalInfo.getNumberOfDigitsDecimalLeftShift(shift)
        let x_b = DecimalInfo.getNumberOfDigitsDecimalLeftShift(shift + 1)
        let num_new_digits = x_a >> 11
        let pow5_a = 0x7FF & x_a
        let pow5_b = 0x7FF & x_b

        let n = pow5_b - pow5_a
        for (let i = 0; i < n; i++) {
            if (i >= this.num_digits) {
                return num_new_digits - 1
            } else if (this.digits[i] === DecimalInfo.numberOfDigitsDecimalLeftShiftTablePowersOf5(pow5_a + i)) {
                continue
            } else if (this.digits[i] < DecimalInfo.numberOfDigitsDecimalLeftShiftTablePowersOf5(pow5_a + i)) {
                return num_new_digits - 1
            } else {
                return num_new_digits
            }
        }
        return num_new_digits
    }


    roundToU64() {
        if (this.num_digits === 0 || this.decimal_point < 0) {
            return [0, 0]
        } else if (this.decimal_point > 18) {
            return [0xFFFFFFFF, 0xFFFFFFFF]
        }

        let dp = this.decimal_point
        let n = new Uint32Array(2)
        let tempN = 0
        let tempDigitsCount = 0
        for (let i = 0; i < dp; i++) {
            tempN *= 10
            tempN += i < this.num_digits ? this.digits[i] : 0
            tempDigitsCount++

            if (tempDigitsCount === 16) {
                n[0] = tempN >>> 0
                n[1] = Math.floor(tempN / 0x100000000)
            }
        }

        return n
    }

    round() {
        if (this.num_digits === 0 || this.decimal_point < 0) {
            return 0n
        } else if (this.decimal_point > 18) {
            return 0xFFFFFFFFFFFFFFFFn
        }

        let dp = this.decimal_point
        let n = 0n
        for (let i = 0; i < dp; i++) {
            n = 10n * n + BigInt((i < this.num_digits) ? this.digits[i] : 0)
        }

        let round_up = false
        if (dp < this.num_digits) {
            round_up = this.digits[dp] >= 5
            if (this.digits[dp] === 5 && (dp + 1 === this.num_digits)) {
                round_up = this.truncated || ((dp > 0) && this.digits[dp - 1] % 2 !== 0)
            }
        }

        if (round_up) {
            n++
        }
        return n
    }

    leftShift(shift: number) {
        if (this.num_digits === 0) return;

        const MAX_SAFE_SHIFT = 27
        let remainingShift = shift
        while (remainingShift > 0) {
            const currentShift = Math.min(remainingShift, MAX_SAFE_SHIFT)
            this.decimal_left_shift_once(currentShift)
            remainingShift -= currentShift
        }

        // for (let i = 0; i < shift; i++) {
        //     this.decimal_left_shift_once(1)
        // }
    }

    private decimal_left_shift_once(shift: number) {
        const num_new_digits = this.number_of_digits_decimal_left_shift(shift);
        let read_index = this.num_digits - 1
        let write_index = this.num_digits - 1 + num_new_digits
        let n = 0

        while (read_index >= 0) {
            n += (this.digits[read_index] << shift)

            const quotient = Math.floor(n / 10)
            const remainder = n % 10

            if (write_index < CalculationConstants.max_digits) {
                this.digits[write_index] = remainder
            } else if (remainder > 0) {
                this.truncated = true
            }

            n = quotient
            write_index--
            read_index--
        }

        while (n > 0) {
            const quotient = Math.floor(n / 10);
            const remainder = n % 10;

            if (write_index < CalculationConstants.max_digits) {
                this.digits[write_index] = remainder;
            } else if (remainder > 0) {
                this.truncated = true;
            }

            n = quotient;
            write_index--;
        }

        this.num_digits += num_new_digits
        if (this.num_digits > CalculationConstants.max_digits) {
            this.num_digits = CalculationConstants.max_digits
        }
        this.decimal_point += num_new_digits
        this.trim()
    }

    rightShift(shift: number) {
        const MAX_SAFE_SHIFT = 27
        let remainingShift = shift
        while (remainingShift > 0) {
            const currentShift = Math.min(remainingShift, MAX_SAFE_SHIFT)
            this.decimal_right_shift_once(currentShift)
            remainingShift -= currentShift
        }

        // for (let i = 0; i < shift; i++) {
        //     this.decimal_right_shift_once(1)
        // }
    }

    decimal_right_shift_once(shift: number) {
        let read_index = 0
        let write_index = 0
        let n = 0

        while ((n >> shift) === 0) {
            if (read_index < this.num_digits) {
                n = 10 * n + this.digits[read_index++]
            } else if (n === 0) {
                return
            } else {
                while ((n >> shift) === 0) {
                    n = 10 * n
                    read_index++
                }
                break
            }
        }

        this.decimal_point -= (read_index - 1)
        if (this.decimal_point < -CalculationConstants.decimal_point_range) {
            this.num_digits = 0
            this.decimal_point = 0
            this.negative = false
            this.truncated = false
            return
        }

        let mask = (1 << shift) - 1
        while (read_index < this.num_digits) {
            let new_digit = n >> shift
            n = 10 * (n & mask) + this.digits[read_index++]
            this.digits[write_index++] = new_digit
        }

        while (n > 0) {
            let new_digit = n >> shift
            n = 10 * (n & mask)
            if (write_index < CalculationConstants.max_digits) {
                this.digits[write_index++] = new_digit
            } else if (new_digit > 0) {
                this.truncated = true
            }
        }

        this.num_digits = write_index
        this.trim()
    }

    static parseDecimalString(str: string, decimalSeparator = '.') {
        const answer = new DecimalInfo()
        let pos = 0

        // Handle sign
        if (str[pos] === '-') {
            answer.negative = true
            pos++
        } else if (str[pos] === '+') {
            pos++
        }

        // Skip leading zeros
        while (pos < str.length && str[pos] === '0') {
            pos++
        }

        // Parse integer part
        while (pos < str.length && this.isDigit(str[pos])) {
            if (answer.num_digits < CalculationConstants.max_digits) {
                answer.digits[answer.num_digits] = parseInt(str[pos], 10)
            }
            answer.num_digits++
            pos++
        }

        // Parse decimal part
        if (pos < str.length && str[pos] === decimalSeparator) {
            pos++
            const firstAfterPeriod = pos

            if (answer.num_digits === 0) {
                while (pos < str.length && str[pos] === '0') {
                    pos++
                }
            }

            while (pos < str.length && this.isDigit(str[pos])) {
                if (answer.num_digits < CalculationConstants.max_digits) {
                    answer.digits[answer.num_digits] = parseInt(str[pos], 10)
                }
                answer.num_digits++
                pos++
            }

            answer.decimal_point = firstAfterPeriod - pos
        }

        // Handle trailing zeros
        if (answer.num_digits > 0) {
            let preverse = pos - 1
            let trailingZeros = 0
            while (preverse >= 0 && (str[preverse] === '0' || str[preverse] === decimalSeparator)) {
                if (str[preverse] === '0') trailingZeros++
                preverse--
            }
            answer.decimal_point += answer.num_digits
            answer.num_digits -= trailingZeros
        }

        // Handle exponent
        if (pos < str.length && (str[pos] === 'e' || str[pos] === 'E')) {
            pos++
            let negExp = false
            if (pos < str.length && str[pos] === '-') {
                negExp = true
                pos++
            } else if (pos < str.length && str[pos] === '+') {
                pos++
            }

            let expNumber = 0
            while (pos < str.length && this.isDigit(str[pos])) {
                const digit = parseInt(str[pos], 10)
                if (expNumber < 0x10000) {
                    expNumber = 10 * expNumber + digit
                }
                pos++
            }

            answer.decimal_point += negExp ? -expNumber : expNumber
        }

        for (let i = answer.num_digits; i < CalculationConstants.max_digit_without_overflow; i++) {
            answer.digits[i] = 0
        }

        return answer
    }

    static isDigit(ch: string) {
        const code = ch.charCodeAt(0)
        return code >= 48 && code <= 57
    }

    static numberOfDigitsDecimalLeftShiftTablePowersOf5(index: number) {
        return DecimalInfo.powersOf5Table[index]
    }
}

const powers_of_ten_double = [
    1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11,
    1e12, 1e13, 1e14, 1e15, 1e16, 1e17, 1e18, 1e19, 1e20, 1e21, 1e22
]

const powers_of_ten_float = [1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10]

const powersTable = [0, 3, 6, 9, 13, 16, 19, 23, 26, 29, 33, 36, 39, 43, 46, 49, 53, 56, 59]

export const CalculationConstants = {
    max_digits: 800,
    max_digit_without_overflow: 19,
    decimal_point_range: 1000,
    get_powers: (n: number) => powersTable[n]
}