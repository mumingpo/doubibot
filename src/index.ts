import DoubiBot from "./doubibot";
import Queue from "./apps/queue";

let defaultInstance: null | DoubiBot = null;

export default () => {
    if (defaultInstance === null) {
        defaultInstance = new DoubiBot();
        const queueApp = new Queue();
        defaultInstance.use(queueApp);
    }

    return defaultInstance;
};

export { DoubiBot, Queue };
