import * as React from "react";
import {
  PlasmicReminder,
  DefaultReminderProps
} from "./plasmic/sayban/PlasmicReminder";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  hasMedicineReminderCategory,
  normalizeReminderCategoryCatalog,
  normalizeReminderList
} from "@/lib/reminderTask";
import { resolveClientApiUrl } from "@/lib/resolveClientApiUrl";
import { PUBLIC_ROUTES } from "@/lib/apiRoutes";
import ReminderEventPage from "./ReminderEventPage";

export interface ReminderProps extends DefaultReminderProps {}

function Reminder_(props: ReminderProps, ref: HTMLElementRefOf<"div">) {
  const normalizedData = React.useMemo(
    () => normalizeReminderList(props.data),
    [props.data]
  );

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

  // Nested date picker must not push `#modal-*` on top of the parent reminder
  // dialog — that history stack was snapping pickers shut on open/scroll.
  // Create/edit on nested ReminderSetting already uses ReminderEventPage; also
  // shell Reminder's own `dialog` so any direct open path matches.
  return (
    <PlasmicReminder
      root={{ ref }}
      {...props}
      data={normalizedData as DefaultReminderProps["data"]}
      category={catalog as DefaultReminderProps["category"]}
      dialog={{ render: renderEventPage } as never}
      dialog2={{ props: { disableModalHash: true } }}
    />
  );
}

const Reminder = React.forwardRef(Reminder_);
export default Reminder;
