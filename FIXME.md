# Problems

## @rollup/plugin-typescript

### Problem

`@rollup/plugin-typescript` does not seem to work.
Plugin can be successfully registered in `rollup.config.js`,
but `rollup -c` still complains that it cannot read typescript
and needs a plugin to do so.

### Current Workaround

1. Modified `tsconfig.json` dumping javascript into intermediate
   `/tsc_build/` directory and declarations into `/build/`

2. Modified `rollup.config.js` compiling `/tsc_build/index.js`
   into `/build/index.js`

3. Modified `package.json` script `build` to run `tsc && rollup -c`
