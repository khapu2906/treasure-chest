---
name: Feature request
about: Use this template to propose new features, enhancements, or improvements for
  the Dependency Injection container.
title: ''
labels: enhancement
assignees: khapu2906

---

### **Is your feature request related to a problem? Please describe.**

Explain clearly what problem you're facing or what limitation you've encountered.

Examples:

* "It's difficult to debug resolution order in complex graphs."
* "Conditional bindings don't cover my multi-environment use case."
* "Scoped containers behave differently when used in async contexts."

---

### **Describe the solution you'd like**

What would the ideal solution or feature look like?

Examples:

* "Add lifecycle hooks like `onResolved` or `onCreated`."
* "Support for async factory dependencies without manual wrappers."
* "Expose a debugging API to inspect the dependency graph."

---

### **Describe alternatives you've considered**

Mention any workarounds or custom implementations you've tried.

Examples:

* "I manually track resolutions using a wrapper factory, but it’s messy."
* "I used a conditional factory, but it becomes complex with nested scopes."
* "I implemented my own tiny wrapper but it's not reusable across the library."

---

### **Additional context**

Add any other useful information:

* Code examples
* Diagrams of dependency chains
* Performance concerns
* Screenshots (if UI-related or devtools output)

```js
container.register('ServiceA', { useClass: A });
```

---

Thanks for contributing ideas to improve the DI container!
