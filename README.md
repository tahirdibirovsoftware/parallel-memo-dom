# Parallel-Memo-DOM

**Parallel-Memo-DOM** is a lightweight browser library for offloading CPU-intensive or async computations to **Web Workers**, enabling parallel execution and keeping the main thread responsive. It also provides **optional caching** and a **thread pool** for efficient worker management.

---

## Features

- Execute any function in a **Web Worker**, including async operations like `fetch`.
- **ThreadPool** for managing multiple workers and queuing tasks.
- Optional **LRU caching** of function results to avoid redundant work.
- Support for **transferable objects** (`ArrayBuffer`, `MessagePort`) for efficient data transfer.
- **Dynamic thread pool sizing** based on hardware concurrency.
- Fully typed with **TypeScript generics**.
- Robust **error handling**: worker failures are caught and replaced automatically.

---

## Installation

```bash
npm install parallel-memo-dom
```

---

## Usage

### Using `Thread` for single function execution

```ts
import { Thread } from 'parallel-memo-dom';

const fetchAndFilter = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  return data.filter((item: any) => item.completed); // heavy filtering in worker
};

Thread.exec(fetchAndFilter, 'https://jsonplaceholder.typicode.com/todos')
  .then((result) => console.log('Filtered data:', result))
  .catch((err) => console.error('Thread error:', err));
```

> Note: The network request, JSON parsing, and filtering happen inside the worker thread.

---

### Using `ThreadPool` for multiple concurrent tasks

```ts
import { ThreadPool } from 'parallel-memo-dom';

const pool = new ThreadPool({ size: 4 });

const heavyComputation = (a: number, b: number) => {
  let sum = 0;
  for (let i = 0; i < 1e7; i++) sum += Math.sqrt(a * b);
  return sum;
};

Promise.all([pool.exec(heavyComputation, 10, 20), pool.exec(heavyComputation, 5, 15)]).then(
  (results) => console.log('Results:', results),
);
```

---

### Configuring caching

```ts
import { Thread } from 'parallel-memo-dom';

// Enable or disable caching globally
Thread.configure({ enableCaching: true });
```

---

### Using transferable objects

```ts
import { Thread } from 'parallel-memo-dom';

const processBuffer = (buf: ArrayBuffer) => {
  const copy = new ArrayBuffer(buf.byteLength);
  new Uint8Array(copy).set(new Uint8Array(buf));
  return copy; // only the processed buffer is sent back
};

const buffer = new ArrayBuffer(1_000_000);

Thread.exec(processBuffer, buffer).then((result) =>
  console.log('Processed buffer size:', result.byteLength),
);
```

---

## API

### `Thread`

- `static configure(options: { enableCaching?: boolean }): void`  
  Configures caching behavior for function executions.

- `static exec<T extends any[], R>(fn: (...args: T) => R | Promise<R>, ...args: T): Promise<R>`  
  Executes a function in a worker thread and returns a promise with the result. Supports async functions and transferable objects.

---

### `ThreadPool`

- `constructor(options: { size?: number; enableCaching?: boolean })`  
  Creates a pool of workers. Defaults to `navigator.hardwareConcurrency` if size is not specified.

- `exec<T extends any[], R>(fn: (...args: T) => R | Promise<R>, ...args: T): Promise<R>`  
  Executes a task in the pool, queues it if all workers are busy, and resolves with the result.

---

## Notes

- All code inside `Thread` or `ThreadPool` runs in **worker threads**, meaning the main thread remains responsive.
- Supports **async functions**, so heavy computations or I/O operations like `fetch` can safely run in the worker.
- Only **cloneable data** is returned to the main thread (objects, arrays, primitives). Functions, DOM nodes, and certain classes cannot be transferred.

---

## Contributing

Contributions, bug reports, and feature requests are welcome! Please open an issue or submit a pull request.

---

## License

MIT License — see the [LICENSE](./LICENSE) file for details.
