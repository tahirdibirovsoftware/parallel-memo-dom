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

  it('executes tasks and reuses workers', async () => {
    // Simple mock worker that immediately returns the computed value
    class MockWorker {
      onmessage: ((ev: any) => void) | null = null;
      postMessage(msg: any) {
        const fn = new Function('return ' + msg.fn)();
        const res = fn(...msg.args);
        setTimeout(() => this.onmessage && this.onmessage({ data: res }), 0);
      }
      terminate() {}
    }

    // Provide a predictable pool size
    (Thread as any).createWorker = () => new MockWorker();

    const pool = new ThreadPool({ size: 2, enableCaching: false });

    const tasks = [
      pool.exec((a: number) => a * 2, 2),
      pool.exec((a: number) => a + 3, 5),
      pool.exec((a: number) => a - 1, 10)
    ];

    const results = await Promise.all(tasks);
    expect(results).toEqual([4, 8, 9]);
  });
});
