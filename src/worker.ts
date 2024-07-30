self.onmessage = (event) => {
    const { fn, args } = event.data;
    const func = new Function('return ' + fn)();
    const result = func(...args);
    self.postMessage(result);
};
