/**
 * Unit tests for reminder list/category normalization (UI contract).
 *   node --experimental-strip-types --test scripts/test-reminder-normalize.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const modPath = pathToFileURL(
  path.join(process.cwd(), "src/lib/reminderTask.ts")
).href;

const {
  normalizeReminderList,
  normalizeReminderListItem,
  expandAnnualDatesForDisplay,
  hasMedicineReminderCategory,
  normalizeReminderCategoryCatalog,
  resolveReminderWeekdaysPayload,
  buildReminderCostReport,
  ALL_WEEKDAYS
} = await import(modPath);

test("normalizes every_day + empty weekdays for homepage filter", () => {
  const row = normalizeReminderListItem({
    id: 1,
    schedule_type: "every_day",
    status: "active",
    weekdays: "[]",
    times: '["09:30"]',
    dates: "[]",
    channels: '["notification"]'
  });
  assert.equal(row.schedule_type, "everyDay");
  assert.equal(row.active, 1);
  assert.deepEqual(JSON.parse(row.weekdays), [...ALL_WEEKDAYS]);
  assert.equal(typeof row.times, "string");
});

test("expands everyYear 0000-MM-DD to next occurrence for display", () => {
  const expanded = expandAnnualDatesForDisplay('["0000-11-21"]', "everyYear");
  const [next] = JSON.parse(expanded);
  assert.match(next, /^\d{4}-11-21$/);
  assert.notEqual(next.slice(0, 4), "0000");
  assert.ok(Number(next.slice(0, 4)) >= new Date().getFullYear());

  const row = normalizeReminderListItem({
    id: 10,
    name: "تولد پسرم",
    type: "occasion",
    schedule_type: "every_year",
    status: "active",
    dates: '["0000-11-21"]',
    times: '["09:30"]',
    channels: '["notification"]'
  });
  assert.equal(row.schedule_type, "everyYear");
  assert.equal(row.active, 1);
  assert.equal(row.datesAnnual, '["0000-11-21"]');
  assert.equal(JSON.parse(row.dates)[0], next);
  assert.ok(!Number.isNaN(new Date(JSON.parse(row.dates)[0]).getTime()));
});

test("paused status maps to active=0 for switch UI", () => {
  const row = normalizeReminderListItem({
    id: 2,
    schedule_type: "everyDay",
    status: "paused",
    times: '["09:30"]',
    dates: "[]",
    channels: '["notification"]'
  });
  assert.equal(row.active, 0);
  assert.equal(row.status, "paused");
});

test("normalizes companion + image fields for list/edit UI", () => {
  const row = normalizeReminderListItem({
    id: 3,
    schedule_type: "everyDay",
    status: "active",
    times: '["09:30"]',
    dates: "[]",
    channels: '["notification"]',
    patient_id: 32,
    patient_name: "لعیا",
    patient_relation: "child",
    image_url:
      "https://teh-3.s3.poshtiban.com/lioms3/example.png"
  });
  assert.equal(row.patientId, 32);
  assert.equal(row.patient_id, 32);
  assert.equal(row.patientName, "لعیا");
  assert.equal(row.imageUrl, "https://teh-3.s3.poshtiban.com/lioms3/example.png");
  assert.equal(row.image_url, row.imageUrl);
});

test("extracts reminders from API envelope", () => {
  const list = normalizeReminderList({
    success: true,
    reminders: [{ id: 9, schedule_type: "everyDay", status: "active", times: ["10:00"] }]
  });
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 9);
  assert.equal(list[0].times, '["10:00"]');
});

test("detects usable category catalog", () => {
  assert.equal(
    hasMedicineReminderCategory({
      category: [{ name: "medicine_time" }],
      type: [
        {
          category_name: "medicine_time",
          items: [{ type: "medicine_time", schedule_type: "everyDay" }]
        }
      ]
    }),
    true
  );
  assert.equal(
    hasMedicineReminderCategory({
      category: [{ name: "appointment" }],
      type: [
        {
          category_name: "appointment",
          items: [{ type: "appointment" }]
        }
      ]
    }),
    true
  );
  assert.equal(hasMedicineReminderCategory({ category: [], type: [] }), false);
});

test("resolveReminderWeekdaysPayload falls back for everyDay", () => {
  assert.equal(
    resolveReminderWeekdaysPayload({
      week: [],
      existingWeekdays: undefined,
      scheduleType: "everyDay"
    }),
    JSON.stringify([...ALL_WEEKDAYS])
  );
  assert.equal(
    resolveReminderWeekdaysPayload({
      week: ["monday"],
      scheduleType: "everyDay"
    }),
    '["monday"]'
  );
});

test("shows all categories as selectable", () => {
  const cat = normalizeReminderCategoryCatalog({
    success: true,
    category: [
      {
        code: "medicine_time",
        title_fa: "زمان دارو",
        icon: "medicine",
        is_addable: 1
      },
      {
        code: "appointment",
        title_fa: "نوبت پزشکی",
        icon: "calendar",
        is_addable: 0
      },
      {
        code: "occasion",
        title_fa: "مناسبت",
        icon: "gift",
        is_addable: 0
      }
    ],
    type: [
      {
        category_name: "medicine_time",
        category_name_fa: "زمان دارو",
        items: [{ type: "medicine_time", name_fa: "زمان دارو" }]
      }
    ]
  });
  assert.equal(cat.category.length, 3);
  assert.equal(cat.type.length, 3);
  assert.equal(cat.category[2].icon, "occasion");
  for (const section of cat.type) {
    assert.equal(section.items[0].__addDisabled, false);
    assert.ok(section.items[0].label);
  }
});

test("buildReminderCostReport matches Report2 contract", () => {
  const report = buildReminderCostReport({
    data: {
      schedule_type: "everyDay",
      weekdays: JSON.stringify([...ALL_WEEKDAYS]),
      times: '["09:30"]',
      name: "test"
    }
  });
  assert.ok(report.totalNotifications > 0);
  assert.equal(report.results[0].schedule_type, "everyDay");
  assert.equal(report.totalPerChannel.length, 3);
  assert.equal(report.results[0].costs.notification, 0);
  assert.equal(
    report.results[0].costs.sms,
    500 * report.totalNotifications
  );
});

test("catalog items expose type_fa/label for RadioGroupLiom", () => {
  const cat = normalizeReminderCategoryCatalog({
    success: true,
    category: [
      {
        code: "medicine_time",
        title_fa: "زمان دارو",
        icon: "medicine",
        is_addable: 1
      }
    ],
    type: [
      {
        category_name: "medicine_time",
        category_name_fa: "زمان دارو",
        items: [
          {
            type: "medicine_time",
            name_fa: "زمان دارو",
            schedule_type: "everyDay"
          }
        ]
      }
    ]
  });
  assert.equal(cat.category[0].label, "زمان دارو");
  assert.equal(cat.category[0].value, "medicine_time");
  assert.equal(cat.category[0].icon, "medicine_time");
  assert.equal(cat.type[0].items[0].type_fa, "زمان دارو");
  assert.equal(cat.type[0].items[0].label, "زمان دارو");
  assert.equal(cat.type[0].items[0].value, "medicine_time");
  assert.equal(cat.type[0].items[0].icon, "medicine_time");
});

test("normalizeReminderCategoryCatalog keeps type/category", () => {
  const cat = normalizeReminderCategoryCatalog({
    success: true,
    result: [{ code: "medicine_time", title_fa: "زمان دارو" }],
    category: [{ name: "medicine_time", name_fa: "زمان دارو" }],
    type: [
      {
        category_name: "medicine_time",
        items: [{ type: "medicine_time" }]
      }
    ]
  });
  assert.ok(Array.isArray(cat.category));
  assert.ok(Array.isArray(cat.type));
  assert.equal(hasMedicineReminderCategory(cat), true);
});
