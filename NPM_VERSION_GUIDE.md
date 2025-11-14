# npm Version Management Guide

## ⚠️ The Problem: Different npm Versions

**Short answer: No, different npm versions between team members can cause problems.**

### Issues with Different npm Versions:

1. **package-lock.json Conflicts**
   - Different npm versions generate different lock file formats
   - Can cause merge conflicts in Git
   - May install different dependency versions

2. **Dependency Resolution Differences**
   - npm 7+ uses different resolution algorithms than npm 6
   - Can result in different dependency trees
   - May cause "works on my machine" issues

3. **Installation Inconsistencies**
   - Different npm versions may handle peer dependencies differently
   - Can lead to missing or incorrect packages

## ✅ Solution: Version Standardization

We've set up several mechanisms to ensure consistency:

### 1. Engine Requirements in package.json

Your `backend/package.json` already specifies:
```json
"engines": {
  "node": ">=22.0.0",
  "npm": ">=10.0.0"
}
```

This tells developers what versions are required, but **doesn't enforce them**.

### 2. `.npmrc` File (NEW)

Created `.npmrc` in the project root with:
```
engine-strict=true
```

This **enforces** the engine requirements - npm will refuse to install if versions don't match.

### 3. `.nvmrc` File (NEW)

Created `.nvmrc` specifying Node.js 22. Team members using nvm can run:
```bash
nvm use
```
This automatically switches to the correct Node.js version (which comes with a compatible npm version).

### 4. Version Check Script (NEW)

Created `backend/scripts/check-versions.js` that:
- Automatically runs before `npm install` (via `preinstall` hook)
- Checks Node.js and npm versions
- Exits with error if versions don't match requirements
- Provides helpful error messages

## 🚀 How Team Members Should Set Up

### For New Team Members:

1. **Install Node.js 22** (which includes npm 10+):
   ```bash
   # Using nvm (recommended)
   nvm install 22
   nvm use 22
   
   # Or download from nodejs.org
   ```

2. **Verify versions**:
   ```bash
   node --version  # Should be v22.x.x
   npm --version   # Should be 10.x.x
   ```

3. **Clone and install**:
   ```bash
   git clone <repo>
   cd MedBuddy
   cd backend
   npm install  # Will automatically check versions
   ```

### If Version Check Fails:

The preinstall script will show:
```
✗ Node.js version: v20.15.0 (required: >=22.0.0)
✗ npm version: 9.5.0 (required: >=10.0.0)
```

**Fix it:**
```bash
# Using nvm
nvm install 22
nvm use 22

# Or update npm separately
npm install -g npm@latest
```

## 📋 Version Requirements Summary

| Component | Required Version | Your Current Version |
|-----------|-----------------|---------------------|
| Node.js   | >=22.0.0        | v22.20.0 ✅         |
| npm       | >=10.0.0        | 10.2.5 ✅           |

## 🔧 Manual Version Check

You can manually check versions anytime:
```bash
cd MedBuddy/backend
npm run check-versions
```

## ⚙️ Configuration Files Created

1. **`.npmrc`** (project root)
   - Enforces engine-strict mode
   - Ensures consistent npm behavior

2. **`.nvmrc`** (project root)
   - Specifies Node.js version 22
   - Works with nvm, fnm, and other Node version managers

3. **`backend/scripts/check-versions.js`**
   - Automated version checking
   - Runs before npm install

## 🎯 Best Practices

1. **Always commit `package-lock.json`**
   - This ensures everyone gets the same dependency versions
   - Don't add it to `.gitignore`

2. **Use the same Node.js version**
   - Node.js comes with a bundled npm version
   - Using the same Node version = same npm version

3. **Run `npm install` after pulling changes**
   - Lock file may have been updated
   - Ensures you have the latest dependencies

4. **If you see lock file conflicts**:
   ```bash
   # Delete your local lock file and node_modules
   rm package-lock.json
   rm -rf node_modules
   
   # Pull latest changes
   git pull
   
   # Reinstall
   npm install
   ```

## 🆘 Troubleshooting

### "engine-strict" error during install

**Error**: `npm ERR! code ENOTSUP npm ERR! notsup Unsupported engine`

**Solution**: Update your Node.js/npm to meet requirements:
```bash
nvm install 22
nvm use 22
```

### Lock file merge conflicts

**Solution**: 
1. Keep the version from the branch you're merging into
2. Delete your local `package-lock.json` and `node_modules`
3. Run `npm install` to regenerate

### Version check script fails

**Solution**: Make sure the script is executable and Node.js can find it:
```bash
chmod +x backend/scripts/check-versions.js
node backend/scripts/check-versions.js
```

## 📚 Additional Resources

- [npm engines documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#engines)
- [nvm documentation](https://github.com/nvm-sh/nvm)
- [package-lock.json explained](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json)

---

**Remember**: Consistency is key! All team members should use the same Node.js and npm versions to avoid "works on my machine" issues.




