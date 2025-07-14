# Publishing Guide

## 🚀 Publishing Process

This package uses **GitHub Actions as the sole publishing mechanism** to ensure consistency and prevent accidental publishes.

### How to Publish a New Version

1. **Use the Version Workflow** (Recommended)
   - Go to Actions → Version Management
   - Click "Run workflow"
   - Select version type (patch/minor/major)
   - This creates a PR with version bump

2. **Manual Version Bump**
   - Update version in `package.json`
   - Update `CHANGELOG.md`
   - Commit and push to main

3. **Automatic Publishing**
   - When changes to package files are pushed to main
   - GitHub Actions automatically:
     - Runs tests
     - Builds the package
     - Publishes to GitHub Packages (if version is new)

### Publishing Safeguards

- ❌ **Manual publishing is blocked** - `npm publish` will fail locally
- ✅ **Only CI can publish** - Enforced via `prepublishOnly` script
- 🔒 **Version checking** - Prevents duplicate version publishes
- 🧪 **Tests must pass** - Publishing fails if tests fail

### Workflow Triggers

The publish workflow runs when:
- Push to `main` branch
- Changes to: `package.json`, `src/**`, `document/**`, `agent/**`, `cli/**`, `index.ts`, `types.ts`
- Manual workflow dispatch

### Environment

- Uses `NODE_AUTH_TOKEN` from `GITHUB_TOKEN` (automatic)
- Sets `CI=true` to bypass publish restrictions
- Publishes to `@idyllic-labs` scope on GitHub Packages