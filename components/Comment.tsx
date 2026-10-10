import * as React from "react";
import {
  PlasmicComment,
  DefaultCommentProps
} from "./plasmic/sayban/PlasmicComment";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  formatRelativeDateFa,
  type CenterReviewItem
} from "./centerPage/centerHelpers";
import styles from "./CommentReply.module.css";

export interface CommentProps extends DefaultCommentProps {
  canDelete?: boolean;
  deleting?: boolean;
  onDeleteReview?: () => void;
}

function readUser(props: CommentProps): CenterReviewItem | undefined {
  const user = (props as { user?: CenterReviewItem }).user;
  return user && typeof user === "object" ? user : undefined;
}

function Comment_(props: CommentProps, ref: HTMLElementRefOf<"div">) {
  const { canDelete, deleting, onDeleteReview, ...rest } = props;
  const user = readUser(props);
  const reply = String(user?.admin_reply || "").trim();

  return (
    <div className={styles.wrap}>
      <PlasmicComment root={{ ref }} {...rest} />
      {reply ? (
        <div className={styles.reply} dir="rtl">
          <div className={styles.replyLabel}>پاسخ مرکز</div>
          <div className={styles.replyText}>{reply}</div>
          {user?.admin_replied_at ? (
            <div className={styles.replyMeta}>
              {formatRelativeDateFa(String(user.admin_replied_at))}
            </div>
          ) : null}
        </div>
      ) : null}
      {canDelete && onDeleteReview ? (
        <div className={styles.deleteRow}>
          <button
            type="button"
            className={styles.deleteBtn}
            disabled={Boolean(deleting)}
            onClick={onDeleteReview}
          >
            {deleting ? "در حال حذف…" : "حذف نظر"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

const Comment = React.forwardRef(Comment_);
export default Comment;
