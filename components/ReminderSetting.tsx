import * as React from "react";
import axios from "axios";
import {
  PlasmicReminderSetting,
  DefaultReminderSettingProps,
  type PlasmicReminderSetting__OverridesType
} from "./plasmic/sayban/PlasmicReminderSetting";
import plasmicStyles from "./plasmic/sayban/PlasmicReminderSetting.module.css";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  hasMedicineReminderCategory,
  isUsableReminderUserId,
  normalizeReminderCategoryCatalog,
  normalizeReminderList
} from "@/lib/reminderTask";
import { readCookie } from "@/lib/authCookies";
import {
  PUBLIC_AUTH_COOKIE_NAME,
  resolvePublicAuthToken
} from "@/lib/publicAuthToken";
import { resolveClientApiUrl } from "@/lib/resolveClientApiUrl";
import { PUBLIC_ROUTES } from "@/lib/apiRoutes";
import Snackbar from "./Snackbar";
import Button2 from "./Button2";
import ReminderAlarmSetup from "./ReminderAlarmSetup";
import ReminderEventPage from "./ReminderEventPage";
import ReminderFormExtras, {
  type ReminderCompanion,
  type ReminderFormExtrasValue
} from "./ReminderFormExtras";
import styles from "./ReminderSetting.module.css";

export interface ReminderSettingProps extends DefaultReminderSettingProps {}

const SWIPE_OPEN_PX = 72;
const SWIPE_MAX_PX = 112;
const SWIPE_RATIO = 1.35;
const SWIPE_START_SLOP = 10;

const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "label",
  "[role='switch']",
  "[role='button']",
  "[data-reminder-actions]",
  "[data-plasmic-name='switchSetting']",
  "[data-plasmic-name='editItem']",
  "[data-plasmic-name='button2']",
  "[data-reminder-form-extras]"
].join(",");

const REMINDER_WRITE_PATH =
  /(?:^|\/)(?:reminders(?:\/edit)?|user\/task(?:\/add|\/edit)?)(?:\?|$)/i;

type PendingDelete = { id: number; name: string };

const EMPTY_EXTRAS: ReminderFormExtrasValue = {
  patientId: null,
  imageUrl: null
};

function slideRowChildren(el: HTMLElement, dx: number) {
  const kids = el.children;
  for (let i = 0; i < kids.length; i += 1) {
    (kids[i] as HTMLElement).style.transform = dx
      ? `translate3d(${dx}px,0,0)`
      : "";
  }
}

function resetRowSwipe(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.removeAttribute("data-swiping");
  slideRowChildren(el, 0);
}

function parseCompanions(payload: unknown): ReminderCompanion[] {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(root.result)
      ? root.result
      : Array.isArray(root.patients)
        ? root.patients
        : Array.isArray(root.items)
          ? root.items
          : Array.isArray(root.data)
            ? root.data
            : [];
  const out: ReminderCompanion[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const name = String(row.name || "").trim();
    if (!name) continue;
    out.push({
      id,
      name,
      relation: row.relation != null ? String(row.relation) : null,
      relation_persian:
        row.relation_persian != null
          ? String(row.relation_persian)
          : null
    });
  }
  return out;
}

function isReminderWriteUrl(url: unknown): boolean {
  const raw = String(url || "");
  try {
    const path = raw.startsWith("http")
      ? new URL(raw).pathname
      : raw;
    return REMINDER_WRITE_PATH.test(path.replace(/^\/webhook\//, "/"));
  } catch {
    return REMINDER_WRITE_PATH.test(raw);
  }
}

function mergeReminderExtras(
  body: unknown,
  extras: ReminderFormExtrasValue
): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const next = { ...(body as Record<string, unknown>) };
  next.patient_id = extras.patientId;
  next.patientId = extras.patientId;
  next.image_url = extras.imageUrl;
  next.imageUrl = extras.imageUrl;
  return next;
}

/** Closes category dialog when create/edit form opens (prop-driven). */
function ReminderEventPageBridge({
  renderProps,
  onFormOpen,
  onOpenChange
}: {
  renderProps: Record<string, unknown>;
  onFormOpen: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const open = Boolean(renderProps.opendialog);
  React.useEffect(() => {
    onOpenChange(open);
    if (open) onFormOpen();
  }, [open, onFormOpen, onOpenChange]);
  // Do not forward Dialog `className` — PlasmicReminderSetting_dialog forces
  // max-width:100% and stretches the sheet across the desktop viewport.
  return (
    <ReminderEventPage
      opendialog={renderProps.opendialog as boolean | undefined}
      onOpendialogChange={
        renderProps.onOpendialogChange as
          | ((val: boolean | string) => void)
          | undefined
      }
    >
      {renderProps.children as React.ReactNode}
    </ReminderEventPage>
  );
}

/**
 * Keep settings content scrollable above the fixed bottom bar so fields like
 * «تکرار» stay reachable on short viewports.
 *
 * Swipe-left on a reminder row opens the delete confirm Snackbar (no Alert /
 * extra delete button). Successful deletes drop the row from local list
 * immediately.
 *
 * Companion + image extras inject into the create/edit form and list rows.
 */
function ReminderSetting_(
  props: ReminderSettingProps,
  ref: HTMLElementRefOf<"div">
) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const extrasRef = React.useRef<ReminderFormExtrasValue>(EMPTY_EXTRAS);
  const safeManId = isUsableReminderUserId(props.manId)
    ? props.manId
    : undefined;
  const token =
    resolvePublicAuthToken(props.token) ||
    resolvePublicAuthToken(readCookie(PUBLIC_AUTH_COOKIE_NAME));

  const normalizedData = React.useMemo(
    () => normalizeReminderList(props.data),
    [props.data]
  );

  const [removedIds, setRemovedIds] = React.useState<number[]>([]);
  const [pendingDelete, setPendingDelete] =
    React.useState<PendingDelete | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [companions, setCompanions] = React.useState<ReminderCompanion[]>([]);
  const [extras, setExtras] =
    React.useState<ReminderFormExtrasValue>(EMPTY_EXTRAS);
  // dialog2.opendialog is a writable valueProp (dialogOpendialog3). Preview and
  // other hosts that omit it need local state or افزودن never opens the picker.
  const dialog2Controlled = props.dialogOpendialog3 !== undefined;
  const [localDialog2Open, setLocalDialog2Open] = React.useState(false);
  const [eventPageOpen, setEventPageOpen] = React.useState(false);
  const dialog2Open = dialog2Controlled
    ? Boolean(props.dialogOpendialog3)
    : localDialog2Open;

  extrasRef.current = extras;

  const wrapTitleWithExtras = React.useCallback(
    (node: React.ReactNode) => (
      <div className={styles.titleExtrasWrap}>
        {node}
        <ReminderFormExtras
          companions={companions}
          value={extras}
          onChange={setExtras}
        />
      </div>
    ),
    [companions, extras]
  );

  const handleDialog2OpenChange = React.useCallback(
    (val: boolean | string) => {
      const next = typeof val === "boolean" ? val : Boolean(val);
      if (!dialog2Controlled) setLocalDialog2Open(next);
      props.onDialogOpendialog3Change?.(next as never);
    },
    [dialog2Controlled, props.onDialogOpendialog3Change]
  );

  const handleEventPageOpenChange = React.useCallback((open: boolean) => {
    setEventPageOpen(open);
  }, []);

  const renderEventPage = React.useCallback(
    (renderProps: Record<string, unknown>, _DefaultDialog: unknown) => (
      <ReminderEventPageBridge
        renderProps={renderProps}
        onFormOpen={() => handleDialog2OpenChange(false)}
        onOpenChange={handleEventPageOpenChange}
      />
    ),
    [handleDialog2OpenChange, handleEventPageOpenChange]
  );

  // Drop local hides once parent list no longer contains those ids.
  React.useEffect(() => {
    const liveIds = normalizedData
      .map(r => Number(r.id))
      .filter(id => Number.isFinite(id) && id > 0);
    setRemovedIds(prev => {
      const next = prev.filter(id => liveIds.indexOf(id) !== -1);
      return next.length === prev.length ? prev : next;
    });
  }, [normalizedData]);

  const listData = React.useMemo(
    () =>
      normalizedData.filter(row => {
        const id = Number(row.id);
        return !(Number.isFinite(id) && removedIds.indexOf(id) !== -1);
      }),
    [normalizedData, removedIds]
  );

  const listById = React.useMemo(() => {
    const map = new Map<number, Record<string, unknown>>();
    for (const row of listData) {
      const id = Number(row.id);
      if (Number.isFinite(id) && id > 0) map.set(id, row);
    }
    return map;
  }, [listData]);

  const [catalog, setCatalog] = React.useState(() =>
    normalizeReminderCategoryCatalog(props.category)
  );

  React.useEffect(() => {
    const next = normalizeReminderCategoryCatalog(props.category);
    if (hasMedicineReminderCategory(next)) {
      setCatalog(next);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const url = resolveClientApiUrl(PUBLIC_ROUTES.remindersCategories);
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const normalized = normalizeReminderCategoryCatalog(json);
        if (hasMedicineReminderCategory(normalized)) {
          setCatalog(normalized);
        }
      } catch {
        /* keep prop / previous catalog */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.category]);

  // Load companions for the form select.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = resolveClientApiUrl(PUBLIC_ROUTES.patients);
        const res = await fetch(url, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setCompanions(parseCompanions(json));
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Capture edit vs add so extras hydrate from the selected reminder.
  React.useEffect(() => {
    const root = hostRef.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const edit = target.closest('[data-plasmic-name="editItem"]');
      if (edit) {
        const row = edit.closest("[data-reminder-id]") as HTMLElement | null;
        const id = Number(row?.getAttribute("data-reminder-id"));
        if (Number.isFinite(id) && id > 0) {
          const rowData = listById.get(id);
          const patientRaw = Number(
            rowData?.patientId ?? rowData?.patient_id ?? 0
          );
          setExtras({
            patientId:
              Number.isFinite(patientRaw) && patientRaw > 0
                ? patientRaw
                : null,
            imageUrl:
              (typeof rowData?.imageUrl === "string" && rowData.imageUrl) ||
              (typeof rowData?.image_url === "string" && rowData.image_url) ||
              null
          });
          return;
        }
      }
      if (
        target.closest('[data-plasmic-name="button2"]') ||
        target.closest('[data-plasmic-name="add"]') ||
        target.closest('[data-plasmic-name="button7"]') ||
        target.closest('[class*="PlasmicReminderSetting_button7"]')
      ) {
        const inRow = target.closest("[data-reminder-id]");
        if (!inRow) {
          setExtras(EMPTY_EXTRAS);
        }
      }
    };

    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, [listById]);

  // Attach patient_id + image_url on create/edit API calls.
  React.useEffect(() => {
    const id = axios.interceptors.request.use(config => {
      if (!isReminderWriteUrl(config.url)) return config;
      const method = String(config.method || "get").toLowerCase();
      if (method !== "post" && method !== "put" && method !== "patch") {
        return config;
      }
      const extrasNow = extrasRef.current;
      if (config.data instanceof FormData) return config;
      if (typeof config.data === "string") {
        try {
          const parsed = JSON.parse(config.data);
          config.data = JSON.stringify(
            mergeReminderExtras(parsed, extrasNow)
          );
        } catch {
          /* leave body */
        }
        return config;
      }
      config.data = mergeReminderExtras(config.data, extrasNow);
      return config;
    });
    return () => {
      axios.interceptors.request.eject(id);
    };
  }, []);

  // Paint companion label + thumbnail on each list row.
  React.useEffect(() => {
    const root = hostRef.current;
    if (!root) return;
    let painting = false;

    const paint = () => {
      if (painting) return;
      painting = true;
      try {
        const rows = root.querySelectorAll<HTMLElement>("[data-reminder-id]");
        rows.forEach(row => {
          const id = Number(row.getAttribute("data-reminder-id"));
          const data = listById.get(id);
          let meta = row.querySelector(
            "[data-reminder-meta]"
          ) as HTMLElement | null;
          if (!data) {
            meta?.remove();
            return;
          }
          const patientName = String(
            data.patient_name || data.patientName || ""
          ).trim();
          const imageUrl = String(
            data.imageUrl || data.image_url || ""
          ).trim();
          if (!patientName && !imageUrl) {
            meta?.remove();
            return;
          }
          if (!meta) {
            meta = document.createElement("div");
            meta.setAttribute("data-reminder-meta", "1");
            meta.className = styles.rowMeta;
            const host =
              (row.querySelector(
                '[data-plasmic-name="frame30"]'
              ) as HTMLElement | null) ||
              (row.querySelector(
                '[data-plasmic-name="frame29"]'
              ) as HTMLElement | null) ||
              (row.firstElementChild as HTMLElement | null);
            host?.appendChild(meta);
          }
          const safeUrl = imageUrl.replace(/"/g, "");
          const safeName = patientName.replace(/</g, "");
          const next = `${safeUrl}|${safeName}`;
          if (meta.getAttribute("data-meta-key") === next) return;
          meta.setAttribute("data-meta-key", next);
          const imgHtml = safeUrl
            ? `<img data-reminder-thumb src="${safeUrl}" alt="" class="${styles.rowThumb}" />`
            : "";
          const labelHtml = safeName
            ? `<span class="${styles.rowCompanion}">همراه: ${safeName}</span>`
            : "";
          meta.innerHTML = `${imgHtml}${labelHtml}`;
        });
      } finally {
        painting = false;
      }
    };

    paint();
    const mo = new MutationObserver(() => {
      if (painting) return;
      paint();
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [listById]);

  const openDeleteConfirm = React.useCallback(
    (id: number, name: string, rowEl?: HTMLElement | null) => {
      resetRowSwipe(rowEl);
      setPendingDelete({ id, name: name || "این یادآوری" });
      setDeleteOpen(true);
    },
    []
  );

  // Swipe-left → delete confirm. Must not steal switch / edit taps.
  React.useEffect(() => {
    const root = hostRef.current;
    if (!root) return;

    type Track = {
      id: number;
      name: string;
      el: HTMLElement;
      startX: number;
      startY: number;
      dx: number;
      axis: "undecided" | "x" | "y";
      pointerId: number;
      captured: boolean;
    };
    let track: Track | null = null;

    const rowFromEvent = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null;
      return target.closest("[data-reminder-id]") as HTMLElement | null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!(e.target instanceof Element)) return;
      if (e.target.closest(INTERACTIVE_SELECTOR)) return;

      const el = rowFromEvent(e.target);
      if (!el) return;
      const id = Number(el.getAttribute("data-reminder-id"));
      if (!Number.isFinite(id) || id <= 0) return;

      track = {
        id,
        name: el.getAttribute("data-reminder-name") || "",
        el,
        startX: e.clientX,
        startY: e.clientY,
        dx: 0,
        axis: "undecided",
        pointerId: e.pointerId,
        captured: false
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!track || track.pointerId !== e.pointerId) return;
      const dx = e.clientX - track.startX;
      const dy = e.clientY - track.startY;

      if (track.axis === "undecided") {
        if (Math.abs(dx) < SWIPE_START_SLOP && Math.abs(dy) < SWIPE_START_SLOP) {
          return;
        }
        if (Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO && dx < 0) {
          track.axis = "x";
          track.el.setAttribute("data-swiping", "1");
          try {
            track.el.setPointerCapture(e.pointerId);
            track.captured = true;
          } catch {
            track.captured = false;
          }
        } else {
          track.axis = "y";
          track = null;
          return;
        }
      }

      if (track.axis !== "x") return;
      const clamped = Math.max(-SWIPE_MAX_PX, Math.min(0, dx));
      track.dx = clamped;
      slideRowChildren(track.el, clamped);
      e.preventDefault();
    };

    const finish = (e: PointerEvent) => {
      if (!track || track.pointerId !== e.pointerId) return;
      const current = track;
      track = null;
      if (current.captured) {
        try {
          current.el.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      if (current.axis === "x" && current.dx <= -SWIPE_OPEN_PX) {
        openDeleteConfirm(current.id, current.name, current.el);
        return;
      }
      resetRowSwipe(current.el);
    };

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove, { passive: false });
    root.addEventListener("pointerup", finish);
    root.addEventListener("pointercancel", finish);
    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", finish);
      root.removeEventListener("pointercancel", finish);
    };
  }, [openDeleteConfirm]);

  const confirmDelete = React.useCallback(async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      const url = resolveClientApiUrl(PUBLIC_ROUTES.remindersDelete);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id: pendingDelete.id })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        setDeleting(false);
        return;
      }
      const deletedId = pendingDelete.id;
      setRemovedIds(prev =>
        prev.indexOf(deletedId) === -1 ? prev.concat(deletedId) : prev
      );
      setDeleteOpen(false);
      setPendingDelete(null);
    } catch {
      /* keep dialog open on network failure */
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, deleting, token]);

  const scrollFixCss = React.useMemo(
    () => `
.${styles.host} .${plasmicStyles.freeBox__sUO1},
.${styles.host} .${plasmicStyles.freeBox__woCiQ},
.${styles.host} .${plasmicStyles.freeBox__l9IUy} {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.${styles.host} .${plasmicStyles.steps2},
.${styles.host} .${plasmicStyles.steps23} {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: auto !important;
  max-height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding-bottom: calc(8.5rem + env(safe-area-inset-bottom, 0px));
}
/* Full-page event shell: same scroll budget as list host (in-tree page). */
[data-reminder-event-page] .${plasmicStyles.steps2},
[data-reminder-event-page] .${plasmicStyles.steps23} {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  max-height: none;
  height: 100% !important;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
}
.${styles.host} .${plasmicStyles.freeBox__o43To} {
  height: auto !important;
  flex: 0 0 auto;
  padding-bottom: 1.25rem;
}
.${styles.host} .${plasmicStyles.freeBox__reDfY},
.${styles.host} .${plasmicStyles.freeBox__r6Nu} {
  padding-bottom: max(
    var(--token-H_DkTyHUBUqw, 5rem),
    calc(0.75rem + env(safe-area-inset-bottom, 0px))
  );
  background: #ffffff;
}
@media (min-width: 0px) and (max-width: 768px) {
  .${styles.host} .${plasmicStyles.steps2},
  .${styles.host} .${plasmicStyles.steps23} {
    padding-bottom: calc(9.5rem + env(safe-area-inset-bottom, 0px));
  }
}
`,
    []
  );

  const setHostRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      hostRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref]
  );

  return (
    <div
      className={styles.host}
      ref={setHostRef}
      data-reminder-event-open={eventPageOpen ? "1" : undefined}
    >
      <style>{scrollFixCss}</style>
      <div className={styles.alarmSlot}>
        <ReminderAlarmSetup />
      </div>
      <PlasmicReminderSetting
        {...props}
        manId={safeManId}
        token={token || undefined}
        data={listData as DefaultReminderSettingProps["data"]}
        category={catalog as DefaultReminderSettingProps["category"]}
        dialogOpendialog3={dialog2Open}
        onDialogOpendialog3Change={handleDialog2OpenChange}
        dateDiolog={{ props: { disableModalHash: true } }}
        time={{ props: { disableModalHash: true } }}
        weekDays={{ props: { disableModalHash: true } }}
        preReminder={{ props: { disableModalHash: true } }}
        textbox={{ wrap: wrapTitleWithExtras }}
        textbox2={{ wrap: wrapTitleWithExtras }}
        dialog={
          {
            render: renderEventPage
          } as PlasmicReminderSetting__OverridesType["dialog"]
        }
        dialog2={{ props: { disableModalHash: true } }}
      />
      <Snackbar
        className={styles.deleteSnackbar}
        type="warning"
        opendialog={deleteOpen}
        onOpendialogChange={open => {
          setDeleteOpen(Boolean(open));
          if (!open) setPendingDelete(null);
        }}
        disableModalHash
        slot={
          <div>
            {pendingDelete
              ? `آیا مطمئنی می‌خواهی یادآوریِ «${pendingDelete.name}» را حذف کنی؟`
              : "حذف یادآوری؟"}
          </div>
        }
        slot2={
          <div>
            با حذف، این یادآوری و ارسال‌های باقی‌مانده‌اش دیگر نمایش داده نمی‌شوند.
          </div>
        }
      >
        <Button2 color="red" loading={deleting} onClick={confirmDelete}>
          حذف
        </Button2>
        <Button2
          color="clear"
          isDisabled={deleting}
          onClick={() => {
            setDeleteOpen(false);
            setPendingDelete(null);
          }}
        >
          انصراف
        </Button2>
      </Snackbar>
    </div>
  );
}

const ReminderSetting = React.forwardRef(ReminderSetting_);
export default ReminderSetting;
