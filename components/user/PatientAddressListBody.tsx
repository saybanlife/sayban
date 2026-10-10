import * as React from "react";
import { useRouter } from "next/router";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { TextCollapse } from "@/components/TextCollapse";
import UserIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__User";
import Icon12Icon from "../plasmic/sayban/icons/PlasmicIcon__Icon12";
import patientSty from "../plasmic/sayban/PlasmicPatient.module.css";
import addressSty from "../plasmic/sayban/PlasmicAddress.module.css";
import PatientAddressListActions from "./PatientAddressListActions";
import listStyles from "./PatientAddressList.module.css";
import {
  type CompanionRecord,
  deleteCompanion,
  deleteAddress,
  formatCompanionAddressLine,
  listCompanions,
  listSavedAddresses,
  rememberEditPatient,
  rememberEditAddress
} from "./patientAddressApi";
import type { UserAddress } from "../home/currentAddressModel";

function useToast() {
  const $globalActions = useGlobalActions?.();
  return React.useCallback(
    (type: "error" | "success", message: string) => {
      $globalActions?.["Fragment.showToast"]?.(type, message, "bottom-center");
    },
    [$globalActions]
  );
}

function usePageBase() {
  const router = useRouter();
  return String(router.query.page || "user");
}

type PatientListProps = {
  payload: unknown;
  onRefresh?: () => void;
  emptyState?: React.ReactNode;
};

export function PatientListBody({
  payload,
  onRefresh,
  emptyState
}: PatientListProps) {
  const router = useRouter();
  const pageBase = usePageBase();
  const showToast = useToast();
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const items = React.useMemo(() => listCompanions(payload), [payload]);

  const hasAny = (() => {
    try {
      const data = (payload as { data?: CompanionRecord[] })?.data;
      return Boolean(data?.[0]?.id);
    } catch {
      return items.length > 0;
    }
  })();

  if (!hasAny) {
    return <div className={listStyles.emptyWrap}>{emptyState}</div>;
  }

  const goEdit = (item: CompanionRecord) => {
    rememberEditPatient(item);
    router.push(`/${pageBase}/addPatient?edit=${item.id}`);
  };

  const handleDelete = async (item: CompanionRecord) => {
    const name = String(item.name || "این همراه").trim();
    if (
      typeof window !== "undefined" &&
      !window.confirm(`آیا از حذف «${name}» مطمئن هستید؟`)
    ) {
      return;
    }
    setBusyId(Number(item.id));
    try {
      const { ok, data } = await deleteCompanion(Number(item.id));
      if (!ok || data?.success === false) {
        showToast("error", String(data?.message || "حذف همراه انجام نشد."));
        return;
      }
      showToast("success", "همراه با موفقیت حذف شد.");
      onRefresh?.();
    } catch {
      showToast("error", "خطا در حذف همراه.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={patientSty.freeBox__avdmG}>
      {items.map(item => {
        const addressLine = formatCompanionAddressLine(item);
        return (
          <div className={patientSty.freeBox__lzE8T} key={item.id}>
            <div className={listStyles.rowWithActions}>
              <div className={patientSty.freeBox__tfEqu}>
                <UserIcon className={patientSty.svg___7Gpa1} role="img" />
              </div>
              <div className={`${patientSty.freeBox__zyfai} ${listStyles.rowBody}`}>
                <div className={patientSty.text__e3Lx}>{item.name}</div>
                <div className={patientSty.text__akjm}>
                  {`کد ملی: ${item.national_code || "—"}`}
                </div>
                {addressLine ? (
                  <div className={listStyles.subLine}>{addressLine}</div>
                ) : null}
              </div>
              <PatientAddressListActions
                busy={busyId === Number(item.id)}
                onEdit={() => goEdit(item)}
                onDelete={() => handleDelete(item)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

type AddressListProps = {
  payload: unknown;
  onRefresh?: () => void;
  emptyState?: React.ReactNode;
};

export function AddressListBody({
  payload,
  onRefresh,
  emptyState
}: AddressListProps) {
  const router = useRouter();
  const pageBase = usePageBase();
  const showToast = useToast();
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const items = React.useMemo(() => listSavedAddresses(payload), [payload]);

  const hasAny = (() => {
    try {
      const data = (payload as { data?: UserAddress[] })?.data;
      return Boolean(data?.[0]?.id);
    } catch {
      return items.length > 0;
    }
  })();

  if (!hasAny) {
    return <div className={listStyles.emptyWrap}>{emptyState}</div>;
  }

  const goEdit = (item: UserAddress) => {
    rememberEditAddress(item);
    router.push(`/${pageBase}/addAddress?edit=${item.id}`);
  };

  const handleDelete = async (item: UserAddress) => {
    const title = String(item.title || "این آدرس").trim();
    if (
      typeof window !== "undefined" &&
      !window.confirm(`آیا از حذف «${title}» مطمئن هستید؟`)
    ) {
      return;
    }
    setBusyId(Number(item.id));
    try {
      const { ok, data } = await deleteAddress(Number(item.id));
      if (!ok || data?.success === false) {
        showToast("error", String(data?.message || "حذف آدرس انجام نشد."));
        return;
      }
      showToast("success", "آدرس با موفقیت حذف شد.");
      onRefresh?.();
    } catch {
      showToast("error", "خطا در حذف آدرس.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={addressSty.freeBox___9I64R}>
      {items.map(item => (
        <div className={addressSty.freeBox__qg5N} key={item.id}>
          <div className={listStyles.rowWithActions}>
            <div className={addressSty.freeBox__eJiFn}>
              <Icon12Icon className={addressSty.svg__qjOO} role="img" />
            </div>
            <div className={`${addressSty.freeBox__c5Mvv} ${listStyles.rowBody}`}>
              <div className={addressSty.text__okrV}>{item.title}</div>
              <TextCollapse
                className={addressSty.textCollapse}
                enableToggle={false}
                maxLines={2}
                text={`${item.address || ""} ${item.details || ""}`.trim()}
              />
            </div>
            <PatientAddressListActions
              busy={busyId === Number(item.id)}
              onEdit={() => goEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
