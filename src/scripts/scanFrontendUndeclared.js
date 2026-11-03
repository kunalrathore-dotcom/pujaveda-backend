import fs from "fs";
import path from "path";

function getAllFiles(dir, exts = [".jsx", ".js"]) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      if (item !== "node_modules" && item !== "dist") {
        files = files.concat(getAllFiles(fullPath, exts));
      }
    } else if (exts.includes(path.extname(item))) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getAllFiles("../user/src");
let issuesFound = 0;

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  const regex = /<([A-Z][a-zA-Z0-9_]*)/g;
  const tags = new Set();
  let match;
  while ((match = regex.exec(code)) !== null) {
    tags.add(match[1]);
  }

  const header = code.slice(0, code.indexOf("export default") !== -1 ? code.indexOf("export default") : 1500);
  for (const tag of tags) {
    // If declared in file or imported
    const isDeclared = code.includes(`function ${tag}`) || code.includes(`const ${tag}`) || code.includes(`let ${tag}`) || header.includes(tag);
    if (!isDeclared) {
      console.log(`[ISSUE] ${file}: Tag <${tag}> is NOT imported or declared!`);
      issuesFound++;
    }
  }
}

if (issuesFound === 0) {
  console.log("No missing JSX component imports found across user/src!");
} else {
  console.log(`Total missing imports detected: ${issuesFound}`);
}
