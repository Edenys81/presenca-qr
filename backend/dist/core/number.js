export function toNumber(value) {
    if (value === null || value === undefined)
        return 0;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return parseFloat(value);
    return Number(value);
}
