self.onmessage = (event) => {
    const { fn, args } = event.data;
    const func = new Function('return ' + fn)();
    const result = func(...args);
    const transferables = result instanceof ArrayBuffer ? [result] : undefined;
    self.postMessage(result, { transfer: transferables });
};