import { cpSync, mkdirSync, rmSync } from "fs";
import path from "path";

const root = path.resolve();
const publicDir = path.join(root, "public");
const dataFile = path.join(root, "data", "trails.json");
const docsDir = path.join(root, "docs");
const docsDataDir = path.join(docsDir, "data");

rmSync(docsDir, { recursive: true, force: true });
cpSync(publicDir, docsDir, { recursive: true });
mkdirSync(docsDataDir, { recursive: true });
cpSync(dataFile, path.join(docsDataDir, "trails.json"));

console.log("Docs folder ready for GitHub Pages.");
