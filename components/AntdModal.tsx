import * as React from "react";
import Modal, { type ModalProps } from "./Modal";
import styles from "./AntdModalBridge.module.css";

/**
 * Drop-in replacement for `@plasmicpkgs/antd5` AntdModal that renders
 * Sayban's PlasmicModal wrapper (`components/Modal`). Keeps the generated
 * Plasmic prop surface (`open`, `children`, `hideFooter`, `title`, …) so
 * panel pages keep the same open/close, footer, and form behavior.
 */
export type AntdModalBridgeProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Ant Design compat — fired when open state changes (panel remount hooks). */
  afterOpenChange?: (open: boolean) => void;
  /** Ant Design compat — unmount body while closed. */
  destroyOnClose?: boolean;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  hideFooter?: boolean;
  title?: React.ReactNode;
  trigger?: React.ReactNode;
  maskClosable?: boolean;
  className?: string;
  width?: number | string;
  closeIcon?: React.ReactNode;
  /** Ignored — ant-only styling hooks */
  defaultStylesClassName?: string;
  modalContentClassName?: string;
  modalScopeClassName?: string;
  wrapClassName?: string;
  "data-plasmic-name"?: string;
  "data-plasmic-override"?: {
    className?: string;
    props?: Record<string, unknown>;
  };
};

function normalizeWidth(width: number | string | undefined): string | undefined {
  if (width == null || width === "") return undefined;
  if (typeof width === "number") return `${width}px`;
  if (/^\d+$/.test(String(width))) return `${width}px`;
  return String(width);
}

export function AntdModal({
  open,
  defaultOpen,
  onOpenChange,
  afterOpenChange,
  destroyOnClose = false,
  children,
  footer,
  hideFooter = false,
  title,
  trigger = null,
  maskClosable = true,
  className,
  width,
  closeIcon: _closeIcon,
  defaultStylesClassName: _defaultStyles,
  modalContentClassName,
  modalScopeClassName,
  wrapClassName,
  "data-plasmic-name": _dataPlasmicName,
  "data-plasmic-override": dataPlasmicOverride,
  ...rest
}: AntdModalBridgeProps) {
  const isOpen = Boolean(open ?? defaultOpen);
  const resolvedWidth = normalizeWidth(width);
  const showHeader = title != null && title !== false;
  const showFooter = !hideFooter && footer != null && footer !== false;

  const prevOpenRef = React.useRef<boolean | null>(null);
  React.useEffect(() => {
    if (prevOpenRef.current === isOpen) return;
    prevOpenRef.current = isOpen;
    afterOpenChange?.(isOpen);
  }, [isOpen, afterOpenChange]);

  const dialogClass = [
    styles.dialog,
    modalContentClassName,
    modalScopeClassName,
    wrapClassName
  ]
    .filter(Boolean)
    .join(" ");

  const overrideClass =
    dataPlasmicOverride && typeof dataPlasmicOverride === "object"
      ? dataPlasmicOverride.className
      : undefined;
  const overrideProps =
    dataPlasmicOverride && typeof dataPlasmicOverride === "object"
      ? dataPlasmicOverride.props
      : undefined;

  const body =
    destroyOnClose && !isOpen ? null : (children as React.ReactNode);

  const modalProps: ModalProps = {
    ...(rest as ModalProps),
    ...(overrideProps as ModalProps | undefined),
    className: [className, overrideClass].filter(Boolean).join(" ") || undefined,
    isOpen,
    onOpenChange,
    content: body,
    heading: showHeader ? title : null,
    footer: showFooter ? footer : null,
    showHeader,
    showFooter,
    closeOnBackdropClick: maskClosable !== false,
    trigger: trigger ?? null,
    noTrigger: trigger == null ? "noTrigger" : undefined,
    overrides: {
      ariaDialog: {
        className: dialogClass,
        style: resolvedWidth
          ? ({
              width: resolvedWidth,
              maxWidth: "min(100vw, 100%)"
            } as React.CSSProperties)
          : undefined
      }
    }
  };

  return <Modal {...modalProps} />;
}

export default AntdModal;
