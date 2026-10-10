import * as React from "react";
import {
  PlasmicFilter,
  DefaultFilterProps,
  type PlasmicFilter__OverridesType
} from "./plasmic/sayban/PlasmicFilter";
import CentersFilterDialogContent from "./centers/CentersFilterDialogContent";
import dialogStyles from "./centers/CentersFilterDialog.module.css";
import {
  EMPTY_FILTER_DRAFT,
  draftFromFiltes,
  filtesFromDraft,
  filterEntryValue,
  type CentersFilterDraft,
  type CentersFilters
} from "./centers/centerFilters";

export interface FilterProps extends DefaultFilterProps {
  /** When false, the «نزدیک‌ترین به آدرس فعلی» chip is disabled. */
  nearbyEnabled?: boolean;
}

function Filter(props: FilterProps) {
  const { nearbyEnabled = true, ...rest } = props;
  const filtes =
    props.filtes &&
    typeof props.filtes === "object" &&
    !Array.isArray(props.filtes)
      ? (props.filtes as Record<string, unknown>)
      : {};

  const [draft, setDraft] = React.useState<CentersFilterDraft>(EMPTY_FILTER_DRAFT);

  React.useEffect(() => {
    if (!props.opendialog) return;
    setDraft(draftFromFiltes(filtes as CentersFilters));
  }, [props.opendialog]);

  const nearby = String(filterEntryValue(filtes.nearby) ?? "");

  React.useEffect(() => {
    if (nearbyEnabled || nearby !== "nearby") return;
    const next = { ...filtes };
    delete next.nearby;
    (props.onFiltesChange as ((val: unknown) => void) | undefined)?.(next);
  }, [nearbyEnabled, nearby, filtes, props.onFiltesChange]);

  const closeDialog = () => {
    (props.onOpendialogChange as ((val: boolean) => void) | undefined)?.(false);
  };

  const applyDraft = () => {
    (props.onFiltesChange as ((val: unknown) => void) | undefined)?.(
      filtesFromDraft(draft)
    );
    closeDialog();
  };

  const clearAll = () => {
    setDraft(EMPTY_FILTER_DRAFT);
    (props.onFiltesChange as ((val: unknown) => void) | undefined)?.({});
  };

  const overrides = React.useMemo<PlasmicFilter__OverridesType>(
    () => ({
      dialogContent: {
        props: {
          className: dialogStyles.dialogContent
        },
        wrap: (node: React.ReactNode) => {
          const panel = (
            <CentersFilterDialogContent
              draft={draft}
              nearbyEnabled={nearbyEnabled}
              onDraftChange={setDraft}
              onApply={applyDraft}
              onClear={clearAll}
            />
          );

          if (!React.isValidElement(node)) return panel;

          const element = node as React.ReactElement<{
            children?: React.ReactNode;
            className?: string;
          }>;
          const children = React.Children.toArray(element.props.children);
          const kept = children.filter(child => {
            if (!React.isValidElement(child)) return true;
            const name = String(
              (child.props as { "data-plasmic-name"?: string })["data-plasmic-name"] ??
                ""
            );
            return name === "dialogClose";
          });

          return React.cloneElement(element, {
            className: [element.props.className, dialogStyles.dialogContent]
              .filter(Boolean)
              .join(" "),
            children: [panel, ...kept]
          });
        }
      }
    }),
    [draft, nearbyEnabled]
  );

  return (
    <PlasmicFilter
      {...rest}
      filtes={filtes}
      onFiltesChange={props.onFiltesChange}
      overrides={overrides}
    />
  );
}

export default Filter;
