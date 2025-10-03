const DAILY_COOLDOWN = 8.64e7;
export function formatCooldown(milliseconds) {
    const seconds = Math.floor((milliseconds / 1000) % 60);
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);
    const parts = [];
    if (hours > 0)
        parts.push(`${hours} hour(s)`);
    if (minutes > 0)
        parts.push(`${minutes} minute(s)`);
    if (seconds > 0)
        parts.push(`${seconds} second(s)`);
    return {
        hours,
        minutes,
        seconds,
        formatted: parts.join(', ') || '0 seconds'
    };
}
export function isValidAmount(amount) {
    const num = typeof amount === 'string' ? parseInt(amount) : amount;
    return !isNaN(num) && num > 0;
}
export function parseAmount(amount) {
    return typeof amount === 'string' ? parseInt(amount) : amount;
}