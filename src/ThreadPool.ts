import { Thread } from './Thread';

interface ThreadPoolOptions {
  size?: number; // Optional; defaults to hardwareConcurrency
  enableCaching?: boolean;
}

type Task<T extends any[], R> = {
  fn: (...args: T) => R | Promise<R>;
  args: T;
  resolve: (value: R | PromiseLike<R>) => void;
  reject: (reason?: any) => void;
};

export class ThreadPool {
  private threads: Worker[] = [];
  private taskQueue: Task<any[], any>[] = [];
  private maxSize: number;

  constructor(options: ThreadPoolOptions) {
    this.maxSize = options.size ?? navigator.hardwareConcurrency ?? 4;
    Thread.configure({ enableCaching: options.enableCaching });

    // Pre-create workers
    for (let i = 0; i < this.maxSize; i++) {
      this.threads.push(Thread.createWorker());
    }
  }

  async exec<T extends any[], R>(fn: (...args: T) => R | Promise<R>, ...args: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const task: Task<T, R> = { fn, args, resolve, reject };
      if (this.threads.length > 0) {
        this.executeTask(task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  private executeTask<T extends any[], R>(task: Task<T, R>) {
    const worker = this.threads.pop()!;

    Thread.exec(task.fn, ...task.args)
      .then(task.resolve)
      .catch((err) => this.handleWorkerError(err, task))
      .finally(() => {
        // Re-add worker to pool
        this.threads.push(worker);

        // Execute next task in queue if available
        if (this.taskQueue.length > 0) {
          const nextTask = this.taskQueue.shift()!;
          this.executeTask(nextTask);
        }
      });
  }

  private handleWorkerError<T extends any[], R>(error: Error, task: Task<T, R>) {
    console.error('ThreadPool worker error:', error);
    task.reject(error);

    // Replace failed worker with a new one
    const newWorker = Thread.createWorker();
    this.threads.push(newWorker);
  }
}
