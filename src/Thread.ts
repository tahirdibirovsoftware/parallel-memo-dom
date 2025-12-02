/* eslint-disable @typescript-eslint/ban-types */
class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move key to end to mark as recently used
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
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

  static configure(options: ThreadOptions) {
    Thread.enableCaching = options.enableCaching ?? true;
  }

  static exec<T extends any[], R>(fn: (...args: T) => R | Promise<R>, ...args: T): Promise<R> {
    return new Promise((resolve, reject) => {
      // Check cache first
      const cacheKey = Thread.getCacheKey(fn, args);
      if (Thread.enableCaching) {
        const cached = Thread.cache.get(cacheKey);
        if (cached !== undefined) {
          resolve(cached);
          return;
        }
      }

      const worker = Thread.createWorker();

      // Collect transferable objects
      const transferables: Transferable[] = args.filter(
        (arg) => arg instanceof ArrayBuffer || arg instanceof MessagePort,
      );

      worker.onmessage = (event) => {
        const data = event.data;
        if (data?.__parallelMemoDomError) {
          reject(new Error(data.message));
        } else {
          if (Thread.enableCaching) {
            Thread.cache.set(cacheKey, data);
          }
          resolve(data);
        }
        worker.terminate();
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };

      // Send function and args to worker
      worker.postMessage({ fn: fn.toString(), args }, transferables);
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

  static createWorker(): Worker {
    if (!Thread.workerBlobUrl) {
      const workerCode = `
self.onmessage = async (event) => {
  const { fn, args } = event.data;
  try {
    const func = new Function('return ' + fn)();
    const result = await func(...args); // support async side-effects like fetch
    const transferables = result instanceof ArrayBuffer ? [result] : undefined;
    if (transferables) {
      self.postMessage(result, transferables);
    } else {
      self.postMessage(result);
    }
  } catch (err) {
    self.postMessage({
      __parallelMemoDomError: true,
      message: err?.message || 'Unknown error',
      stack: err?.stack
    });
  }
};
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      Thread.workerBlobUrl = URL.createObjectURL(blob);
    }

    return new Worker(Thread.workerBlobUrl);
  }
}
