const months = new Uint16Array([0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334])
const monthsLeap = new Uint16Array([0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335])

const MAX_YEAR = 4096
const MIN_YEAR = 0

const days = (y: number) => isLeap(y) ? 366 : 365

const daysYearsNew = new Int32Array(MAX_YEAR)
for (let i = 1969; i >= 0; i--)
    daysYearsNew[i] = -(days(i) + (-daysYearsNew[i + 1]))

for (let i = 1970; i < MAX_YEAR; i++)
    daysYearsNew[i] = days(i) + Math.max(daysYearsNew[i - 1], 0)

export function utc(year: number, month: number, day = 1, hours = 0, minutes = 0, seconds = 0, ms = 0) {
    if (year < MIN_YEAR || year > MAX_YEAR)
        return Date.UTC(year, month, day, hours, minutes, seconds, ms)

    const monthDays = isLeap(year) ? monthsLeap[month] : months[month]
    const days = daysYearsNew[year - 1] + monthDays + (day - 1)
    return days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000 + ms
}

function isLeap(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)
}
