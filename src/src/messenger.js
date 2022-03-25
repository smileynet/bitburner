export class Messenger {
    constructor(interval = 60) {
        this.messages = new Map();
        this.refresh_interval = interval;
        this.current_interval = interval;
    }

    run(ns) {
        if (this.current_interval <= 0) {
            for (const message of this.messages) {
                ns.tprint(`   ---Update: ${message[0]}---   \n${message[1]}`);
            }
            this.messages.clear();
            this.current_interval = this.refresh_interval;
        } else {
            this.current_interval--
        }
    }

    add_message(source, message) {
        this.messages.set(source, message);
    }

    append_message(source, message) {
        if (this.messages.get(source)) {
            if (this.messages.get(source) == message) {
                console.debug(`Duplicate message: ${message}`);
            } else {
                this.messages.set(source, this.messages.get(source) + message);
            }
        } else {
            this.messages.set(source, message);
        }
    }
}