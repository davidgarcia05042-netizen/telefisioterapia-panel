export default class MetricsService {
    static calculateStats(dataArray) {
        const validData = dataArray.filter(v => v !== null && !isNaN(v));
        if (validData.length === 0) return { min: 0, max: 0, avg: 0, amplitude: 0, reps: 0 };
        
        const min = Math.min(...validData);
        const max = Math.max(...validData);
        const avg = validData.reduce((a, b) => a + b, 0) / validData.length;
        
        const reps = this.countRepetitions(validData);

        return {
            min: min.toFixed(2),
            max: max.toFixed(2),
            avg: avg.toFixed(2),
            amplitude: (max - min).toFixed(2),
            reps
        };
    }

    static countRepetitions(data) {
        // Simple peak detection algorithm
        let reps = 0;
        let direction = 0; // 1 for up, -1 for down
        const threshold = 15; // 15 degrees change required to count as a movement phase
        let lastExtremum = data[0];

        for (let i = 1; i < data.length; i++) {
            const diff = data[i] - lastExtremum;
            if (direction === 0) {
                if (Math.abs(diff) > threshold) {
                    direction = Math.sign(diff);
                    lastExtremum = data[i];
                }
            } else if (direction === 1) {
                if (diff > 0) {
                    lastExtremum = data[i]; // new peak
                } else if (diff < -threshold) {
                    direction = -1; // changed direction downwards
                    lastExtremum = data[i];
                }
            } else if (direction === -1) {
                if (diff < 0) {
                    lastExtremum = data[i]; // new trough
                } else if (diff > threshold) {
                    direction = 1; // changed direction upwards
                    reps++; // completed a full cycle (down then up)
                    lastExtremum = data[i];
                }
            }
        }
        return reps;
    }
}
