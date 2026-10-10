import * as React from "react";
import { useRouter } from "next/router";
import { classNames } from "@plasmicapp/react-web";
import { _useStyleTokens } from "./plasmic/sayban/PlasmicStyleTokensProvider";
import sty from "./plasmic/sayban/PlasmicSupport.module.css";
import supportStyles from "./Support.module.css";
import embedStyles from "./support/SupportEmbed.module.css";
import Header from "./Header";
import Button from "./Button";
import { useSubmitAction } from "./useSubmitAction";
import {
  createSupportConversation,
  getMySupportConversations
} from "./support/supportApi";
import {
  SUPPORT_PHONE,
  SUPPORT_STATUS_LABELS,
  formatSupportDateTime,
  normalizeSupportConversations,
  type SupportConversation
} from "./support/supportTypes";
import {
  canGoBackWithinApp,
  registerSupportBounce,
  resetSupportBounce
} from "./support/supportNavigation";

export type SupportProps = {
  className?: string;
  embedded?: boolean;
  onBack?: () => void;
};

function Support({ className, embedded = false, onBack }: SupportProps) {
  const router = useRouter();
  const styleTokensClassNames = _useStyleTokens();
  const [message, setMessage] = React.useState("");
  // Starting a chat navigates on success, so it runs behind the blocking
  // overlay: the user must not fire it twice or leave mid-request.
  const { inFlight: busy, run } = useSubmitAction();
  const [error, setError] = React.useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = React.useState(true);
  const [conversations, setConversations] = React.useState<SupportConversation[]>(
    []
  );

  const page =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "home";

  const handleBack = () => {
    if (registerSupportBounce()) {
      router.replace(`/${page}`);
      return;
    }
    if (onBack) {
      onBack();
      return;
    }
    if (canGoBackWithinApp()) {
      router.back();
      return;
    }
    router.push(`/${page}/user`);
  };

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { ok, data } = await getMySupportConversations();
      if (ok && data?.success !== false) {
        setConversations(normalizeSupportConversations(data?.result ?? data));
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const startChat = () => {
    const text = message.trim();
    if (!text) {
      setError("لطفاً پیامتان را بنویسید.");
      return;
    }
    setError(null);
    return run(
      async () => {
        try {
          const { ok, data } = await createSupportConversation(text);
          const conversation = (
            data as { result?: SupportConversation; id?: number }
          )?.result;
          const id = conversation?.id ?? (data as { id?: number })?.id;
          if (!ok || data?.success === false || !id) {
            setError(data?.message || "شروع گفتگو ناموفق بود.");
            return;
          }
          resetSupportBounce();
          router.push(`/${page}/support_chat_${id}`);
        } catch {
          setError("خطا در ارتباط با سرور پشتیبانی.");
        }
      },
      { blocking: true, message: "در حال شروع گفتگو..." }
    );
  };

  const openConversation = (id: number) => {
    resetSupportBounce();
    router.push(`/${page}/support_chat_${id}`);
  };

  return (
    <div
      className={classNames(
        "all",
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styleTokensClassNames,
        embedded ? embedStyles.embedRoot : sty.root,
        className
      )}
    >
      <Header
        className={classNames("__wab_instance", sty.header)}
        search={false}
        runCode
        back={handleBack}
        slot="پشتیبانی"
      />

      <div
        className={classNames(
          "all",
          sty.freeBox___3RCiB,
          embedded && embedStyles.embedContent
        )}
      >
        <div className={supportStyles.card}>
          <div className={supportStyles.statusRow}>
            <span className={supportStyles.statusDot} aria-hidden />
            <span className={supportStyles.statusText}>پشتیبانی آنلاین</span>
          </div>
          <p className={supportStyles.hint}>
            سوال یا مشکلتان را بنویسید تا تیم پشتیبانی سایبان پاسخ دهد.
          </p>
          <textarea
            className={supportStyles.textarea}
            placeholder="پیامتون رو بنویسین"
            value={message}
            rows={5}
            disabled={busy}
            onChange={event => setMessage(event.target.value)}
          />
          {error ? <div className={supportStyles.error}>{error}</div> : null}
          <Button
            className={supportStyles.cta}
            color="success"
            disabled={busy}
            label={busy ? "در حال اتصال..." : "شروع گفتگو"}
            onClick={startChat}
          />
          <a className={supportStyles.phoneLink} href={`tel:${SUPPORT_PHONE}`}>
            تماس با پشتیبانی — {SUPPORT_PHONE}
          </a>
        </div>

        <div className={supportStyles.historyCard}>
          <div className={supportStyles.historyTitle}>گفتگوهای قبلی</div>
          {historyLoading ? (
            <div className={supportStyles.historyEmpty}>در حال بارگذاری...</div>
          ) : conversations.length === 0 ? (
            <div className={supportStyles.historyEmpty}>
              هنوز گفتگویی ثبت نشده است.
            </div>
          ) : (
            <div className={supportStyles.historyList}>
              {conversations.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={supportStyles.historyItem}
                  onClick={() => openConversation(item.id)}
                >
                  <div className={supportStyles.historyTop}>
                    <span className={supportStyles.historyPreview}>
                      {item.last_message || "بدون پیام"}
                    </span>
                    <span className={supportStyles.historyBadge}>
                      {SUPPORT_STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                  <div className={supportStyles.historyMeta}>
                    {formatSupportDateTime(item.last_message_at || item.updated_at)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Support;
