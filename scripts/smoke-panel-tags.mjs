/**
 * Final API smoke for panel tags add/delete.
 * Run: node scripts/smoke-panel-tags.mjs
 */
const BASE = "https://sayban.darkube.ir/webhook";

async function json(path, opts) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const stamp = Date.now();
const name = `تست تگ ${stamp}`;
const slug = `test-tag-${stamp}`;

const before = await json("/panel/tags");
if (!before.data?.success) throw new Error("list failed before");
const beforeCount = before.data.result.length;

const add = await json("/panel/tags/add", {
  method: "POST",
  body: JSON.stringify({ name, slug, description: "smoke" })
});
if (!add.data?.success || !add.data?.result?.id) {
  throw new Error(`add failed: ${JSON.stringify(add.data)}`);
}
const id = add.data.result.id;

const listed = await json("/panel/tags");
const found = (listed.data.result || []).find(t => t.id === id);
if (!found || found.name !== name) {
  throw new Error("added tag not listed");
}

const del = await json("/panel/tags/delete", {
  method: "POST",
  body: JSON.stringify({ id })
});
if (!del.data?.success) throw new Error(`delete failed: ${JSON.stringify(del.data)}`);

const after = await json("/panel/tags");
const still = (after.data.result || []).find(t => t.id === id);
if (still) throw new Error("tag still present after delete");

console.log(
  JSON.stringify(
    {
      ok: true,
      beforeCount,
      afterCount: after.data.result.length,
      addedId: id,
      name,
      slug
    },
    null,
    2
  )
);
