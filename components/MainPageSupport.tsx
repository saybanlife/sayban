import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import Button from "./Button";
import EmptyPage from "./EmptyPage";
import styles from "./MainPageSupport.module.css";
import {
  panelChangeSupportStatus,
  panelCloseSupportConversation,
  panelGetSupportMessages,
  panelListSupportConversations,
  panelReplySupport
} from "./support/supportApi";
import {
  SUPPORT_STATUS_LABELS,
  formatSupportDateTime,
  type SupportConversation,
  type SupportListStatusFilter,
  type SupportMessage,
  type SupportStatus
} from "./support/supportTypes";
import {
  supportMessagesKey,
  useStickMessagesToBottom
} from "./support/useStickMessagesToBottom";

type MainPageSupportProps = {
  token?: string;
  className?: string;
};

const FILTERS: Array<{ value: SupportListStatusFilter; label: string }> = [
  { value: "all", label: "همه" },
  { value: "unanswered", label: "پاسخ داده نشده" },
  { value: "open", label: SUPPORT_STATUS_LABELS.open },
  { value: "pending", label: SUPPORT_STATUS_LABELS.pending },
  { value: "answered", label: SUPPORT_STATUS_LABELS.answered },
  { value: "closed", label: SUPPORT_STATUS_LABELS.closed }
];

/** Same cadence as public SupportChat — keep the open thread live for the operator. */
const PANEL_SUPPORT_MESSAGES_POLL_MS = 12_000;

function sameSupportMessages(
  prev: SupportMessage[],
  next: SupportMessage[]
): boolean {
  if (prev.length !== next.length) return false;
  return prev.every(
    (message, index) =>
      message.id === next[index]?.id &&
      message.message === next[index]?.message &&
      message.sender_type === next[index]?.sender_type
  );
}

export function MainPageSupport({ token, className }: MainPageSupportProps) {
  const globalActions = useGlobalActions();
  const toast = (type: "success" | "error", message: string) =>
    globalActions?.["Fragment.showToast"]?.(type, message, "top-center");

  const messagesRef = React.useRef<HTMLDivElement>(null);
  const [items, setItems] = React.useState<SupportConversation[]>([]);
  const [messages, setMessages] = React.useState<SupportMessage[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [statusFilter, setStatusFilter] =
    React.useState<SupportListStatusFilter>("all");
  const [query, setQuery] = React.useState("");
  const [draft, setDraft] = React.useState("");

  const { scrollToBottom } = useStickMessagesToBottom(messagesRef, {
    threadKey: selectedId,
    messageKey: supportMessagesKey(messages),
    loading: loadingMessages && messages.length === 0
  });

  const selected = React.useMemo(
    () => items.find(item => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await panelListSupportConversations(token, {
        status: statusFilter,
        q: query
      });
      if (!ok || data?.success === false) {
        toast("error", data?.message || "بارگذاری گفتگوها ناموفق بود.");
        return;
      }
      const next = Array.isArray(data?.result) ? data.result : [];
      setItems(next as SupportConversation[]);
      setSelectedId(current => {
        if (
          current &&
          next.some((item: SupportConversation) => item.id === current)
        ) {
          return current;
        }
        return next[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, query]);

  const loadMessages = React.useCallback(
    async (
      conversationId: number,
      options?: { silent?: boolean }
    ) => {
      const silent = Boolean(options?.silent);
      if (!silent) setLoadingMessages(true);
      try {
        const { ok, data } = await panelGetSupportMessages(
          token,
          conversationId
        );
        if (!ok || data?.success === false) {
          if (!silent) {
            toast("error", data?.message || "بارگذاری پیام‌ها ناموفق بود.");
          }
          return;
        }
        const next = (
          Array.isArray(data?.result) ? data.result : []
        ) as SupportMessage[];
        setMessages(prev => (sameSupportMessages(prev, next) ? prev : next));
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [token]
  );

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  React.useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void loadMessages(selectedId, { silent: true });
    };
    const timer = window.setInterval(tick, PANEL_SUPPORT_MESSAGES_POLL_MS);
    return () => window.clearInterval(timer);
  }, [selectedId, loadMessages]);

  const sendReply = async () => {
    if (!selectedId || !draft.trim()) return;
    setSaving(true);
    try {
      const { ok, data } = await panelReplySupport(token, selectedId, draft);
      if (!ok || data?.success === false) {
        toast("error", data?.message || "ارسال پاسخ ناموفق بود.");
        return;
      }
      setDraft("");
      toast("success", "پاسخ ارسال شد.");
      await Promise.all([loadMessages(selectedId), loadItems()]);
      scrollToBottom("auto");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: SupportStatus) => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const { ok, data } = await panelChangeSupportStatus(
        token,
        selectedId,
        status
      );
      if (!ok || data?.success === false) {
        toast("error", data?.message || "تغییر وضعیت ناموفق بود.");
        return;
      }
      toast("success", "وضعیت به‌روز شد.");
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  const closeConversation = async () => {
    if (!selectedId) return;
    if (!window.confirm("این گفتگو بسته شود؟")) return;
    setSaving(true);
    try {
      const { ok, data } = await panelCloseSupportConversation(
        token,
        selectedId
      );
      if (!ok || data?.success === false) {
        toast("error", data?.message || "بستن گفتگو ناموفق بود.");
        return;
      }
      toast("success", "گفتگو بسته شد.");
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <div className={styles.title}>پشتیبانی</div>
        <div className={styles.headerActions}>
          <Button
            color="second"
            loading={saving || loading}
            disabel={saving || loading}
            label={<span className={styles.buttonLabel}>بروزرسانی</span>}
            onClick={() => {
              void loadItems();
              if (selectedId) void loadMessages(selectedId);
            }}
          />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.toolbar}>
          <input
            className={styles.search}
            placeholder="جستجو نام، شناسه یا متن پیام"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") void loadItems();
            }}
          />
          <div className={styles.filters}>
            {FILTERS.map(filter => (
              <button
                key={filter.value}
                type="button"
                className={[
                  styles.filterChip,
                  statusFilter === filter.value ? styles.filterChipActive : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.split}>
          <div className={styles.panel}>
            {loading ? (
              <div className={styles.loadingState}>در حال بارگذاری...</div>
            ) : items.length === 0 ? (
              <EmptyPage className={styles.emptyPage} />
            ) : (
              <div className={styles.list}>
                {items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={[
                      styles.listItem,
                      selectedId === item.id ? styles.listItemActive : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div className={styles.listTop}>
                      <strong>
                        {item.user_name || `کاربر ${item.user_id}`}
                      </strong>
                      <span className={styles.badge}>
                        {SUPPORT_STATUS_LABELS[item.status] || item.status}
                      </span>
                    </div>
                    <div className={styles.listMeta}>
                      ID: {item.user_id} · پیام‌ها: {item.message_count ?? 0}
                    </div>
                    <div className={styles.listPreview}>
                      {item.last_message || "—"}
                    </div>
                    <div className={styles.listTime}>
                      {formatSupportDateTime(
                        item.last_message_at || item.updated_at
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.detail}>
            {!selected ? (
              <div className={styles.loadingState}>یک گفتگو را انتخاب کنید.</div>
            ) : (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <div className={styles.detailTitle}>
                      {selected.user_name || `کاربر ${selected.user_id}`}
                    </div>
                    <div className={styles.listMeta}>
                      User ID: {selected.user_id} · ایجاد:{" "}
                      {formatSupportDateTime(selected.created_at)}
                    </div>
                  </div>
                  <div className={styles.detailActions}>
                    <select
                      className={styles.statusSelect}
                      value={selected.status}
                      disabled={saving}
                      onChange={event =>
                        void changeStatus(event.target.value as SupportStatus)
                      }
                    >
                      {(
                        Object.keys(SUPPORT_STATUS_LABELS) as SupportStatus[]
                      ).map(status => (
                        <option key={status} value={status}>
                          {SUPPORT_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <Button
                      color="errorDestructive"
                      loading={saving}
                      disabel={saving || selected.status === "closed"}
                      label={<span className={styles.buttonLabel}>بستن</span>}
                      onClick={() => {
                        void closeConversation();
                      }}
                    />
                  </div>
                </div>

                <div className={styles.messages} ref={messagesRef}>
                  {loadingMessages && messages.length === 0 ? (
                    <div className={styles.loadingState}>
                      در حال بارگذاری پیام‌ها...
                    </div>
                  ) : (
                    <>
                      {messages.map(message => (
                        <div
                          key={message.id}
                          className={[
                            styles.message,
                            message.sender_type === "superadmin"
                              ? styles.messageAdmin
                              : styles.messageUser
                          ].join(" ")}
                        >
                          <div className={styles.messageText}>
                            {message.message}
                          </div>
                          <div className={styles.messageMeta}>
                            {message.sender_type === "superadmin"
                              ? "پشتیبانی"
                              : "کاربر"}{" "}
                            · {formatSupportDateTime(message.created_at)}
                          </div>
                        </div>
                      ))}
                      <div
                        className={styles.scrollAnchor}
                        data-support-scroll-anchor=""
                        aria-hidden="true"
                      />
                    </>
                  )}
                </div>

                <div className={styles.composer}>
                  <textarea
                    className={styles.reply}
                    placeholder="پاسخ خود را بنویسید..."
                    value={draft}
                    disabled={saving || selected.status === "closed"}
                    onChange={event => setDraft(event.target.value)}
                    rows={3}
                  />
                  <Button
                    color="success"
                    loading={saving}
                    disabel={
                      saving || selected.status === "closed" || !draft.trim()
                    }
                    label={
                      <span className={styles.buttonLabel}>ارسال پاسخ</span>
                    }
                    onClick={() => {
                      void sendReply();
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainPageSupport;
