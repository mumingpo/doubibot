import json from "@rollup/plugin-json";

/**
 * @type {import('rollup').RollupOptions}
 */
const options = {
    input: "tsc_build/index.js",
    output: {
        file: "build/index.js",
        format: "es",
    },
    plugins: [json()],
};

export default options;
