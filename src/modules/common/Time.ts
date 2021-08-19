export class Time {
    /**
     * Time in seconds
     */
    public seconds: number;

    /**
     * Time in minutes
     */
    public minutes: number;

    /**
     * Time in hour
     */
    public hours: number;

    constructor() {
        const date = Date.now();
        this.seconds = Math.floor(date / 1000);
        this.minutes = Math.floor(date / (1000 * 60));
        this.hours = Math.floor(date / (1000 * 60 * 60));
    }

    /**
     * Convert ms to seconds, minutes and hours.
     * @param ms
     * @returns Object { hours, minutes, seconds }
     */
    public static msToTime(ms: number) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(ms / (1000 * 60));
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return { hours, minutes, seconds };
    }
}
