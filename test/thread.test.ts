/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Thread } from '../src/Thread';

describe('Thread.exec', () => {
  let origCreate: any;

  beforeEach(() => {
    origCreate = (Thread as any).createWorker;
    Thread.configure({ enableCaching: false });
  });

  afterEach(() => {
    (Thread as any).createWorker = origCreate;
    Thread.configure({ enableCaching: true });
  });

  it('sends transferables when ArrayBuffer argument is provided', async () => {
    const buf = new ArrayBuffer(8);
    let captured: any = null;

    class MockWorker {
      onmessage: ((ev: any) => void) | null = null;
      onerror: ((ev: any) => void) | null = null;

      postMessage(msg: any, transferables?: Transferable[]) {
        captured = { msg, transferables };
        setTimeout(async () => {
          try {
            const fn = new Function('return ' + msg.fn)();
            const result = await fn(...msg.args); // supports async functions
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

    const result = await Thread.exec(async (bufArg: ArrayBuffer) => 'ok', buf as any);

    expect(result).toBe('ok');
    expect(captured).not.toBeNull();
    expect(Array.isArray(captured.transferables)).toBe(true);
    expect(captured.transferables[0]).toBe(buf);
  });

  it('caches results when caching is enabled', async () => {
    Thread.configure({ enableCaching: true });
    let workerCalls = 0;

    class MockWorker {
      onmessage: ((ev: any) => void) | null = null;
      postMessage(msg: any) {
        workerCalls++;
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

    const fn = (a: number) => a + 1;
    const r1 = await Thread.exec(fn, 1);
    const r2 = await Thread.exec(fn, 1);

    expect(r1).toBe(2);
    expect(r2).toBe(2);
    expect(workerCalls).toBe(1); // cached, only one worker call
  });
});
