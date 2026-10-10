import fs from "fs";
import path from "path";
import https from "https";

type EnvMap = Record<string, string>;

function loadMysqlEnv(): EnvMap {
  const envPath = path.join(
    process.cwd(),
    ".cursor",
    "sayban-ops",
    "secrets",
    "mysql_sayban.env"
  );
  if (!fs.existsSync(envPath)) {
    throw new Error("mysql_sayban.env missing");
  }
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(l => l && !l.startsWith("#"))
      .map(line => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      })
  );
}

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Run a single SQL statement through phpMyAdmin (local ops fallback when
 * MySQL TCP is denied from public IPs).
 */
export async function runPmaSql(sql: string): Promise<{
  success: boolean;
  text: string;
  body: string;
}> {
  const env = loadMysqlEnv();
  const hostHeader = env.PHPMYADMIN_HOST || "193-141-65-178.persiariver.com";
  const basePath = env.PHPMYADMIN_PATH || "/phpMyAdmin";
  const pmaUser = env.MYSQL_USER || env.USER;
  const pmaPassword = env.MYSQL_PASSWORD || env.PASSWORD;
  const pmaDatabase = env.MYSQL_DATABASE || env.DATABASE;
  const cookieJar = new Map<string, string>();

  const parseSetCookie = (headers: NodeJS.Dict<string | string[]>) => {
    const raw = headers["set-cookie"];
    if (!raw) return;
    for (const c of Array.isArray(raw) ? raw : [raw]) {
      const part = c.split(";")[0];
      const eq = part.indexOf("=");
      if (eq > 0) cookieJar.set(part.slice(0, eq), part.slice(eq + 1));
    }
  };

  const pmaIp = env.PHPMYADMIN_IP || "193.141.65.178";

  const request = (
    method: string,
    reqPath: string,
    body?: string,
    extra: Record<string, string> = {},
    connectHost = hostHeader
  ) =>
    new Promise<{ status: number; body: string }>((resolve, reject) => {
      const headers: Record<string, string> = {
        Host: hostHeader,
        Cookie: Array.from(cookieJar.entries())
          .map(([k, v]) => `${k}=${v}`)
          .join("; "),
        "User-Agent": "sayban-panel-pma/1.0",
        Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
        "X-Requested-With": "XMLHttpRequest",
        ...extra
      };
      if (body) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        headers["Content-Length"] = String(Buffer.byteLength(body));
      }
      const req = https.request(
        {
          method,
          hostname: connectHost,
          servername: hostHeader,
          path: basePath + reqPath,
          headers
        },
        res => {
          parseSetCookie(res.headers);
          const chunks: Buffer[] = [];
          res.on("data", d => chunks.push(d));
          res.on("end", () =>
            resolve({
              status: res.statusCode || 0,
              body: Buffer.concat(chunks).toString("utf8")
            })
          );
        }
      );
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });

  async function requestWithDnsFallback(
    method: string,
    reqPath: string,
    body?: string,
    extra: Record<string, string> = {}
  ) {
    try {
      return await request(method, reqPath, body, extra, hostHeader);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== "EAI_AGAIN" && code !== "ENOTFOUND") throw error;
      return request(method, reqPath, body, extra, pmaIp);
    }
  }

  const extract = (html: string, name: string) => {
    const re = new RegExp(`name="${name}"[^>]*value="([^"]*)"`, "i");
    const m = html.match(re);
    return m ? decodeEntities(m[1]) : null;
  };

  const encode = (obj: Record<string, string>) =>
    Object.entries(obj)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? "")}`)
      .join("&");

  const loginPage = await requestWithDnsFallback("GET", "/index.php?route=/");
  const loginToken = extract(loginPage.body, "token");
  const setSession = extract(loginPage.body, "set_session") || "";
  if (!loginToken) throw new Error("PMA login token missing");

  await requestWithDnsFallback(
    "POST",
    "/index.php?route=/",
    encode({
      set_session: setSession,
      pma_username: pmaUser,
      pma_password: pmaPassword,
      server: "1",
      route: "/",
      token: loginToken
    }),
    { Referer: `https://${hostHeader}${basePath}/index.php?route=/` }
  );

  const sqlPage = await requestWithDnsFallback(
    "GET",
    `/index.php?route=/database/sql&db=${encodeURIComponent(pmaDatabase)}&server=1`
  );
  let sqlToken = extract(sqlPage.body, "token");
  if (!sqlToken) throw new Error("PMA SQL token missing");

  const postSql = async (token: string) =>
    requestWithDnsFallback(
      "POST",
      `/index.php?route=/sql&server=1&db=${encodeURIComponent(pmaDatabase)}`,
      encode({
        db: pmaDatabase,
        server: "1",
        sql_query: sql,
        sql_delimiter: ";",
        show_query: "1",
        fk_checks: "0",
        session_max_rows: "all",
        max_rows: "all",
        // Full cell text — Partial mode truncates long URLs and breaks ~markers~.
        pftext: "F",
        pos: "0",
        ajax_request: "true",
        ajax_page_request: "true",
        token
      }),
      {
        Referer: `https://${hostHeader}${basePath}/index.php?route=/database/sql&db=${encodeURIComponent(pmaDatabase)}&server=1`
      }
    );

  let res = await postSql(sqlToken);
  let parsed: {
    success?: boolean;
    message?: string;
    error?: string;
    redirect_flag?: string;
  } | null = null;
  try {
    const start = res.body.indexOf("{");
    parsed = start >= 0 ? JSON.parse(res.body.slice(start)) : null;
  } catch {
    parsed = null;
  }

  if (parsed?.redirect_flag === "1") {
    const refresh = await requestWithDnsFallback(
      "GET",
      `/index.php?route=/database/sql&db=${encodeURIComponent(pmaDatabase)}&server=1`
    );
    sqlToken = extract(refresh.body, "token") || sqlToken;
    res = await postSql(sqlToken);
    try {
      const start = res.body.indexOf("{");
      parsed = start >= 0 ? JSON.parse(res.body.slice(start)) : null;
    } catch {
      parsed = null;
    }
  }

  const html = String(parsed?.message || parsed?.error || res.body);
  const text = html.slice(0, 120000);
  return {
    success: parsed?.success === true || /executed successfully/i.test(text),
    text,
    body: res.body
  };
}
