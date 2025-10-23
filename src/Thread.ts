class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
}

interface ThreadOptions {
  enableCaching?: boolean;
}

export class Thread {
  private static cache: LRUCache<string, any> = new LRUCache(100);
  private static enableCaching: boolean = true;
  private static workerBlobUrl: string | null = null;

  static configure(options: ThreadOptions): void {
    Thread.enableCaching = options.enableCaching ?? true;
  }

  static exec<T extends any[], R>(fn: (...args: T) => R, ...args: T): Promise<R> {
    return new Promise((resolve, reject) => {
      if (Thread.enableCaching) {
        const cacheKey = Thread.getCacheKey(fn, args);
        const cachedResult = Thread.cache.get(cacheKey);
        if (cachedResult !== undefined) {
          resolve(cachedResult);
          return;
        }
      }

      const worker = Thread.createWorker();

      const transferables = args.filter(
        (arg) => arg instanceof ArrayBuffer || arg instanceof MessagePort,
      );
      worker.postMessage({ fn: fn.toString(), args }, transferables);

      worker.onmessage = (event) => {
        const result = event.data;
        if (Thread.enableCaching) {
          const cacheKey = Thread.getCacheKey(fn, args);
          Thread.cache.set(cacheKey, result);
        }
        resolve(result);
        worker.terminate();
      };

      worker.onerror = reject;
    });
  }

  private static getCacheKey(fn: Function, args: any[]): string {
    return JSON.stringify({
      fn: fn.toString(),
      args: args.map((arg) =>
        typeof arg === 'function' ? arg.toString() : arg instanceof Date ? arg.toISOString() : arg,
      ),
    });
  }

  // Create an inline worker from the worker logic so bundlers like Vite don't need a separate file.
  // Reuses a single Blob URL across workers to avoid leaking object URLs.
  static createWorker(): Worker {
    if (!Thread.workerBlobUrl) {
      // Worker code mirrors the previous `worker.ts` behavior.
      const workerCode = `self.onmessage = (event) => {
    const { fn, args } = event.data;
    const func = new Function('return ' + fn)();
    try {
        const result = func(...args);
        const transferables = result instanceof ArrayBuffer ? [result] : undefined;
        // When using postMessage from a worker, the second parameter is an array of transferables.
        // Using the structured clone algorithm when transferables is undefined.
        if (transferables) {
            self.postMessage(result, transferables);
        } else {
            self.postMessage(result);
        }
    } catch (err) {
        // Post error message back; the main thread will reject the promise via onerror/onmessage handling.
        // As Error objects are not always cloneable across contexts, send a plain object.
        self.postMessage({ __parallelMemoDomError: true, message: err && err.message, stack: err && err.stack });
    }
};`;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      Thread.workerBlobUrl = URL.createObjectURL(blob);
    }

    // Create a module-type worker where supported; inline workers can't be created as 'module' reliably across
    // browsers when using Blob URLs, so we create a classic worker. The worker code doesn't rely on modules.
    return new Worker(Thread.workerBlobUrl!);
  }
}
