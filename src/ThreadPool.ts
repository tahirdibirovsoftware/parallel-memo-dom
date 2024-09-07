import { Thread } from './Thread';

interface ThreadPoolOptions {
    size: number;
    enableCaching?: boolean;
}

type Task<T extends any[], R> = {
    fn: (...args: T) => R;
    args: T;
    resolve: (value: R | PromiseLike<R>) => void;
    reject: (reason?: any) => void;
};

export class ThreadPool {
    private size: number;
    private threads: Worker[];
    private taskQueue: Task<any[], any>[] = [];

    constructor(options: ThreadPoolOptions) {
        this.size = options.size;
        this.threads = Array.from({ length: this.size }, () => new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }));
        Thread.configure({ enableCaching: options.enableCaching });
        this.resizePool();
    }

    async exec<T extends any[], R>(fn: (...args: T) => R, ...args: T): Promise<R> {
        return new Promise((resolve, reject) => {
            const task: Task<T, R> = { fn, args, resolve, reject };
            
            if (this.threads.length > 0) {
                this.executeTask(task);
            } else {
                this.taskQueue.push(task);
            }
        });
    }

    private executeTask<T extends any[], R>(task: Task<T, R>) {
        const thread = this.threads.pop()!;
        Thread.exec(task.fn, ...task.args)
            .then(task.resolve)
            .catch((error) => this.handleWorkerError(error, task))
            .finally(() => {
                this.threads.push(thread);
                if (this.taskQueue.length > 0) {
                    this.executeTask(this.taskQueue.shift()!);
                }
            });
    }

    private handleWorkerError<T extends any[], R>(error: Error, task: Task<T, R>) {
        console.error('Worker error:', error);
        task.reject(error);
        const newWorker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
        this.threads.push(newWorker);
    }

    private resizePool() {
        const optimalSize = navigator.hardwareConcurrency || 4;
        while (this.threads.length < optimalSize) {
            const newWorker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
            this.threads.push(newWorker);
        }
    }
}