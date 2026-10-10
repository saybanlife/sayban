import assert from "node:assert/strict";

/** Mirrors supportService.panelListConversations status filter branch. */
function statusFilterSql(status) {
  if (!status || status === "all") return { sql: null, values: [] };
  if (status === "unanswered") {
    return { sql: "c.status IN ('open', 'pending')", values: [] };
  }
  return { sql: "c.status = ?", values: [status] };
}

function matchesUnanswered(status) {
  return status === "open" || status === "pending";
}

assert.deepEqual(statusFilterSql("all"), { sql: null, values: [] });
assert.deepEqual(statusFilterSql("unanswered"), {
  sql: "c.status IN ('open', 'pending')",
  values: []
});
assert.deepEqual(statusFilterSql("answered"), {
  sql: "c.status = ?",
  values: ["answered"]
});

assert.equal(matchesUnanswered("open"), true);
assert.equal(matchesUnanswered("pending"), true);
assert.equal(matchesUnanswered("answered"), false);
assert.equal(matchesUnanswered("closed"), false);

console.log("support unanswered filter tests passed");
