import DoubiBot from "./doubibot";
import Queue from "./apps/queue";

let _defaultInstance: null | DoubiBot = null;
const _default = () => {
    if (_defaultInstance === null) {
        _defaultInstance = new DoubiBot();
        const queueApp = new Queue();
        _defaultInstance.use(queueApp);
    }

    return _defaultInstance;
};

export default _default;
export { DoubiBot, Queue };
