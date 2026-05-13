#!/usr/bin/env node
const readline = require("readline");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = process.env.AVA_CYBER_ROOT || path.resolve(__dirname, "..");
const TEXT_EXTENSIONS = new Set([".js",".ts",".tsx",".jsx",".json",".md",".txt",".sql",".css",".mjs",".cjs",".sh",".conf",".yaml",".yml"]);

function send(obj) { process.stdout.write(JSON.stringify(obj) + "\n"); }
function error(id, code, message) { send({ jsonrpc: "2.0", id, error: { code, message } }); }
function ok(id, result) { send({ jsonrpc: "2.0", id, result }); }
function safePath(rel) {
  const abs = path.resolve(PROJECT_ROOT, rel);
  if (!abs.startsWith(PROJECT_ROOT)) throw new Error("Path outside project root");
  return abs;
}

function read_file({ file_path }) {
  const abs = safePath(file_path);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${file_path}`);
  const content = fs.readFileSync(abs, "utf8");
  return { file_path, content, size: content.length };
}
function write_file({ file_path, content }) {
  const abs = safePath(file_path);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  return { file_path, bytes_written: Buffer.byteLength(content, "utf8") };
}
function list_directory({ dir_path = ".", max_depth = 4 }) {
  const abs = safePath(dir_path);
  if (!fs.existsSync(abs)) throw new Error(`Directory not found: ${dir_path}`);
  const IGNORE = new Set(["node_modules",".git",".next","dist","build"]);
  function walk(current, depth) {
    if (depth > max_depth) return [];
    const entries = fs.readdirSync(current, { withFileTypes: true });
    const result = [];
    for (const e of entries) {
      if (IGNORE.has(e.name)) continue;
      const rel = path.relative(PROJECT_ROOT, path.join(current, e.name));
      if (e.isDirectory()) { result.push({ type: "dir", path: rel }); result.push(...walk(path.join(current, e.name), depth + 1)); }
      else { result.push({ type: "file", path: rel, size: fs.statSync(path.join(current, e.name)).size }); }
    }
    return result;
  }
  return { root: dir_path, entries: walk(abs, 0) };
}
function search_files({ query, dir_path = ".", case_sensitive = false, max_results = 50 }) {
  const abs = safePath(dir_path);
  const IGNORE = new Set(["node_modules",".git",".next","dist","build"]);
  const regex = new RegExp(query, case_sensitive ? "g" : "gi");
  const results = [];
  function walk(current) {
    if (results.length >= max_results) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      if (results.length >= max_results) break;
      if (IGNORE.has(e.name)) continue;
      const full = path.join(current, e.name);
      if (e.isDirectory()) { walk(full); }
      else {
        if (!TEXT_EXTENSIONS.has(path.extname(e.name))) continue;
        let content; try { content = fs.readFileSync(full, "utf8"); } catch { continue; }
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) { results.push({ file: path.relative(PROJECT_ROOT, full), line: i + 1, text: lines[i].trim().slice(0, 200) }); regex.lastIndex = 0; if (results.length >= max_results) break; }
        }
      }
    }
  }
  walk(abs);
  return { query, results, truncated: results.length >= max_results };
}
function get_project_info() {
  return { project_name: "ava-cyber", root: PROJECT_ROOT, structure: { "backend/": "Node.js + Express REST API", "frontend/": "Next.js 14 + TypeScript + Tailwind", "landing/": "Separate Next.js landing page", "nginx/": "Nginx vhost configs", "scripts/": "Deploy scripts" } };
}

const TOOLS = {
  read_file: { fn: read_file, description: "Read any file in the project.", inputSchema: { type: "object", properties: { file_path: { type: "string" } }, required: ["file_path"] } },
  write_file: { fn: write_file, description: "Create or overwrite a file.", inputSchema: { type: "object", properties: { file_path: { type: "string" }, content: { type: "string" } }, required: ["file_path", "content"] } },
  list_directory: { fn: list_directory, description: "List directory tree.", inputSchema: { type: "object", properties: { dir_path: { type: "string" }, max_depth: { type: "number" } } } },
  search_files: { fn: search_files, description: "Search across all files.", inputSchema: { type: "object", properties: { query: { type: "string" }, dir_path: { type: "string" }, case_sensitive: { type: "boolean" }, max_results: { type: "number" } }, required: ["query"] } },
  get_project_info: { fn: get_project_info, description: "Get project overview.", inputSchema: { type: "object", properties: {} } },
};

function dispatch(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") return ok(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "ava-cyber-mcp", version: "1.0.0" } });
  if (method === "tools/list") return ok(id, { tools: Object.entries(TOOLS).map(([name, def]) => ({ name, description: def.description, inputSchema: def.inputSchema })) });
  if (method === "tools/call") {
    const { name, arguments: args } = params;
    const tool = TOOLS[name];
    if (!tool) return error(id, -32601, `Unknown tool: ${name}`);
    try { return ok(id, { content: [{ type: "text", text: JSON.stringify(tool.fn(args || {}), null, 2) }] }); }
    catch (e) { return error(id, -32000, e.message); }
  }
  if (id !== undefined) error(id, -32601, `Method not found: ${method}`);
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line) => {
  line = line.trim(); if (!line) return;
  try { dispatch(JSON.parse(line)); }
  catch { send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
});
