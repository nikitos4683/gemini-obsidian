# Release 1.0.4

## Summary
This release significantly improves the stability and ease of use for the extension. It addresses critical issues with bundling, dependency management, and storage paths.

## Bug Fixes
- **Robust Installation**: The extension now defensively checks for missing native dependencies at startup and provides clear instructions if `npm install` is needed.
- **Connection Stability**: Fixed "Connection closed" errors by properly bundling `@xenova/transformers` with a compatibility shim.
- **Consistent Storage**: The vector database is now stored at `~/.gemini-obsidian-lancedb`, preventing errors when running the extension from different directories.

## Operations
- If you see an error about missing dependencies (`@lancedb/lancedb`), please run `npm install` inside the extension directory.

# Release 1.0.3
...