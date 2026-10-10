/** Default week rows used by the panel «افزودن مرکز» wizards. */
import {
  addCenterCredentialsStore,
  addCenterValidationStore
} from "../centerPanel/addCenterValidationStore";

export const EMPTY_CENTER_WEEK = [
  { label: "شنبه", value: "sat", isHoliday: false },
  { label: "یکشنبه", value: "sun", isHoliday: false },
  { label: "دوشنبه", value: "mon", isHoliday: false },
  { label: "سه‌شنبه", value: "tue", isHoliday: false },
  { label: "چهارشنبه", value: "wed", isHoliday: false },
  { label: "پنج‌شنبه", value: "thu", isHoliday: false },
  { label: "جمعه", value: "fri", isHoliday: false }
] as const;

const EMPTY_OWNER_DOCS = {
  establishment_notice: "",
  license_number: "",
  registration_docs: "",
  registered_center_name: ""
};

type AddCenterFormState = {
  userPanelInfo?: Record<string, any>;
  centerInfo?: Record<string, any>;
  loaction?: Record<string, any>;
  imag?: Record<string, any>;
  tabs?: Record<string, any>;
  timeWeek?: Record<string, any>;
  addServise?: Record<string, any>;
  userPanelInfo2?: Record<string, any>;
  centerInfo2?: Record<string, any>;
  loaction2?: Record<string, any>;
  imag2?: Record<string, any>;
  tabs2?: Record<string, any>;
  timeWeek2?: Record<string, any>;
  addServise3?: Record<string, any>;
};

/**
 * Clears every field in the add-center wizard so reopening the modal never
 * shows a previous draft. Variant `modal` is the primary wizard; `modal2` is
 * the duplicate copy in PlasmicMain.
 */
export function resetAddCenterFormState(
  state: AddCenterFormState,
  variant: "modal" | "modal2" = "modal"
) {
  addCenterValidationStore.reset();
  addCenterCredentialsStore.reset();
  if (variant === "modal2") {
    if (state.userPanelInfo2) {
      state.userPanelInfo2.emailvalue = "";
      state.userPanelInfo2.mobileValue = "";
      state.userPanelInfo2.nameValue = "";
      state.userPanelInfo2.ownerDocs = { ...EMPTY_OWNER_DOCS };
    }
    if (state.centerInfo2) {
      state.centerInfo2.careDomain = "";
      state.centerInfo2.centerType = "";
      state.centerInfo2.title = "";
      state.centerInfo2.description = "";
      state.centerInfo2.subcategory2 = "";
      state.centerInfo2.tag = "";
      state.centerInfo2.tags2 = [];
      state.centerInfo2.categorie = undefined;
      state.centerInfo2.refresh = String(Date.now());
    }
    if (state.loaction2) {
      state.loaction2.address = "";
      state.loaction2.city2 = "";
      state.loaction2.state2 = "";
      state.loaction2.lat = "";
      state.loaction2.lon = "";
      state.loaction2.call2 = "";
    }
    if (state.imag2) {
      state.imag2.uploadFiles = [];
    }
    if (state.tabs2) {
      state.tabs2.activeKey = "1";
    }
    if (state.timeWeek2) {
      state.timeWeek2.week = EMPTY_CENTER_WEEK.map(day => ({ ...day }));
    }
    if (state.addServise3) {
      state.addServise3.servises = [];
    }
    return;
  }

  if (state.userPanelInfo) {
    state.userPanelInfo.emailvalue = "";
    state.userPanelInfo.mobileValue = "";
    state.userPanelInfo.nameValue = "";
    state.userPanelInfo.ownerDocs = { ...EMPTY_OWNER_DOCS };
  }
  if (state.centerInfo) {
    state.centerInfo.careDomain = "";
    state.centerInfo.centerType = "";
    state.centerInfo.title = "";
    state.centerInfo.description = "";
    state.centerInfo.subcategory2 = "";
    state.centerInfo.tag = "";
    state.centerInfo.tags2 = [];
    state.centerInfo.categorie = undefined;
    state.centerInfo.refresh = String(Date.now());
  }
  if (state.loaction) {
    state.loaction.address = "";
    state.loaction.city2 = "";
    state.loaction.state2 = "";
    state.loaction.lat = "";
    state.loaction.lon = "";
    state.loaction.call2 = "";
  }
  if (state.imag) {
    state.imag.uploadFiles = [];
  }
  if (state.tabs) {
    state.tabs.activeKey = "1";
  }
  if (state.timeWeek) {
    state.timeWeek.week = EMPTY_CENTER_WEEK.map(day => ({ ...day }));
  }
  if (state.addServise) {
    state.addServise.servises = [];
  }
}
