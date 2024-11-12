import DoubiBot from './doubibot';
import Queue from './apps/queue';

export default () => {
    const bot = new DoubiBot();
    const queueApp = new Queue();
    bot.use(queueApp);

    return bot;
};

export { DoubiBot, Queue };
