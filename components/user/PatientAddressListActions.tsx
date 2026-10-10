import * as React from "react";
import styles from "./PatientAddressList.module.css";

type Props = {
  onEdit: () => void;
  onDelete: () => void;
  busy?: boolean;
  editLabel?: string;
  deleteLabel?: string;
};

export default function PatientAddressListActions({
  onEdit,
  onDelete,
  busy = false,
  editLabel = "ویرایش",
  deleteLabel = "حذف"
}: Props) {
  return (
    <div className={styles.listActions}>
      <button
        type="button"
        className={styles.actionBtn}
        aria-label={editLabel}
        title={editLabel}
        disabled={busy}
        onClick={onEdit}
      >
        <svg
          className={styles.actionIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
        aria-label={deleteLabel}
        title={deleteLabel}
        disabled={busy}
        onClick={onDelete}
      >
        <svg
          className={styles.actionIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </div>
  );
}
