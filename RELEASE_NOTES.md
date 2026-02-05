# Release 1.0.6

## Summary
Fixed a critical bug where the extension would crash before it could report missing dependencies.

## Bug Fixes
- **Startup:** Moved the dependency check to the very top of the bundle. This ensures that if `@lancedb/lancedb` or `onnxruntime-node` are missing, the extension prints a clear error message instead of a stack trace.

# Release 1.0.5
...
