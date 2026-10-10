import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

async function importTypeScript(path) {
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeNext
    }
  }).outputText;
  const depSource = fs.readFileSync(
    new URL("../components/home/currentAddressModel.ts", import.meta.url),
    "utf8"
  );
  const depOut = ts.transpileModule(depSource, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const depUrl = `data:text/javascript;base64,${Buffer.from(depOut).toString("base64")}`;
  const linked = output.replace(
    /from\s+["']\.\.\/home\/currentAddressModel["']/g,
    `from "${depUrl}"`
  );
  return import(
    `data:text/javascript;base64,${Buffer.from(linked).toString("base64")}`
  );
}

const { getGoogleMapsUrl } = await importTypeScript(
  "../components/reservations/reservationMapLinks.ts"
);

assert.equal(
  getGoogleMapsUrl({ latitude: 35.6892, longitude: 51.389 }),
  "https://www.google.com/maps?q=35.6892,51.389"
);

assert.equal(
  getGoogleMapsUrl({
    city: "تهران",
    address: "ولیعصر"
  }),
  "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("تهران، ولیعصر")
);

assert.equal(getGoogleMapsUrl({}), "");
assert.equal(getGoogleMapsUrl({ latitude: 0, longitude: 0 }), "");

console.log("reservation map link tests passed");
