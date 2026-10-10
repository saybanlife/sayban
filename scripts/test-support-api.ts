/**
 * Support API webhook reachability probe (local only).
 *
 * Usage:
 *   npx --yes tsx scripts/test-support-api.ts
 */
import {
  SUPPORT_WEBHOOK,
  resolveApiUrl,
  resolvePanelSupportWebhookPath,
  resolveUserSupportWebhookPath,
  userSupportMessagesPath
} from "../src/lib/apiRoutes";

const SAMPLE_ID = 1;

const ENDPOINTS = [
  {
    method: "GET",
    path: resolveUserSupportWebhookPath("conversations", "GET")!
  },
  {
    method: "POST",
    path: resolveUserSupportWebhookPath("conversations/create", "POST")!
  },
  {
    method: "GET",
    path: resolveUserSupportWebhookPath(
      userSupportMessagesPath(SAMPLE_ID),
      "GET"
    )!
  },
  {
    method: "POST",
    path: resolveUserSupportWebhookPath(
      userSupportMessagesPath(SAMPLE_ID),
      "POST"
    )!
  },
  {
    method: "POST",
    path: resolveUserSupportWebhookPath(
      `conversations/${SAMPLE_ID}/close`,
      "POST"
    )!
  },
  {
    method: "GET",
    path: resolvePanelSupportWebhookPath("conversations", "GET")!
  },
  {
    method: "GET",
    path: resolvePanelSupportWebhookPath(
      `conversations/${SAMPLE_ID}/messages`,
      "GET"
    )!
  },
  {
    method: "POST",
    path: resolvePanelSupportWebhookPath(
      `conversations/${SAMPLE_ID}/reply`,
      "POST"
    )!
  },
  {
    method: "POST",
    path: resolvePanelSupportWebhookPath(
      `conversations/${SAMPLE_ID}/status`,
      "POST"
    )!
  },
  {
    method: "POST",
    path: resolvePanelSupportWebhookPath(
      `conversations/${SAMPLE_ID}/close`,
      "POST"
    )!
  }
] as const;

async function probe(
  method: string,
  path: string
): Promise<{ ok: boolean; status: number; size: number; note: string }> {
  const url = resolveApiUrl(path);
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body:
        method === "POST"
          ? JSON.stringify(
              path.includes("/reply")
                ? { message: "probe" }
                : path.includes("/status")
                  ? { status: "open" }
                  : { message: "probe" }
            )
          : undefined
    });
    const text = await res.text();
    return {
      ok: res.status > 0,
      status: res.status,
      size: text.length,
      note:
        text.length === 0
          ? "empty body (activate n8n workflows)"
          : text.slice(0, 120)
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      size: 0,
      note: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  console.log("Probing Support webhooks...\n");
  console.log("Canonical paths (SUPPORT_WEBHOOK):");
  console.log(`  user list:    ${SUPPORT_WEBHOOK.userListConversations}`);
  console.log(`  user create:  ${SUPPORT_WEBHOOK.userCreateConversation}`);
  console.log(`  panel list:   ${SUPPORT_WEBHOOK.panelListConversations}\n`);

  let failed = 0;
  for (const ep of ENDPOINTS) {
    const result = await probe(ep.method, ep.path);
    const label = `${ep.method} ${ep.path}`;
    if (!result.ok) {
      failed += 1;
      console.log(`FAIL  ${label} → ${result.note}`);
    } else {
      console.log(
        `OK    ${label} → HTTP ${result.status}, ${result.size} bytes — ${result.note}`
      );
    }
  }
  process.exit(failed ? 1 : 0);
}

main();
