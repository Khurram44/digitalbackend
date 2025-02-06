const EventEmitter = require('events');

class AsyncQueue extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.intervalTime = 250; // Default interval
        this.timer = null;
    }

    // Add item to the queue
    enqueue(item) {
        this.queue.push(item);
        this.emit('enqueued', item);
    }

    // Get the item at the head of the queue
    peek() {
        return this.queue.length > 0 ? this.queue[0] : null;
    }

    // Print all items in the queue
    print() {
        return [...this.queue];
    }

    // Get the current interval
    getCurrentInterval() {
        return this.intervalTime;
    }

    // Start dequeuing items
    start() {
        if (this.timer) return; // Prevent multiple timers
        this.timer = setInterval(() => {
            if (this.queue.length > 0) {
                const dequeuedItem = this.queue.shift();
                this.emit('dequeued', dequeuedItem);
            }
        }, this.intervalTime);
    }

    // Pause dequeuing items
    pause() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    // Update the interval for dequeuing
    interval(newInterval) {
        this.intervalTime = newInterval;
        this.emit('interval', newInterval);

        if (this.timer) {
            this.pause();
            this.start();
        }
    }
}

module.exports = AsyncQueue;
