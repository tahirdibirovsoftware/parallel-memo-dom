interface CacheEntry {
    args: any[];
    result: any;
}

interface ThreadOptions {
    enableCaching?: boolean;
}

export class Thread {
    private static cache: CacheEntry[] = [];
    private static enableCaching: boolean = true;

    static configure(options: ThreadOptions): void {
        Thread.enableCaching = options.enableCaching ?? true;
    }

    static exec(fn: (...args: any[]) => any, ...args: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            if (Thread.enableCaching) {
                const cachedEntry = Thread.cache.find(entry => Thread.areArgsEqual(entry.args, args));
                if (cachedEntry) {
                    resolve(cachedEntry.result);
                    return;
                }
            }

            // Correctly referencing the compiled JS worker file
            const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

            worker.postMessage({ fn: fn.toString(), args });

            worker.onmessage = (event) => {
                const result = event.data;
                if (Thread.enableCaching) {
                    Thread.cache.push({ args, result });
                }
                resolve(result);
                worker.terminate();
            };

            worker.onerror = reject;
        });
    }

    private static areArgsEqual(args1: any[], args2: any[]): boolean {
        return JSON.stringify(args1) === JSON.stringify(args2);
    }
}
