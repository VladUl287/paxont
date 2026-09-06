export function precomputeUTC(options: { minYear: number, maxYear: number }) {
    const months = new Uint16Array([0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334])
    const monthsLeap = new Uint16Array([0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335])

    function isLeap(y: number): boolean {
        return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)
    }

    const { minYear: MIN_YEAR, maxYear: MAX_YEAR } = options

    const daysYearsNew = new Int32Array(MAX_YEAR)
    for (let y = 1969; y > MIN_YEAR; y--) {
        daysYearsNew[y] = daysYearsNew[y + 1] - (isLeap(y + 1) ? 366 : 365)
    }

    for (let y = 1971; y < MAX_YEAR; y++) {
        daysYearsNew[y] = daysYearsNew[y - 1] + (isLeap(y - 1) ? 366 : 365)
    }

    function utc(year: number, month: number, day = 1, hours = 0, minutes = 0, seconds = 0, ms = 0) {
        if (year < MIN_YEAR || year > MAX_YEAR)
            return Date.UTC(year, month, day, hours, minutes, seconds, ms)

        const monthDays = isLeap(year) ? monthsLeap[month] : months[month]
        const days = daysYearsNew[year] + monthDays + (day - 1)
        return days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000 + ms
    }

    return utc
}

export const utc = precomputeUTC({ minYear: 0, maxYear: 4096 })