import * as React from "react";
import { useRouter } from "next/router";
import { PlasmicUser, DefaultUserProps } from "./plasmic/sayban/PlasmicUser";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import userSty from "./plasmic/sayban/PlasmicUser.module.css";
import {
  asNotificationPreference,
  saveNotificationPreference
} from "./user/notificationPreference";
import { isSaybanNativeAndroid } from "@/lib/nativeShell";
import {
  isNotificationSwitchOn,
  resolveNotificationGate
} from "@/lib/notificationStatus";
import { initFcm } from "@/lib/fcm";
import { isGuestOnly, logoutPublic } from "@/lib/publicAuthGate";

export interface UserProps extends DefaultUserProps {
  overrides?: Record<string, any>;
}

const HEART_PATH =
  "M19.5 12.572L12 20l-7.5-7.428A5 5 0 1112 6.006a5 5 0 117.5 6.572";

function installMenuRowHandlers(
  row: HTMLElement,
  onActivate: () => void
): () => void {
  row.style.cursor = "pointer";
  row.setAttribute("role", "button");
  row.tabIndex = 0;

  const onClick = () => onActivate();
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  };

  row.addEventListener("click", onClick);
  row.addEventListener("keydown", onKeyDown);
  return () => {
    row.removeEventListener("click", onClick);
    row.removeEventListener("keydown", onKeyDown);
  };
}

function wireFavoritesMenuRow(
  root: HTMLElement,
  goToFavorites: () => void
): (() => void) | null {
  const row =
    (root.querySelector(`.${userSty.freeBox__eLfl3}`) as HTMLElement | null) ||
    null;
  if (!row || row.getAttribute("data-sayban-favorites") === "ready") {
    return null;
  }

  row.setAttribute("data-sayban-favorites", "ready");
  // Plasmic hides the unused «تخفیف‌ها» row — show it as «علاقه‌مندی‌ها»
  // with the same flex/gap/icon size as sibling menu items.
  row.style.display = "flex";
  row.style.cursor = "pointer";
  row.style.alignItems = "stretch";
  row.style.columnGap = "var(--token-rfsFxiclAtek)";

  const label =
    (row.querySelector(`.${userSty.text___6NLcd}`) as HTMLElement | null) ||
    (row.querySelector("div.__wab_text") as HTMLElement | null);
  if (label) label.textContent = "علاقه‌مندی‌ها";

  const oldIcon = row.querySelector("svg");
  if (oldIcon && !row.querySelector("[data-sayban-heart-icon]")) {
    const heart = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    heart.setAttribute("viewBox", "0 0 24 24");
    heart.setAttribute("fill", "none");
    heart.setAttribute("role", "img");
    heart.setAttribute("aria-hidden", "true");
    heart.setAttribute("data-sayban-heart-icon", "true");
    heart.setAttribute(
      "class",
      oldIcon.getAttribute("class") || userSty.svg__zMxX
    );
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", HEART_PATH);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    heart.appendChild(path);
    oldIcon.replaceWith(heart);
  }

  // Insert a Line separator before this row when missing (siblings use Line).
  const prev = row.previousElementSibling as HTMLElement | null;
  let insertedLine: HTMLElement | null = null;
  const looksLikeLine =
    prev &&
    (prev.className.includes("line__") ||
      prev.classList.contains("__wab_instance"));
  if (!looksLikeLine) {
    const templateLine =
      (root.querySelector(`.${userSty.line__qrasf}`) as HTMLElement | null) ||
      (root.querySelector('[class*="line__"]') as HTMLElement | null);
    if (templateLine?.parentElement) {
      insertedLine = templateLine.cloneNode(true) as HTMLElement;
      insertedLine.setAttribute("data-sayban-favorites-line", "true");
      row.parentElement?.insertBefore(insertedLine, row);
    }
  }

  const removeHandlers = installMenuRowHandlers(row, goToFavorites);
  return () => {
    removeHandlers();
    insertedLine?.remove();
    row.removeAttribute("data-sayban-favorites");
    row.style.display = "none";
  };
}

function User_(props: UserProps, ref: HTMLElementRefOf<"section">) {
  const router = useRouter();
  const rootRef = React.useRef<HTMLElement | null>(null);
  const syncedNotificationRef = React.useRef<boolean | null>(null);
  const [, bumpNotifUi] = React.useState(0);

  const persistNotificationStatus = React.useCallback(async (next: boolean) => {
    if (syncedNotificationRef.current === next) return;
    const previous = syncedNotificationRef.current;
    syncedNotificationRef.current = next;
    try {
      await saveNotificationPreference(next);
    } catch (error) {
      syncedNotificationRef.current = previous;
      console.error("Failed to sync profile isnotif", error);
    }
  }, []);

  React.useEffect(() => {
    if (!props.userinfo || typeof window === "undefined") return;
    const saved = asNotificationPreference(props.userinfo.isnotif);
    syncedNotificationRef.current = saved;

    const syncFromEnvironment = () => {
      // Native shell: OS permission is authoritative — do not clear isnotif
      // just because WebView Notification.permission is missing.
      if (isSaybanNativeAndroid()) {
        const gate = resolveNotificationGate();
        if (gate === "blocked") {
          void persistNotificationStatus(false);
        } else if (gate === "active" && saved) {
          void initFcm();
        }
        bumpNotifUi(v => v + 1);
        return;
      }
      if (!("Notification" in window)) return;
      // Only clear the profile flag when the browser blocks/withdraws permission.
      // While permission is granted, isnotif is an independent in-app preference
      // toggled from «وضعیت اطلاع‌رسانی».
      if (Notification.permission !== "granted") {
        void persistNotificationStatus(false);
      }
    };

    syncFromEnvironment();
    window.addEventListener("focus", syncFromEnvironment);
    document.addEventListener("visibilitychange", syncFromEnvironment);
    window.addEventListener("sayban-fcm-updated", syncFromEnvironment);
    window.addEventListener("sayban-notification-status", syncFromEnvironment);
    window.addEventListener("sayban-native-ready", syncFromEnvironment);
    return () => {
      window.removeEventListener("focus", syncFromEnvironment);
      document.removeEventListener("visibilitychange", syncFromEnvironment);
      window.removeEventListener("sayban-fcm-updated", syncFromEnvironment);
      window.removeEventListener(
        "sayban-notification-status",
        syncFromEnvironment
      );
      window.removeEventListener("sayban-native-ready", syncFromEnvironment);
    };
  }, [persistNotificationStatus, props.userinfo]);

  const pageBase =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "user";

  const goToSupport = React.useCallback(() => {
    router.push(`/${pageBase}/support`);
  }, [pageBase, router]);

  const goToFavorites = React.useCallback(() => {
    router.push(`/${pageBase}/favorites`);
  }, [pageBase, router]);

  const setRootRef = React.useCallback(
    (node: HTMLElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") {
        ref(node as never);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    [ref]
  );

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cleanups: Array<() => void> = [];

    const supportRow =
      (root.querySelector(
        `.${userSty.freeBox__ux03}`
      ) as HTMLElement | null) ||
      (Array.from(root.querySelectorAll("div")).find(el =>
        (el.textContent || "").trim().startsWith("پشتیبانی")
      ) as HTMLElement | undefined) ||
      null;

    if (supportRow) {
      cleanups.push(installMenuRowHandlers(supportRow, goToSupport));
    }

    const favCleanup = wireFavoritesMenuRow(root, goToFavorites);
    if (favCleanup) cleanups.push(favCleanup);

    return () => {
      cleanups.forEach(fn => fn());
    };
  }, [goToFavorites, goToSupport]);


  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const guest = isGuestOnly();
    const row =
      (root.querySelector(`.${userSty.freeBox__lTj}`) as HTMLElement | null) ||
      null;
    if (!row) return;

    const label =
      (root.querySelector(`.${userSty.text__v37Am}`) as HTMLElement | null) ||
      null;
    const previousLabel = label?.textContent || "";
    if (guest && label) {
      label.textContent = "ساخت حساب کاربری";
    }

    if (!guest) return;

    const onActivate = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      void router.push("/login/mobile");
    };
    // Capture phase so Plasmic modal open does not run.
    row.addEventListener("click", onActivate, true);
    return () => {
      row.removeEventListener("click", onActivate, true);
      if (label) label.textContent = previousLabel;
    };
  }, [props.userinfo, router]);

  const switchSelected = isNotificationSwitchOn(props.userinfo?.isnotif);

  const { overrides, ...restProps } = props;
  return (
    <PlasmicUser
      root={{ ref: setRootRef }}
      {...restProps}
      overrides={{
        ...overrides,
        // Generated handler only expires domain=.darkube.ir and leaves guest
        // localStorage intact — replace so both prod hosts clear cleanly.
        button2: {
          render: (ps: any, Comp: React.ComponentType<any>) => {
            const { onClick: _ignore, ...rest } = ps ?? {};
            return (
              <Comp
                {...rest}
                onClick={() => {
                  if (isGuestOnly()) {
                    void router.push("/login/mobile");
                    return;
                  }
                  logoutPublic();
                }}
              />
            );
          }
        },
        _switch: {
          render: (renderProps: any, DefaultSwitch: any) => (
            <DefaultSwitch
              {...renderProps}
              isSelected={switchSelected}
              onChange={async (next: boolean) => {
                await renderProps.onChange?.(next);
                await persistNotificationStatus(Boolean(next));
              }}
            />
          )
        }
      }}
    />
  );
}

const User = React.forwardRef(User_);
export default User;
