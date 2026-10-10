/**
 * Shared schedule / wallet helpers inlined into n8n Code nodes by add-n8n-reminders.mjs
 * Asia/Tehran wall-clock contract. Horizon = 30 days.
 */

export const WEEKDAY_TO_JS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

/** JS source string for n8n Code nodes (Tehran helpers + fire-slot generator). */
export const TEHRAN_SCHEDULE_JS = `
const WEEKDAY_TO_JS = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6
};
function tehranParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}
function pad(n) { return String(n).padStart(2, '0'); }
function tehranNowString() {
  const p = tehranParts();
  return p.year + '-' + pad(p.month) + '-' + pad(p.day) + ' ' + pad(p.hour) + ':' + pad(p.minute) + ':' + pad(p.second);
}
function tehranDateString(offsetDays = 0) {
  // Build from Tehran Y-M-D then add days in civil calendar
  const p = tehranParts();
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + offsetDays, 12, 0, 0));
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}
function jsWeekdayForTehranDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  // Noon UTC on that civil date approximates weekday for Iran dates
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}
function parseTimeToHm(t) {
  const m = String(t || '').trim().match(/^(\\d{1,2}):(\\d{2})/);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}
function parseJsonArray(value) {
  if (value == null || value === '' || value === '{') return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { const v = JSON.parse(value); return Array.isArray(v) ? v : []; } catch { return []; }
  }
  return [];
}
function normalizeScheduleType(raw) {
  const s = String(raw || '').trim();
  if (s === 'everyDay' || s === 'every_day') return 'every_day';
  if (s === 'everyYear' || s === 'every_year') return 'every_year';
  if (s === 'once') return 'once';
  return s || 'every_day';
}
function normalizeChannels(raw) {
  const allowed = new Set(['notification', 'sms', 'bale']);
  const arr = parseJsonArray(raw).map(c => String(c).toLowerCase()).filter(c => allowed.has(c));
  return arr.length ? arr : ['notification'];
}
function parsePreOffsetsMinutes(preReminders) {
  const arr = parseJsonArray(preReminders);
  const out = [];
  for (const item of arr) {
    if (typeof item === 'number' && Number.isFinite(item)) { out.push(Math.max(0, Math.floor(item))); continue; }
    if (typeof item === 'string') {
      const n = Number(item);
      if (Number.isFinite(n)) { out.push(Math.max(0, Math.floor(n))); continue; }
      const hm = parseTimeToHm(item);
      // UI sometimes stores absolute pre times — treat as unsupported offset 0 skip
      if (hm) continue;
    }
    if (item && typeof item === 'object') {
      const mins = Number(item.minutes ?? item.offset ?? item.value);
      if (Number.isFinite(mins)) out.push(Math.max(0, Math.floor(mins)));
    }
  }
  return [...new Set(out)];
}
function addMinutesToTehran(ymd, hm, deltaMin) {
  const [y, m, d] = ymd.split('-').map(Number);
  const total = hm.hour * 60 + hm.minute + deltaMin;
  const dayDelta = Math.floor(total / 1440);
  let rem = total % 1440;
  if (rem < 0) { rem += 1440; }
  const dt = new Date(Date.UTC(y, m - 1, d + dayDelta, 12, 0, 0));
  const ymd2 = dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
  const hour = Math.floor(rem / 60);
  const minute = rem % 60;
  return ymd2 + ' ' + pad(hour) + ':' + pad(minute) + ':00';
}
function withinHorizon(fireAt, nowStr, horizonEndStr, finishAt) {
  if (fireAt < nowStr) return false;
  if (fireAt > horizonEndStr) return false;
  if (finishAt && fireAt > finishAt) return false;
  return true;
}
function buildFireSlots(reminder, horizonDays = 30) {
  const nowStr = tehranNowString();
  const horizonEnd = tehranDateString(horizonDays) + ' 23:59:59';
  const times = parseJsonArray(reminder.times).map(parseTimeToHm).filter(Boolean);
  const channels = normalizeChannels(reminder.channels);
  const preOffsets = parsePreOffsetsMinutes(reminder.pre_reminders);
  const scheduleType = normalizeScheduleType(reminder.schedule_type);
  const finishAt = reminder.finish_at || reminder.finishTime || null;
  const startsAt = reminder.starts_at || null;
  const title = reminder.name || reminder.title || 'یادآوری';
  const body = reminder.text || title;
  const slots = [];
  const weekdaysRaw = parseJsonArray(reminder.weekdays).map(w => String(w).toLowerCase());
  const weekdaySet = new Set(weekdaysRaw.map(w => WEEKDAY_TO_JS[w]).filter(v => v != null));
  const dates = parseJsonArray(reminder.dates);

  function pushSlot(fireAt, kind, preOffset) {
    if (startsAt && fireAt < startsAt) return;
    if (!withinHorizon(fireAt, nowStr, horizonEnd, finishAt)) return;
    slots.push({
      fire_at: fireAt,
      kind,
      pre_offset_minutes: preOffset,
      title,
      body,
      channels: JSON.stringify(channels)
    });
  }

  if (!times.length) return slots;

  if (scheduleType === 'every_day') {
    for (let i = 0; i <= horizonDays; i++) {
      const ymd = tehranDateString(i);
      const wd = jsWeekdayForTehranDate(ymd);
      if (weekdaySet.size && !weekdaySet.has(wd)) continue;
      for (const hm of times) {
        const mainAt = addMinutesToTehran(ymd, hm, 0);
        pushSlot(mainAt, 'main', null);
        for (const off of preOffsets) {
          pushSlot(addMinutesToTehran(ymd, hm, -off), 'pre', off);
        }
      }
    }
  } else if (scheduleType === 'every_year' || scheduleType === 'once') {
    const p = tehranParts();
    const years = scheduleType === 'once' ? [p.year, p.year + 1] : [p.year, p.year + 1];
    for (const dateStr of (dates.length ? dates : [])) {
      const parts = String(dateStr).split(/[-/]/).map(Number);
      if (parts.length < 3) continue;
      let [, month, day] = parts;
      if (String(dateStr).startsWith('0000') || parts[0] === 0) {
        // yearly template
      } else if (scheduleType === 'once') {
        month = parts[1];
        day = parts[2];
        const y = parts[0];
        for (const hm of times) {
          const ymd = y + '-' + pad(month) + '-' + pad(day);
          const mainAt = addMinutesToTehran(ymd, hm, 0);
          pushSlot(mainAt, 'main', null);
          for (const off of preOffsets) pushSlot(addMinutesToTehran(ymd, hm, -off), 'pre', off);
        }
        continue;
      }
      for (const y of years) {
        for (const hm of times) {
          const ymd = y + '-' + pad(month) + '-' + pad(day);
          const mainAt = addMinutesToTehran(ymd, hm, 0);
          pushSlot(mainAt, 'main', null);
          for (const off of preOffsets) pushSlot(addMinutesToTehran(ymd, hm, -off), 'pre', off);
        }
      }
    }
  }
  // de-dupe by fire_at+kind
  const seen = new Set();
  return slots.filter(s => {
    const k = s.fire_at + '|' + s.kind;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
`;
