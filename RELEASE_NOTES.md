# Release 1.0.2

## Summary
This release fixes a critical issue where the MCP server would fail to start due to a bundling error with `@xenova/transformers`.

## Bug Fixes
- Externalized `@xenova/transformers` in the `esbuild` bundle to avoid path resolution issues in CommonJS.
- Verified MCP connection stability.

# Release 1.0.1

## Summary
This release focuses on optimizing the extension's distribution by bundling dependencies, significantly reducing installation time and complexity. It also includes documentation updates and dependency upgrades.

## Operations
- The extension is now bundled into a single `dist/index.js` file using `esbuild`.
- Pure JavaScript dependencies are now bundled, reducing the `node_modules` footprint for end-users.
- Native dependencies (`@lancedb/lancedb`, `onnxruntime-node`, `sharp`) remain as external dependencies to ensure platform compatibility.

## Changes
- Refactored build process to use `esbuild`.
- Updated documentation with demo GIF and clearer installation steps.
- Bumped `@modelcontextprotocol/sdk` to 1.26.0.
