import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve("node_modules/sql.js/dist/sql-wasm.wasm");
const target = resolve("public/sql-wasm.wasm");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`Copied ${source} -> ${target}`);
