import * as React from "react";
import {
  PlasmicReminder,
  DefaultReminderProps
} from "./plasmic/sayban/PlasmicReminder";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  hasMedicineReminderCategory,
  normalizeReminderCategoryCatalog,
  normalizeReminderList,
  reminderImageUrl,
  requestReminderDetail,
  subscribeReminderDetail
} from "@/lib/reminderTask";
import { resolveClientApiUrl } from "@/lib/resolveClientApiUrl";
import { PUBLIC_ROUTES } from "@/lib/apiRoutes";
import ReminderEventPage from "./ReminderEventPage";
import ReminderDetailPage from "./ReminderDetailPage";
import ReminderImageLightbox from "./ReminderImageLightbox";
import ReminderHomeBoard from "./reminder/ReminderHomeBoard";
import styles from "./Reminder.module.css";

export interface ReminderProps extends DefaultReminderProps {}

function Reminder_(props: ReminderProps, ref: HTMLElementRefOf<"div">) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const normalizedData = React.useMemo(
    () => normalizeReminderList(props.data),
    [props.data]
  );
  const listById = React.useMemo(() => {
    const map = new Map<number, Record<string, unknown>>();
    for (const row of normalizedData) {
      const id = Number(row.id);
      if (Number.isFinite(id) && id > 0) map.set(id, row);
    }
    return map;
  }, [normalizedData]);

  const [catalog, setCatalog] = React.useState(() =>
    normalizeReminderCategoryCatalog(props.category)
  );
  // Dev preview only — production opens `/{page}/reminder_{id}` via Homepage.
  const [detail, setDetail] = React.useState<Record<string, unknown> | null>(
    null
  );
  const [lightbox, setLightbox] = React.useState<string | null>(null);
  const [devPreview, setDevPreview] = React.useState(false);
  const lightboxOpen = Boolean(lightbox);

  React.useEffect(() => {
    setDevPreview(window.location.pathname.includes("/dev/"));
  }, []);

  const closeListLightbox = React.useCallback(() => {
    if (
      typeof history !== "undefined" &&
      history.state &&
      (history.state as { saybanReminderLb?: boolean }).saybanReminderLb
    ) {
      history.back();
      return;
    }
    setLightbox(null);
  }, []);

  React.useEffect(() => {
    if (!lightboxOpen) return;
    history.pushState({ saybanReminderLb: true }, "");
    const onPop = () => setLightbox(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [lightboxOpen]);

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

  React.useEffect(() => {
    if (!devPreview) return;
    return subscribeReminderDetail(setDetail);
  }, [devPreview]);

  // Attach data attrs + swap MenuIcon for real image_url thumbs.
  React.useEffect(() => {
    const root = hostRef.current;
    if (!root) return;

    const paint = () => {
      const rows = root.querySelectorAll<HTMLElement>(
        '[class*="PlasmicReminder_frame32"], [class*="PlasmicReminder_freeBox__ihv5N"]'
      );
      rows.forEach(row => {
        if (row.closest("[data-reminder-detail], [data-reminder-lightbox]")) {
          return;
        }
        // Match by visible title text against normalized list.
        const titleEl = row.querySelector(".__wab_text");
        const title = (titleEl?.textContent || "").replace(/\s+/g, " ").trim();
        let match: Record<string, unknown> | undefined;
        for (const item of normalizedData) {
          const name = String(item.name || "").trim();
          const withToken =
            item.token1 != null ? `${name} ${item.token1}`.trim() : name;
          if (
            title === name ||
            title === withToken ||
            title.startsWith(name) ||
            (titleEl == null &&
              (row.textContent || "").replace(/\s+/g, " ").includes(name))
          ) {
            match = item;
            break;
          }
        }
        if (!match) {
          return;
        }
        const id = Number(match.id);
        if (Number.isFinite(id) && id > 0) {
          row.setAttribute("data-reminder-list-id", String(id));
        }
        const imageUrl = reminderImageUrl(match);
        const iconHost =
          row.querySelector<HTMLElement>(
            '[class*="PlasmicReminder_freeBox__pgDxd"]'
          ) ||
          row.querySelector<HTMLElement>(
            '[class*="PlasmicReminder_freeBox__amr5T"]'
          ) ||
          row.querySelector<HTMLElement>('[class*="freeBox__pgDxd"]');
        if (!iconHost) return;

        let img = iconHost.querySelector<HTMLImageElement>(
          "img[data-reminder-list-image]"
        );
        if (imageUrl) {
          if (!img) {
            img = document.createElement("img");
            img.setAttribute("data-reminder-list-image", "1");
            img.alt = "";
            img.className = styles.listThumb;
            iconHost.appendChild(img);
          }
          if (img.getAttribute("src") !== imageUrl) {
            img.setAttribute("src", imageUrl);
          }
          iconHost.setAttribute("data-has-reminder-image", "1");
          iconHost.querySelectorAll("svg").forEach(el => {
            (el as SVGElement).style.display = "none";
          });
        } else if (img) {
          img.remove();
          iconHost.removeAttribute("data-has-reminder-image");
          iconHost.querySelectorAll("svg").forEach(el => {
            (el as SVGElement).style.display = "";
          });
        }
      });
    };

    paint();
    const mo = new MutationObserver(() => paint());
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [normalizedData]);

  // List click → detail (not edit). Image click → lightbox.
  React.useEffect(() => {
    const root = hostRef.current;
    if (!root) return;

    const onClickCapture = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          "[data-reminder-detail], [data-reminder-lightbox], [data-reminder-form-extras]"
        )
      ) {
        return;
      }

      const img = target.closest("img[data-reminder-list-image]");
      if (img) {
        e.preventDefault();
        e.stopPropagation();
        const src = img.getAttribute("src");
        if (src) setLightbox(src);
        return;
      }

      const row = target.closest<HTMLElement>(
        "[data-reminder-list-id], [class*='PlasmicReminder_frame32']"
      );
      if (!row) return;
      // Don't steal clicks from nested ReminderSetting (edit/switch).
      if (
        row.closest('[class*="PlasmicReminder_reminderSetting"]') ||
        row.closest('[class*="ReminderSetting"]')
      ) {
        return;
      }

      const id = Number(row.getAttribute("data-reminder-list-id"));
      const reminder =
        (Number.isFinite(id) && id > 0 ? listById.get(id) : null) || null;
      if (!reminder) return;

      e.preventDefault();
      e.stopPropagation();
      requestReminderDetail(reminder);
    };

    root.addEventListener("click", onClickCapture, true);
    return () => root.removeEventListener("click", onClickCapture, true);
  }, [listById]);

  const renderEventPage = React.useCallback(
    (renderProps: Record<string, unknown>, _DefaultDialog: unknown) => (
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
    ),
    []
  );

  const triggerAddReminder = React.useCallback(() => {
    const root = hostRef.current;
    if (!root) return;
    const addBtn =
      root.querySelector<HTMLElement>(
        '[class*="PlasmicReminder_freeBox__qz4Ne"] button'
      ) ||
      root.querySelector<HTMLElement>(
        '[data-plasmic-name="button12"], [class*="PlasmicReminder_button12"] button, [class*="button12"] button'
      ) ||
      root.querySelector<HTMLElement>(
        '[class*="PlasmicReminder_button12"]'
      );
    addBtn?.click();
  }, []);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      hostRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref]
  );

  return (
    <div className={styles.host} ref={setRefs} data-reminder-redesign="1">
      {devPreview && detail ? (
        <ReminderDetailPage
          open
          reminder={detail}
          onClose={() => setDetail(null)}
        />
      ) : (
        <>
          <div className={styles.boardSlot}>
            <ReminderHomeBoard
              data={normalizedData}
              onAddClick={triggerAddReminder}
            />
          </div>
          <div className={styles.plasmicLayer} aria-hidden={false}>
            <PlasmicReminder
              {...props}
              data={normalizedData as DefaultReminderProps["data"]}
              category={catalog as DefaultReminderProps["category"]}
              dialog={{ render: renderEventPage } as never}
              dialog2={{ props: { disableModalHash: true } }}
            />
          </div>
          <ReminderImageLightbox
            src={lightbox}
            onClose={closeListLightbox}
          />
        </>
      )}
    </div>
  );
}

const Reminder = React.forwardRef(Reminder_);
export default Reminder;
