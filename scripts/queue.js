class Queue {
    constructor(size) {
        this.items = new Array(size);
        this.backIndex = 0;
    }

    enqueue(item) {
        if (this.backIndex < this.items.length) {
            this.items[this.backIndex++] = item;
            return true;
        }

        return false;
    }

    dequeue() {
        const item = this.items[0];
        for (let i = 0; i < this.backIndex; i++) {
            this.items[i] = this.items[i + 1];
        }

        if (this.backIndex > 0)
            --this.backIndex;
        delete this.items[this.backIndex];
        return item;
    }

    isEmpty() {
        return this.items[0] === undefined;
    }
}