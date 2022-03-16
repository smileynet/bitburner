export class Messenger {
    constructor(interval = 60) {
        this.messages = new Map();
        this.base_interval = interval;
        this.current_interval = interval;
    }

    run(ns) {
        if (this.current_interval <= 0) {
            for (const message of this.messages) {
                ns.tprint(`   ---Source: ${message[0]}---   \n${message[1]}`);
            }
            this.messages.clear();
            this.current_interval = this.base_interval;
        } else {
            this.current_interval--
        }
    }

    add_message(source, message) {
        this.messages.set(source, message);
    }
}