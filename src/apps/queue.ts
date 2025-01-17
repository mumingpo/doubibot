import type { App, ReqCtx, ResCtx } from "../doubibot";

// so that there are no more weird comments about having position 0
function _posToStr(n: number) {
    if (n === 0) {
        return "正在被嘟";
    }
    return `${n}`;
}

/**
 * Minimalist implementation of a queue for small queues.
 * Ideally should be implemented with a heap.
 */
class Queue implements App {
    name = "queue";
    regExp = /.*/g;

    _q: Array<string>;
    _active: boolean

    constructor() {
        this._q = [];
        this._active = true;
    }

    handler(reqCtx: ReqCtx, resCtx: ResCtx) {
        const {
            username,
            hostname,
            message: { sender, content },
        } = reqCtx;

        // publicly accessible routes
        if (/^排队帮助$/g.test(content)) {
            return this._handleHelp(reqCtx, resCtx);
        } else if (/^当前$/g.test(content)) {
            return this._handlePeep(reqCtx, resCtx);
        } else if (/^人数$/g.test(content)) {
            return this._handleLength(reqCtx, resCtx);
        } else if (sender === hostname || sender === username) {
            // host routes
            if (/^下一(?:个|位)$/g.test(content)) {
                return this._handlePop(reqCtx, resCtx);
            } else if (/^开始$/g.test(content)) {
                return this._handleStart(reqCtx, resCtx);
            } else if (/^停止$/g.test(content)) {
                return this._handleStop(reqCtx, resCtx);
            }
        } else {
            // guest routes
            if (/^排队$/g.test(content)) {
                return this._handleEnqueue(reqCtx, resCtx);
            } else if (/^取消(?:排队)?$/g.test(content)) {
                return this._handleDequeue(reqCtx, resCtx);
            } else if (/^我的位置$/g.test(content)) {
                return this._handleIndexOf(reqCtx, resCtx);
            }
        }

        return false;
    }

    _handleHelp(reqCtx: ReqCtx, resCtx: ResCtx) {
        const {
            hostname,
            message: { sender },
        } = reqCtx;

        if (hostname === sender) {
            resCtx.send("主播指令:当前,下一位,开始,停止");
        } else {
            resCtx.send("观众指令:排队,取消,人数,我的位置");
        }

        return true;
    }
    _handleStart(_: ReqCtx, resCtx: ResCtx) {
        this._active = true;

        resCtx.send('开嘟!')

        return true;
    }
    _handleStop(_: ReqCtx, resCtx: ResCtx) {
        this._active = false;

        resCtx.send('停嘟!')

        return true;
    }
    _handleEnqueue(reqCtx: ReqCtx, resCtx: ResCtx) {
        const { sender } = reqCtx.message;

        if (!this._active) {
            resCtx.send('不嘟辣!')

            return true;
        }

        const position = this._q.indexOf(sender);

        if (position === -1) {
            this._q.push(sender);
            resCtx.send(`排上队辣!位置:${_posToStr(this._q.length - 1)}`);
        } else {
            resCtx.send(`你已在队列中!位置:${_posToStr(position)}`);
        }

        return true;
    }
    _handleDequeue(reqCtx: ReqCtx, resCtx: ResCtx) {
        const { sender } = reqCtx.message;

        const position = this._q.indexOf(sender);

        if (position === -1) {
            resCtx.send("你不在队列中(");
        } else {
            this._q.splice(position, 1);
            resCtx.send("取消排队成功(");
        }

        return true;
    }
    _handleLength(_: ReqCtx, resCtx: ResCtx) {
        if (this._q.length <= 1) {
            resCtx.send("当前没有人在排队(");
        } else {
            resCtx.send(`当前队列中有${this._q.length - 1}人.`);
        }

        return true;
    }
    _handleIndexOf(reqCtx: ReqCtx, resCtx: ResCtx) {
        const { sender } = reqCtx.message;

        const position = this._q.indexOf(sender);

        if (position === -1) {
            resCtx.send("你不在队列中(");
        } else {
            resCtx.send(`你的位置:${_posToStr(position)}`);
        }

        return true;
    }
    _handlePeep(_: ReqCtx, resCtx: ResCtx) {
        if (this._q.length === 0) {
            resCtx.send("都嘟完辣(");
        } else {
            resCtx.send(`当前:${this._q[0]}`);
        }

        return true;
    }
    _handlePop(_: ReqCtx, resCtx: ResCtx) {
        this._q.shift();
        if (this._q.length === 0) {
            resCtx.send("都嘟完辣(");
        } else {
            resCtx.send(`下一位:${this._q[0]}`);
        }

        return true;
    }
}

export default Queue;
