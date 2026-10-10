import * as React from "react";
import {
  PlasmicComments,
  DefaultCommentsProps
} from "./plasmic/sayban/PlasmicComments";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import {
  panelDeleteCenterReview,
  panelReviewsErrorMessage
} from "./reviews/panelReviewsApi";
import { resolveCenterReviewId } from "./centerPage/centerHelpers";

export interface CommentsProps extends DefaultCommentsProps {
  /** When true, each review shows a delete action (panel Super Admin). */
  canDeleteReviews?: boolean;
  token?: string;
}

function Comments_(props: CommentsProps, ref: HTMLElementRefOf<"div">) {
  const { canDeleteReviews, token, reviews, onReviewsChange, ...rest } = props;
  const globalActions = useGlobalActions();
  const toast = (type: "success" | "error", message: string) =>
    globalActions?.["Fragment.showToast"]?.(type, message, "top-center");

  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const list = Array.isArray(reviews) ? reviews : [];

  const handleDelete = React.useCallback(
    async (reviewId: number) => {
      if (!canDeleteReviews || !reviewId) return;
      if (
        !window.confirm(
          "این نظر به‌طور کامل حذف شود؟ این عمل قابل بازگشت نیست."
        )
      ) {
        return;
      }
      setDeletingId(reviewId);
      try {
        const { ok, data } = await panelDeleteCenterReview(token, reviewId);
        if (!ok || data?.success === false) {
          toast(
            "error",
            panelReviewsErrorMessage(data?.message, "حذف نظر ناموفق بود.")
          );
          return;
        }
        const next = list.filter(
          (item: { id?: unknown; review_id?: unknown }) =>
            resolveCenterReviewId(item) !== reviewId
        );
        onReviewsChange?.(next as never);
        toast("success", "نظر حذف شد.");
      } finally {
        setDeletingId(null);
      }
    },
    [canDeleteReviews, token, list, onReviewsChange]
  );

  return (
    <PlasmicComments
      root={{ ref }}
      {...rest}
      reviews={reviews}
      onReviewsChange={onReviewsChange}
      overrides={{
        comment: {
          wrap: (node: React.ReactNode) => {
            if (!React.isValidElement(node)) return node;
            const user = (node.props as { user?: { id?: unknown; review_id?: unknown } })
              .user;
            const reviewId = resolveCenterReviewId(user);
            return React.cloneElement(node as React.ReactElement, {
              canDelete: Boolean(canDeleteReviews) && reviewId > 0,
              deleting: deletingId === reviewId,
              onDeleteReview:
                canDeleteReviews && reviewId > 0
                  ? () => handleDelete(reviewId)
                  : undefined
            });
          }
        }
      }}
    />
  );
}

const Comments = React.forwardRef(Comments_);
export default Comments;
