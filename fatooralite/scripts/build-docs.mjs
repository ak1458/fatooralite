#!/usr/bin/env node
/**
 * Build the Fatoora Lite Pro documentation portal.
 *
 *   cd fatooralite && npm run docs:build
 *
 * Reads every markdown file in ../docs, renders it into a styled, navigable
 * static site at ../docs/portal/ (one HTML page per document + an index).
 * Self-contained output: inline CSS, no external requests, works from file://.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const here = dirname(fileURLToPath(import.meta.url));
const docsDir = join(here, "..", "..", "docs");
const outDir = join(docsDir, "portal");
mkdirSync(outDir, { recursive: true });

/** Ordered document set: [file, short title, nav group]. */
const DOCS = [
  ["README.md", "Start Here", "Overview"],
  ["00-tldr.md", "TL;DR", "Overview"],
  ["01-prd.md", "PRD", "Product"],
  ["02-architecture.md", "Architecture", "Product"],
  ["03-user-flows.md", "User Flows", "Product"],
  ["04-functional-spec.md", "Functional Spec", "Product"],
  ["05-features.md", "Feature Docs", "Product"],
  ["06-gap-analysis.md", "Gap Analysis", "History"],
  ["07-roadmap.md", "Roadmap", "History"],
  ["08-remaining-work.md", "Final Build Plan", "History"],
  ["09-deployment.md", "Deployment Guide", "Operations"],
  ["10-ai-architecture.md", "AI Architecture", "Operations"],
];

const pageName = (file) =>
  file === "README.md" ? "index.html" : basename(file, ".md") + ".html";

/** Rewrite ./xx.md links to portal pages. */
const renderer = new marked.Renderer();
const origLink = renderer.link.bind(renderer);
renderer.link = (token) => {
  const href = typeof token === "object" ? token.href : token;
  if (typeof token === "object" && token.href && /^\.\/[\w-]+\.md$/.test(token.href)) {
    token.href = pageName(token.href.slice(2));
  } else if (typeof href === "string" && /^\.\/[\w-]+\.md$/.test(href)) {
    // older marked signature (href, title, text)
    return origLink(pageName(href.slice(2)), arguments[1], arguments[2]);
  }
  return origLink(token);
};
marked.setOptions({ renderer, gfm: true });

const CSS = `
:root{
  --bg:#0b1210;--s1:#101a17;--s2:#16211d;--bd:#223129;--tx:#e8f0ec;--t2:#b7c6bf;
  --t3:#7d8f86;--ac:#34d399;--acs:rgba(52,211,153,.12);--code:#0d1614;
  --sans:ui-sans-serif,system-ui,"Segoe UI",Roboto,Arial,sans-serif;
  --mono:ui-monospace,"Cascadia Code",Consolas,monospace;
}
@media (prefers-color-scheme: light){
  :root{--bg:#f6f8f7;--s1:#ffffff;--s2:#eef2f0;--bd:#d9e2dd;--tx:#15211c;--t2:#3d4d46;
  --t3:#6b7c74;--ac:#0d9668;--acs:rgba(13,150,104,.1);--code:#f0f4f2;}
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.65 var(--sans)}
.layout{display:flex;min-height:100vh}
nav{width:260px;flex:none;background:var(--s1);border-inline-end:1px solid var(--bd);
  padding:22px 16px;position:sticky;top:0;height:100vh;overflow-y:auto}
nav .brand{font-weight:800;font-size:16px;margin-bottom:4px}
nav .brand span{color:var(--ac)}
nav .sub{font-size:11.5px;color:var(--t3);margin-bottom:18px}
nav .group{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:var(--t3);margin:16px 8px 6px}
nav a{display:block;padding:7px 10px;border-radius:8px;color:var(--t2);text-decoration:none;
  font-size:13px;font-weight:500}
nav a:hover{background:var(--s2);color:var(--tx)}
nav a.active{background:var(--acs);color:var(--ac);font-weight:700}
main{flex:1;min-width:0;padding:40px 48px 80px;max-width:960px}
main h1{font-size:28px;line-height:1.25;margin:0 0 4px;letter-spacing:-.02em}
main h2{font-size:20px;margin:34px 0 10px;padding-top:14px;border-top:1px solid var(--bd)}
main h3{font-size:16px;margin:24px 0 8px}
main a{color:var(--ac)}
main p, main li{color:var(--t2)}
main strong{color:var(--tx)}
main code{font-family:var(--mono);font-size:12.5px;background:var(--code);
  border:1px solid var(--bd);border-radius:5px;padding:1px 5px}
main pre{background:var(--code);border:1px solid var(--bd);border-radius:10px;
  padding:14px 16px;overflow-x:auto}
main pre code{border:none;background:transparent;padding:0;font-size:12.5px;line-height:1.6}
main table{border-collapse:collapse;width:100%;margin:14px 0;font-size:13.5px;display:block;
  overflow-x:auto}
main th,main td{border:1px solid var(--bd);padding:8px 12px;text-align:left;vertical-align:top}
main th{background:var(--s2);font-weight:700}
main blockquote{margin:14px 0;padding:10px 16px;border-inline-start:3px solid var(--ac);
  background:var(--acs);border-radius:0 10px 10px 0}
main blockquote p{margin:4px 0}
main hr{border:none;border-top:1px solid var(--bd);margin:28px 0}
main input[type=checkbox]{accent-color:var(--ac)}
.footer{margin-top:56px;padding-top:16px;border-top:1px solid var(--bd);
  font-size:12px;color:var(--t3)}
@media(max-width:860px){.layout{flex-direction:column}nav{width:auto;height:auto;position:static}}
`;

function nav(activeFile) {
  let html = `<div class="brand">Fatoora<span>Lite</span> Docs</div>
<div class="sub">ZATCA Phase-2 e-invoicing SaaS</div>`;
  let group = null;
  for (const [file, title, g] of DOCS) {
    if (g !== group) {
      group = g;
      html += `<div class="group">${g}</div>`;
    }
    const cls = file === activeFile ? ' class="active"' : "";
    html += `<a href="${pageName(file)}"${cls}>${title}</a>`;
  }
  return html;
}

const built = new Date().toISOString().slice(0, 10);
for (const [file, title] of DOCS) {
  const md = readFileSync(join(docsDir, file), "utf8");
  const body = marked.parse(md);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Fatoora Lite Pro Docs</title>
<style>${CSS}</style>
</head>
<body>
<div class="layout">
<nav>${nav(file)}</nav>
<main>
${body}
<div class="footer">Fatoora Lite Pro documentation · built ${built} · source: docs/${file}</div>
</main>
</div>
</body>
</html>`;
  writeFileSync(join(outDir, pageName(file)), html);
  console.log(`built portal/${pageName(file)}`);
}
console.log(`\nPortal ready: docs/portal/index.html (${DOCS.length} pages)`);
