import selectors from "./selectors";

import { version } from "../package.json" with { type: "json" };

const PROCESSED_ATTRIBUTE_NAME = "data-dbb-processed";

type Options = {
    // frequency at which to process and reply chats
    tickInterval?: number;

    // minimum interval between replies
    minReplyInterval?: number;

    // delay after setting reply in textarea before sending
    replyDelay?: number;

    verbose?: boolean;

    autorun?: boolean;
};

const defaultOptions: Required<Options> = {
    tickInterval: 1000,
    minReplyInterval: 1000,
    replyDelay: 100,
    verbose: false,
    autorun: true,
};

type Message = {
    id: string;
    sender: string;
    content: string;
    timestamp: number;
};

type ReqCtx = {
    username: string;
    hostname: string;
    message: Message;
};

type ResCtx = {
    send: (s: string) => void;
};

// return whether if the request has been handled completely.
type Handled = boolean;
type Handler = (reqCtx: ReqCtx, resCtx: ResCtx) => Handled;

type App = {
    name: string;
    regExp: RegExp;
    handler: Handler;
};

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
    document.querySelector<T>(selector);

const info = (message: string, data?: unknown) => {
    console.log({ message, data });
};

const error = (message: string, data?: unknown) => {
    console.error({ message, data });
};

class DoubiBot {
    pid: ReturnType<typeof setInterval> | null;
    hostname: string;
    username: string;

    apps: Array<App>;

    lastMessageSubmissionTimestamp: number;

    tickInterval: number;
    minReplyInterval: number;
    replyDelay: number;
    verbose: boolean;

    constructor(options?: Options) {
        this.pid = null;
        this.hostname = "";
        this.username = "";

        this.apps = [];

        this.lastMessageSubmissionTimestamp = Number.NEGATIVE_INFINITY;

        const fullOptions = { ...defaultOptions, ...options };

        this.tickInterval = fullOptions.tickInterval;
        this.minReplyInterval = fullOptions.minReplyInterval;
        this.replyDelay = fullOptions.replyDelay;
        this.verbose = fullOptions.verbose;

        if (fullOptions.autorun === true) {
            this.start();
        }
    }

    _send(message: string) {
        const truncated = message.substring(0, 20);

        const textarea = $<HTMLTextAreaElement>(selectors.chatInputTextrea);
        const submitButton = $<HTMLButtonElement>(
            selectors.chatInputSubmitButton,
        );

        if (textarea === null || submitButton === null) {
            error("Unable to find textarea and submit button for chat.");
            return;
        }

        if (
            Date.now() <
            this.lastMessageSubmissionTimestamp + this.minReplyInterval
        ) {
            if (this.verbose) {
                info("Message unsent due to reply rate limit.", truncated);
            }

            return;
        }

        this.lastMessageSubmissionTimestamp = Date.now();
        textarea.value = truncated;
        textarea.dispatchEvent(new Event("input"));

        // HACK: wait for vue or whatever engine to populate value
        // from dom textarea before submitting
        setTimeout(() => {
            if (this.verbose) {
                info("Sending message.", truncated);
            }
            submitButton.dispatchEvent(new Event("click"));
        }, this.replyDelay);
    }

    _getNewMessages() {
        const messages: Array<Message> = [];

        const chatHistory = $<HTMLDivElement>(selectors.chatHistory);

        if (chatHistory === null) {
            error("Unable to find chat history.");
            return messages;
        }

        for (const child of chatHistory.children) {
            const messageId = child.getAttribute("data-ct");
            const username = child.getAttribute("data-uname");
            const content = child.getAttribute("data-danmaku");
            const timestampStr = child.getAttribute("data-timestamp");
            const processed =
                child.getAttribute(PROCESSED_ATTRIBUTE_NAME) !== null;

            if (processed) {
                continue;
            }
            child.setAttribute(PROCESSED_ATTRIBUTE_NAME, "");

            if (
                messageId === null ||
                username === null ||
                content === null ||
                timestampStr === null
            ) {
                if (this.verbose) {
                    info("Unparsable chat entry.", child);
                }
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
            };
            messages.push(message);
        }

        if (this.verbose && messages.length > 0) {
            info("New messages.", messages);
        }

        return messages;
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
                error(`App "${app.name}" encountered an error.`, e);
            }
        }
    }

    _test = (msg: string, sender?: string | undefined) => {
        this._call_apps(
            {
                username: this.username,
                hostname: this.hostname,
                message: {
                    id: 'ababababa',
                    sender: sender ?? this.username,
                    content: msg,
                    timestamp: (new Date()).valueOf(),
                },
            },
            {
                send: (msg) => { this._send(msg); }
            },
        );
    };

    _tick() {
        const messages = this._getNewMessages();

        for (const message of messages) {
            const reqCtx: ReqCtx = {
                username: this.username,
                hostname: this.hostname,
                message,
            };

            const resCtx: ResCtx = {
                send: (s: string) => {
                    this._send(s);
                },
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
            error("Already running!");
            return;
        }

        const username =
            $<HTMLSpanElement>(selectors.username)?.innerText ?? null;
        const hostname =
            $<HTMLAnchorElement>(selectors.hostname)?.innerText ?? null;

        if (username === null || hostname === null) {
            error("Unable to find username/hostname.");
            return;
        }
        if (username === hostname) {
            error("IMPORTANT: do not use host account to run this bot.");
        }

        this.username = username;
        this.hostname = hostname;

        // label all existing messages as processed
        this._getNewMessages();

        this.pid = setInterval(() => {
            this._tick();
        }, this.tickInterval);

        info("DoubiBot is now running.", {
            version,
            pid: this.pid,
        });
    }

    /**
     * stop Doubibot
     */
    stop() {
        if (this.pid === null) {
            error("Not running!");
            return;
        }

        clearInterval(this.pid);
        const { pid } = this;
        this.pid = null;

        info("DoubiBot has stopped.", {
            version,
            pid,
        });
    }
}

export default DoubiBot;

export type { Options, Message, ReqCtx, ResCtx, Handler, App };
