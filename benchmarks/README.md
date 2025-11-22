# Benchmark Suite

Performance benchmarks for Treasure Chest DI Container.

## Running Benchmarks

```bash
npm run benchmark
```

## Results Storage

Benchmark results are automatically saved in three formats:

### 1. Individual Run Files (`results/run-*.json`)

Each benchmark run creates a timestamped JSON file:

```
results/run-2025-11-22-23-09-56.json
```

**Format:**
```json
{
  "timestamp": "2025-11-22T16:09:56.789Z",
  "version": "1.2.0",
  "results": [
    {
      "name": "Register 1000 transient bindings",
      "iterations": 100,
      "total": "16.56",
      "average": "0.165624",
      "opsPerSec": "6038"
    },
    ...
  ]
}
```

### 2. History Log (`results/history.jsonl`)

Append-only log of all benchmark runs in JSONL format (one JSON object per line):

```jsonl
{"timestamp":"2025-11-22T16:08:42.123Z","version":"1.2.0","results":[...]}
{"timestamp":"2025-11-22T16:09:56.789Z","version":"1.2.0","results":[...]}
```

**Usage:**
```bash
# View all runs
cat benchmarks/results/history.jsonl | jq .

# Get latest run
tail -1 benchmarks/results/history.jsonl | jq .

# Compare ops/sec for specific benchmark across runs
cat benchmarks/results/history.jsonl | jq -r '.results[] | select(.name == "Resolve last service (worst case)") | .opsPerSec'
```

### 3. Latest Report (`results/LATEST.md`)

Human-readable markdown report of the most recent run:

```markdown
# Benchmark Results

**Date:** 11/22/2025, 11:09:56 PM
**Version:** 1.2.0

## Summary

| Benchmark | Iterations | Total (ms) | Avg (ms) | Ops/sec |
|-----------|------------|------------|----------|---------|
| ... | ... | ... | ... | ... |
```

## Benchmark Categories

### 1. Binding Registration
- Transient binding registration (1000 bindings)
- Singleton binding registration (1000 bindings)

### 2. Service Resolution
- Best case: First service (index 0)
- Average case: Middle service (index 500)
- Worst case: Last service (index 999)

### 3. Singleton Caching
- First resolve (instance creation)
- Subsequent resolves (cached)

### 4. Conditional Bindings
- Development environment condition
- Production environment condition

### 5. Scoped Resolution
- Create scope → resolve → dispose cycle
- IDisposable auto-cleanup

### 6. Lazy Loading
- Lazy wrapper creation
- Lazy value access (initialization)

### 7. Contextual Bindings
- Context-specific resolution
- Default (non-contextual) resolution

### 8. Child Containers
- Resolve from child (own binding)
- Resolve from child (parent binding)

## Performance Metrics

### Operations Per Second (ops/sec)
Higher is better. Represents how many operations can be performed per second.

### Average Time (ms)
Lower is better. Average time per operation in milliseconds.

### Total Time (ms)
Total time for all iterations.

## Comparing Results

### Compare Two Runs

```bash
# Extract specific benchmark from two different runs
jq -s '.[0].results[] | select(.name == "Resolve last service (worst case)")' results/run-2025-11-22-23-08-42.json
jq -s '.[0].results[] | select(.name == "Resolve last service (worst case)")' results/run-2025-11-22-23-09-56.json
```

### Track Performance Over Time

```bash
# Get ops/sec for "Resolve last service" across all runs
cat results/history.jsonl | while read line; do
  echo $line | jq -r '.timestamp as $ts | .results[] | select(.name == "Resolve last service (worst case)") | "\($ts): \(.opsPerSec) ops/sec"'
done
```

## Expected Performance (v1.2.0)

Based on Map-based implementation:

- **Binding registration**: ~6K ops/sec (1000 bindings)
- **Service resolution (worst case)**: ~3.5M ops/sec ⚡ Map O(1) vs Array O(n)
- **Singleton (cached)**: ~2M ops/sec
- **Lazy value access**: ~25M ops/sec (cached wrapper)
- **Scoped + dispose**: ~500K ops/sec (with cleanup)

## Notes

- Benchmarks run with warm-up iterations to eliminate JIT compilation effects
- All results are averaged over multiple iterations
- Performance may vary based on system specs and load
- Use relative comparisons (before/after) rather than absolute values
