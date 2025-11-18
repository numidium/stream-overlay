export default class EventDispatcher {
    subscriptions;
    constructor() {
        this.subscriptions = {};
    }

    subscribe(eventType, obj, handler) {
        if (this.subscriptions[eventType] == null)
            this.subscriptions[eventType] = [];
        const index = this.subscriptions[eventType].length;
        this.subscriptions[eventType][index] = { target: obj, method: handler };
    }

    dispatch(eventType, event) {
        const eventSubscriptions = this.subscriptions[eventType];
        if (eventSubscriptions == null)
            return;
        for (let i = 0; i < eventSubscriptions.length; i++) {
            eventSubscriptions[i].method(eventSubscriptions[i].target, event);
        }
    }
}