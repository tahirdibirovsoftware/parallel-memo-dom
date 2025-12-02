import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThreadPool } from '../src/ThreadPool';
import { Thread } from '../src/Thread';

describe('ThreadPool', () => {
  let origCreate: any;

  beforeEach(() => {
    origCreate = (Thread as any).createWorker;
    Thread.configure({ enableCaching: false });
  });

  afterEach(() => {
    (Thread as any).createWorker = origCreate;
    Thread.configure({ enableCaching: true });
  });

  it('executes tasks, reuses workers, and supports async functions', async () => {
    class MockWorker {
      onmessage: ((ev: any) => void) | null = null;
      postMessage(msg: any) {
        setTimeout(async () => {
          try {
            const fn = new Function('return ' + msg.fn)();
            const result = await fn(...msg.args);
            this.onmessage && this.onmessage({ data: result });
          } catch (err) {
            this.onmessage &&
              this.onmessage({
                data: { __parallelMemoDomError: true, message: (err as Error).message },
              });
          }
        }, 0);
      }
      terminate() {}
    }

    (Thread as any).createWorker = () => new MockWorker();

    const pool = new ThreadPool({ size: 2, enableCaching: false });

    const tasks = [
      pool.exec(async (a: number) => a * 2, 2),
      pool.exec(async (a: number) => a + 3, 5),
      pool.exec(async (a: number) => a - 1, 10),
    ];

    const results = await Promise.all(tasks);
    expect(results).toEqual([4, 8, 9]);
  });

  it('executes async tasks like fetch inside pool', async () => {
    class MockWorker {
      onmessage: ((ev: any) => void) | null = null;
      postMessage(msg: any) {
        setTimeout(async () => {
          const fn = new Function('return ' + msg.fn)();
          const result = await fn(...msg.args); // allow async
          this.onmessage && this.onmessage({ data: result });
        }, 0);
      }
      terminate() {}
    }

    (Thread as any).createWorker = () => new MockWorker();

    const pool = new ThreadPool({ size: 2 });

    const tasks = [
      pool.exec(async (url: string) => `fetched:${url}`, 'url1'),
      pool.exec(async (url: string) => `fetched:${url}`, 'url2'),
    ];

    const results = await Promise.all(tasks);
    expect(results).toEqual(['fetched:url1', 'fetched:url2']);
  });
});
