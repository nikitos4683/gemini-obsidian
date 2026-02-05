# Release 1.0.4

## Summary
This release makes the database storage more robust by using an absolute path in the user's home directory.

## Bug Fixes
- Fixed `ENOENT` error that occurred when the current working directory was deleted (e.g., during a build) by moving the LanceDB storage to `~/.gemini-obsidian-lancedb`.

# Release 1.0.3
...
