import { Thread } from './Thread';

interface ThreadPoolOptions {
    size: number;
    enableCaching?: boolean;
}

export class ThreadPool {
    private size: number;
    private threads: Worker[];

    constructor(options: ThreadPoolOptions) {
        this.size = options.size;
        this.threads = Array.from({ length: this.size }, () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }));
        Thread.configure({ enableCaching: options.enableCaching });
    }

    async exec(fn: (...args: any[]) => any, ...args: any[]): Promise<any> {
        const availableThread = this.threads.pop();
        if (!availableThread) {
            throw new Error('No available threads in the pool');
        }

        try {
            return await Thread.exec(fn, ...args);
        } finally {
            this.threads.push(availableThread);
        }
    }
}
