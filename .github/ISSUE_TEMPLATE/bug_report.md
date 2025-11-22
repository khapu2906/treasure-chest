---
name: Bug report
about: Please use this template to report issues related to the DI container, such
  as incorrect resolutions, lifecycle bugs, performance anomalies, or unexpected behavior.
title: "[BUG]"
labels: bug
assignees: khapu2906

---

### **Describe the Issue**

Describe clearly what went wrong. Is it related to:

* Service resolution
* Scoped / Singleton / Transient lifecycle behavior
* Conditional bindings
* Child container inheritance
* Performance issues
* Circular dependency handling
* Lazy or factory resolution

Provide as much detail as possible.

---

### **🔄 Steps to Reproduce**

Provide exact steps to reproduce the issue:

1. Register services using: `container.register(...)`, `singleton(...)`, etc.
2. Resolve service using: `container.resolve(...)` or `scope.resolve(...)`.
3. Run a specific scenario (e.g., creating child scope, lazy access, contextual resolve).
4. Observe incorrect behavior or error.

Include a minimal code sample if possible.

```js
const container = createContainer();

container.register('A', ...);
container.register('B', ...);

const result = container.resolve('A');
```

---

### **Expected Behavior**

Describe what you expected the DI container to do:

* Resolve a specific implementation
* Respect lifecycle rules (singleton/scoped/transient)
* Execute conditions correctly
* Maintain performance consistency
* Avoid circular dependency crashes

---

### **Logs / Error Messages**

If available, include:

* Stack traces
* Console output
* Benchmark anomalies
* Incorrect resolution results

---

### **Runtime Environment**

* **Node.js Version:** (e.g. 18.17.0)
* **Package Version:** (e.g. 1.2.0)
* **Environment:** (development / production)
* **Package Manager:** npm / pnpm / yarn

---

### **If used in Browser**

Fill in only if the bug occurs when bundling for frontend usage:

* **Browser:** (Chrome, Firefox, Edge...)
* **Bundler:** Vite, Webpack, Rollup...
* **Framework:** React, Vue, Svelte...

---

### **📝 Additional Context**

Add any other useful context such as:

* Dependency graph shape
* Complex registration patterns
* Code splitting behavior
* Interaction with frameworks or runtime environments

---

Thank you for helping improve the DI container!
