const body = {
  data: {
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
    times: '["09:30"]',
    name: "test"
  }
};
const r = await fetch("https://sayban.darkube.ir/webhook/report/insert", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
console.log("report", r.status, JSON.stringify(await r.json(), null, 2).slice(0, 800));

const c = await (
  await fetch("https://sayban.darkube.ir/webhook/reminders/categories")
).json();
console.log(
  "cats",
  c.category?.map((x) => ({
    name: x.name,
    is_addable: x.is_addable,
    disabled: c.type?.find((t) => t.category_name === x.name)?.items?.[0]
      ?.__addDisabled
  }))
);
