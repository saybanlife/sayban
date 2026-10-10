/** Probe staas report/insert response shape. */
const samples = [
  {
    schedule_type: "everyDay",
    weekdays: JSON.stringify([
      "saturday",
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday"
    ]),
    times: JSON.stringify(["09:30"]),
    active: 1,
    name: "test"
  },
  {
    schedule_type: "everyYear",
    dates: JSON.stringify(["0000-05-15"]),
    times: JSON.stringify(["09:00"]),
    pre: ["02-07", "02-11"],
    active: 1,
    name: "سالگرد"
  }
];

for (const data of samples) {
  const r = await fetch("https://n8n.staas.ir/webhook/report/insert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data })
  });
  console.log("---", data.schedule_type, r.status);
  console.log(JSON.stringify(await r.json(), null, 2));
}
