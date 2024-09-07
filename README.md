# Parallel-Memo-DOM

Parallel-Memo-DOM is a powerful browser library for offloading heavy computations to web workers, enabling parallel execution and improving application performance. It includes advanced features such as memoization, dynamic thread pool management, and improved type safety.

## Features

- Parallel execution of functions using Web Workers
- Thread pool management for efficient resource utilization
- LRU (Least Recently Used) caching mechanism for improved performance
- Support for transferable objects for efficient data transfer
- Dynamic thread pool sizing based on available hardware
- Improved type safety with TypeScript generics
- Error handling and recovery for worker failures

## Installation

```bash
npm install parallel-memo-dom
```

## Usage

### Basic Usage with Thread

```typescript
import { Thread } from 'parallel-memo-dom';

const someHeavyComputation = (a: number, b: number): number => {
    // Simulate heavy computation
    let result = 0;
    for (let i = 0; i < 1000000000; i++) {
        result += Math.sqrt(a * b);
    }
    return result;
};

(async () => {
    try {
        const result = await Thread.exec(someHeavyComputation, 10, 20);
        console.log('Computation result:', result);
    } catch (error) {
        console.error('Error in thread execution:', error);
    }
})();
```

### Using Thread Pool

```typescript
import { ThreadPool } from 'parallel-memo-dom';

const pool = new ThreadPool({ size: 4 });

const someHeavyComputation = (a: number, b: number): number => {
    // Simulate heavy computation
    let result = 0;
    for (let i = 0; i < 1000000000; i++) {
        result += Math.sqrt(a * b);
    }
    return result;
};

(async () => {
    try {
        const result = await pool.exec(someHeavyComputation, 10, 20);
        console.log('Computation result:', result);
    } catch (error) {
        console.error('Error in thread execution:', error);
    }
})();
```

### Configuring Caching

```typescript
import { Thread } from 'parallel-memo-dom';

// Disable caching if needed
Thread.configure({ enableCaching: false });

// Rest of the code remains the same
```

### Using with Transferable Objects

```typescript
import { Thread } from 'parallel-memo-dom';

const processBigData = (data: ArrayBuffer): ArrayBuffer => {
    // Process the data
    const result = new ArrayBuffer(data.byteLength);
    new Uint8Array(result).set(new Uint8Array(data));
    return result;
};

const bigData = new ArrayBuffer(1000000);

(async () => {
    try {
        const result = await Thread.exec(processBigData, bigData);
        console.log('Processed data size:', result.byteLength);
    } catch (error) {
        console.error('Error in thread execution:', error);
    }
})();
```

## API

### `Thread`

- `static configure(options: { enableCaching?: boolean }): void`: Configures the caching behavior of the library.
- `static exec<T extends any[], R>(fn: (...args: T) => R, ...args: T): Promise<R>`: Executes the provided function in a web worker with the given arguments and returns a promise that resolves with the result.

### `ThreadPool`

- `constructor(options: { size: number, enableCaching?: boolean })`: Creates a new thread pool with the specified size and optional caching.
- `exec<T extends any[], R>(fn: (...args: T) => R, ...args: T): Promise<R>`: Executes the provided function in a web worker from the pool with the given arguments and returns a promise that resolves with the result.

## Advanced Features

### Dynamic Thread Pool Sizing

The thread pool automatically adjusts its size based on the available hardware concurrency. This ensures optimal performance across different devices.

### LRU Caching

The library uses an LRU (Least Recently Used) caching mechanism to store results of previously executed functions. This can significantly improve performance for repeated calls with the same arguments.

### Improved Type Safety

The library now uses TypeScript generics for better type inference and safety when working with different function signatures.

## Vite Configuration

If you are using Vite and encounter issues with the `parallel-memo-dom` dependency, you can exclude it from the dependency optimization process by adding the following configuration to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['parallel-memo-dom']
  }
});
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.