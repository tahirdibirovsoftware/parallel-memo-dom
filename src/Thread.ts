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

            const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

            const transferables = args.filter(arg => arg instanceof ArrayBuffer || arg instanceof MessagePort);
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
            args: args.map(arg => 
                typeof arg === 'function' ? arg.toString() :
                arg instanceof Date ? arg.toISOString() :
                arg
            )
        });
    }
}