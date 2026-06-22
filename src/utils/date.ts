const months = new Uint16Array([0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334])
const monthsLeap = new Uint16Array([0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335])

const MAX_YEAR = 4096
const MIN_YEAR = 0

const daysYears = new Uint32Array(MAX_YEAR)
for (let y = 1970; y < MAX_YEAR; y++) {
    const days = isLeap(y) ? 366 : 365
    daysYears[y] = days + daysYears[y - 1]
}

const daysYearsBefore = new Uint32Array(1970)
for (let y = 1969; y >= 0; y--) {
    const days = isLeap(y) ? 366 : 365
    daysYearsBefore[y] = days + (daysYearsBefore[y + 1] || 0)
}

export function utc(year: number, month: number, day = 1, hours = 0, minutes = 0, seconds = 0, ms = 0) {
    if (year < MIN_YEAR || year > MAX_YEAR)
        return Date.UTC(year, month, day, hours, minutes, seconds, ms)

    const leap = isLeap(year)

    if (year < 1970) {
        const days = -daysYearsBefore[year] + (leap ? monthsLeap[month] : months[month]) + (day - 1)
        return days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000 + ms
    }

    const days = daysYears[year - 1] + (leap ? monthsLeap[month] : months[month]) + (day - 1)
    return days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000 + ms
}

function isLeap(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)
}
