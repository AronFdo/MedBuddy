# Step-by-Step Instructions to Fix npm Install Error

## Problem
The `package-lock.json` file was created with React 19, but we've downgraded to React 18. The lockfile is now out of sync with `package.json`.

## Solution Steps

### Step 1: Navigate to the frontend directory
```powershell
cd frontend
```

### Step 2: Delete the old package-lock.json file
```powershell
Remove-Item package-lock.json
```

### Step 3: Delete node_modules folder (if it exists)
```powershell
Remove-Item -Recurse -Force node_modules
```

### Step 4: Clear npm cache (optional but recommended)
```powershell
npm cache clean --force
```

### Step 5: Install dependencies fresh
```powershell
npm install
```

### Step 6: Verify installation
After installation completes, you should see:
- A new `package-lock.json` file created
- A `node_modules` folder with all dependencies
- No error messages

## Alternative: If Step 5 still fails

If `npm install` still shows errors, try using the legacy peer deps flag:

```powershell
npm install --legacy-peer-deps
```

This will install dependencies while ignoring peer dependency conflicts (though we've already fixed the main conflict).

## What We Fixed
- ✅ Downgraded `react` from 19.1.0 to 18.3.1
- ✅ Downgraded `react-dom` from 19.1.0 to 18.3.1
- ✅ Downgraded `@types/react` from ~19.1.10 to ~18.3.12
- ✅ Downgraded `react-test-renderer` from 19.0.0 to 18.3.1

These versions are now compatible with React Native 0.75.5.


