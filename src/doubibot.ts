import selectors from './selectors';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => (document.querySelector<T>(selector));

type Options = {
    // frequency at which to process and reply chats
    tickInterval?: number,

    // minimum interval between replies
    minReplyInterval?: number,

    // delay after setting reply in textarea before sending
    replyDelay?: number,

    verbose?: boolean,

    autorun?: boolean,
};

type Message = {
    id: string,
    sender: string,
    content: string,
    timestamp: number,
};

type ReqCtx = {
    username: string,
    hostname: string,
    message: Message,
};

type ResCtx = {
    send: (s: string) => void,
}

// return whether if the request has been handled completely.
type Handler = (reqCtx: ReqCtx, resCtx: ResCtx) => boolean;

type App = {
    name: string,
    regExp: RegExp,
    handler: Handler,
};

class DoubiBot {
    pid: ReturnType<typeof setInterval> | null

    apps: Array<App>;
    chatHistoryBuffer: Array<Message>;

    lastProcessedIncomingMessageId: string | null
    lastMessageSubmissionTimestamp: number

    tickInterval: number
    minReplyInterval: number
    replyDelay: number
    verbose: boolean

    constructor(options?: Options) {
        this.pid = null

        this.apps = [];
        this.chatHistoryBuffer = [];

        this.lastProcessedIncomingMessageId = null;
        this.lastMessageSubmissionTimestamp = Number.NEGATIVE_INFINITY;

        this.tickInterval = options?.tickInterval ?? 1000;
        this.minReplyInterval = options?.minReplyInterval ?? 1000;
        this.replyDelay = options?.replyDelay ?? 100;
        this.verbose = options?.verbose ?? false;

        if ((options?.autorun ?? true) === true) {
            this.start();
        }
    }

    _send(message: string) {
        const truncated = message.substring(0, 20);

        const textarea = $<HTMLTextAreaElement>(selectors.chatInputTextrea);
        const submitButton = $<HTMLButtonElement>(selectors.chatInputSubmitButton);

        if (textarea === null || submitButton === null) {
            console.error('Unable to find textarea and submit button for chat.');
            return;
        }

        if (Date.now() < this.lastMessageSubmissionTimestamp + this.minReplyInterval) {
            if (this.verbose) {
                console.log(`Message unsent: "${truncated}".`)
            }

            return;
        }

        this.lastMessageSubmissionTimestamp = Date.now();
        textarea.value = truncated;
        textarea.dispatchEvent(new Event('input'));

        // wait for vue or whatever engine to tick before submitting
        setTimeout(
            () => {
                if (this.verbose) {
                    console.log(`Sending message: "${truncated}".`);
                }
                submitButton.dispatchEvent(new Event('click'));
            },
            this.replyDelay,
        );
    }

    _reconcileChatHistory() {
        const chatHistory = $<HTMLDivElement>(selectors.chatHistory);

        if (chatHistory === null) {
            console.error('Unable to find chat history.');
            return;
        }

        if (this.lastProcessedIncomingMessageId === null) {
            // on initialization, set lastProcessedIncomingMessageId to last id in history
            for (const child of chatHistory.children) {
                const messageId = child.getAttribute('data-ct');

                if (messageId !== null) {
                    this.lastProcessedIncomingMessageId = messageId;
                }
            }

            // if there are no message with id in history, set lastProcessed to empty string
            if (this.lastProcessedIncomingMessageId === null) {
                this.lastProcessedIncomingMessageId = '';
            }
        }

        this.chatHistoryBuffer = [];

        for (const child of chatHistory.children) {
            const messageId = child.getAttribute('data-ct');
            const username = child.getAttribute('data-uname');
            const content = child.getAttribute('data-danmaku');
            const timestampStr = child.getAttribute('data-timestamp');

            if (
                messageId === null ||
                username === null ||
                content === null ||
                timestampStr === null
            ) {
                // too verbose
                // if (this.verbose) {
                //     console.log('The following chatHistory entry cannot be parsed and has been skipped.');
                //     console.log(child);
                // }
                continue;
            }

            let timestamp = Number.parseInt(timestampStr, 10);

            // there is some inconsistency between messages received and message sent.
            // one reports in seconds and another in milliseconds
            if (timestamp < 1e11) {
                timestamp *= 1000;
            }

            const message: Message = {
                id: messageId,
                sender: username,
                content,
                timestamp,
            }
            
            if (messageId === this.lastProcessedIncomingMessageId) {
                this.chatHistoryBuffer = [];
            } else {
                this.chatHistoryBuffer.push(message);
            }
        }

        if (this.chatHistoryBuffer.length > 0) {
            this.lastProcessedIncomingMessageId = this.chatHistoryBuffer[this.chatHistoryBuffer.length - 1].id;
        }

        if (this.verbose) {
            console.log('Incoming messages:');
            console.log(this.chatHistoryBuffer);
        }
    }

    _call_apps(reqCtx: ReqCtx, resCtx: ResCtx) {
        for (const app of this.apps) {
            try {
                if (app.regExp.test(reqCtx.message.content)) {
                    const handled = app.handler(reqCtx, resCtx);
                    if (handled) {
                        return;
                    }
                }
            } catch (e) {
                console.error(`App "${app.name}" encountered the following error:\n\t${e}`);
            }
        }
    }

    _tick() {
        const username = $<HTMLSpanElement>(selectors.username)?.innerText ?? null;
        const hostname = $<HTMLAnchorElement>(selectors.hostname)?.innerText ?? null;

        if (
            username === null ||
            hostname === null
        ) {
            console.error('Unable to find username/hostname.');
            return;
        }

        this._reconcileChatHistory();

        for (const message of this.chatHistoryBuffer) {
            const reqCtx: ReqCtx = {
                username,
                hostname,
                message,
            };

            const resCtx: ResCtx = {
                send: (s: string) => { this._send(s) },
            };

            this._call_apps(reqCtx, resCtx);
        }
    }

    /**
     * register an app
     * @param app app to use
     */
    use(app: App) {
        this.apps.push(app);
    }

    /**
     * start Doubibot
     */
    start() {
        if (this.pid !== null) {
            console.error('Already running!');
            return;
        }

        this.pid = setInterval(
            () => { this._tick() },
            this.tickInterval,
        );
    }

    /**
     * stop Doubibot
     */
    stop() {
        if (this.pid === null) {
            console.error('Not running!');
            return;
        }

        clearInterval(this.pid);
        this.pid = null;
    }
}

export default DoubiBot;

export type {
    Options,
    Message,
    ReqCtx,
    ResCtx,
    Handler,
    App,
};
