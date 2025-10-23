import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Thread } from '../src/Thread';

describe('Thread.exec', () => {
  let origCreate: any;

  beforeEach(() => {
    origCreate = (Thread as any).createWorker;
    // disable caching by default in tests to avoid cross-test pollution
    Thread.configure({ enableCaching: false });
  });

  afterEach(() => {
    (Thread as any).createWorker = origCreate;
    Thread.configure({ enableCaching: true });
  });

  it('sends transferables when ArrayBuffer arg provided', async () => {
    const buf = new ArrayBuffer(8);
    let captured: any = null;

    class MockWorker {
      onmessage: ((ev: any) => void) | null = null;
      onerror: ((ev: any) => void) | null = null;
      postMessage(msg: any, transferables?: any) {
        captured = { msg, transferables };
        // simulate worker processing and respond
        setTimeout(() => {
          if (this.onmessage) this.onmessage({ data: 'ok' });
        }, 0);
      }
      terminate() {}
    }

    (Thread as any).createWorker = () => new MockWorker();

    const result = await Thread.exec((bufArg: ArrayBuffer) => 'ok', buf as any);

    expect(result).toBe('ok');
    expect(captured).not.toBeNull();
    expect(Array.isArray(captured.transferables)).toBe(true);
    expect(captured.transferables[0]).toBe(buf);
  });

  it('caches results when caching enabled', async () => {
    Thread.configure({ enableCaching: true });
    let workerCreates = 0;

    class MockWorker {
      onmessage: ((ev: any) => void) | null = null;
      postMessage(msg: any) {
        workerCreates++;
        // evaluate function string similarly to the real worker
        const fn = new Function('return ' + msg.fn)();
        const res = fn(...msg.args);
        setTimeout(() => this.onmessage && this.onmessage({ data: res }), 0);
      }
      terminate() {}
    }

    (Thread as any).createWorker = () => new MockWorker();

    const fn = (a: number) => a + 1;
    const r1 = await Thread.exec(fn, 1);
    const r2 = await Thread.exec(fn, 1);

    expect(r1).toBe(2);
    expect(r2).toBe(2);
    // ensure worker used only once due to caching
    expect(workerCreates).toBe(1);
  });
});
