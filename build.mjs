import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname);

process.chdir(root);

const { build } = await import(root + "/node_modules/vite/dist/node/index.js");
const react = (await import(root + "/node_modules/@vitejs/plugin-react/dist/index.js")).default;
const tw = (await import(root + "/node_modules/@tailwindcss/vite/dist/index.mjs")).default;

await build({
  root,
  configFile: false,
  plugins: [react(), tw()],
  resolve: { alias: { "@": root + "/src" } },
});
