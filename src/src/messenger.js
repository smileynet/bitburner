export class Messenger {
    constructor(verbose = true, interval = 60) {
        this.messages = new Map();
        this.verbose = verbose
        this.refresh_interval = interval;
        this.current_interval = interval;
    }

    init(ns) {
        if (!this.verbose) {
            ns.tail();
        }
    }

    run(ns) {
        if (this.current_interval <= 0) {
            for (const message of this.messages) {
                if (this.verbose) {
                    ns.tprint(`     ---${message[0]}---\n${message[1]}\n`);
                } else {
                    ns.print(`     ---${message[0]}---\n${message[1]}\n`);
                }
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

export default Messenger;