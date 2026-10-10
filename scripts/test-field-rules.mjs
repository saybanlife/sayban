/**
 * Unit checks for the national-ID and duration field rules.
 *
 *   npx tsx scripts/test-field-rules.mjs
 */
import {
  getFieldRules,
  getNationalIdError,
  sanitizeFieldValue
} from "../components/formFieldRules.ts";

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${
    ok ? "" : ` (expected ${JSON.stringify(expected)})`
  }`);
}

// --- staff "years of experience" field: authored as a tel input -------------
const experience = getFieldRules({
  inputType: "tel",
  inputMode: "numeric",
  placeholder: "سال‌های تجربه کاری"
});
check("experience kind", experience.kind, "integer");
check("experience placeholder", experience.placeholder, "مثلاً ۱۰ سال");

// A real phone field must be unaffected.
const phone = getFieldRules({ inputType: "tel", placeholder: "شماره همراه" });
check("phone kind", phone.kind, "phone");
check("phone placeholder", phone.placeholder, "شماره همراه");

// --- national ID ------------------------------------------------------------
const nid = getFieldRules({ inputType: "text", placeholder: "کد ملی" });
check("nationalId kind", nid.kind, "nationalId");
check("nationalId maxLength", nid.maxLength, 10);
check("nationalId pattern", nid.pattern, "^\\d{10}$");
check("nationalId never numeric input", nid.inputType, undefined);

check(
  "letters and spaces stripped",
  sanitizeFieldValue("nationalId", "00 1a2b3c4d5e6", 10),
  "00123456"
);
check(
  "persian digits normalized",
  sanitizeFieldValue("nationalId", "۰۰۱۲۳۴۵۶۷۸", 10),
  "0012345678"
);
check(
  "leading zeros preserved as string",
  sanitizeFieldValue("nationalId", "0012345678", 10),
  "0012345678"
);
check(
  "truncated to 10 digits",
  sanitizeFieldValue("nationalId", "12345678901234", 10),
  "1234567890"
);
check(
  "short code reports length, not checksum",
  getNationalIdError("12345"),
  "کد ملی باید ۱۰ رقم باشد"
);
check("empty optional is fine", getNationalIdError(""), undefined);
check(
  "empty required is reported",
  getNationalIdError("", true),
  "لطفا کد ملی را وارد کنید"
);
check(
  "invalid checksum reported",
  getNationalIdError("1234567890"),
  "کد ملی معتبر نیست"
);
// 0499370899 is a valid Iranian national ID (mod-11 checksum).
check("valid code accepted", getNationalIdError("0499370899"), undefined);

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
