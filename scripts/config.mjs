// Plasmo needs literal content-script matches; generate them from maps.ts.
import fs from "node:fs"
import ts from "typescript"
const source = ts.transpile(fs.readFileSync("maps.ts", "utf8"), { module: ts.ModuleKind.CommonJS })
const exports = {}
new Function("exports", source)(exports)
const matches = exports.MAPS.flatMap(m => m.hosts.flatMap(h => [m.path, ...(m.frames || [])].map(p => `https://${h}${p}*`)))
const bridgeMatches = exports.MAPS.filter(m => m.id === "vmaps" || m.id === "waze").flatMap(m => m.hosts.flatMap(h => (m.frames || [m.path]).map(p => `https://${h}${p}*`)))
for (const file of ["content.ts", "contents/page.ts"]) {
  const text = fs.readFileSync(file, "utf8")
  fs.writeFileSync(file, text.replace(/matches: \[[^\]]*\]/, `matches: ${JSON.stringify(file === "contents/page.ts" ? (bridgeMatches.length ? bridgeMatches : matches) : matches)}`))
}
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))
pkg.manifest.host_permissions = matches
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n")
