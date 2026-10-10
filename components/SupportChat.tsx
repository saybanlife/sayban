import * as React from "react";
import { useRouter } from "next/router";
import { classNames } from "@plasmicapp/react-web";
import { _useStyleTokens } from "./plasmic/sayban/PlasmicStyleTokensProvider";
import sty from "./plasmic/sayban/PlasmicSupport.module.css";
import chatStyles from "./SupportChat.module.css";
import embedStyles from "./support/SupportEmbed.module.css";
import Header from "./Header";
import Button from "./Button";
import {
  getSupportMessages,
  sendSupportMessage
} from "./support/supportApi";
import {
  normalizeSupportMessages,
  type SupportMessage
} from "./support/supportTypes";
import {
  canGoBackWithinApp,
  registerSupportBounce
} from "./support/supportNavigation";
import {
  supportMessagesKey,
  useStickMessagesToBottom
} from "./support/useStickMessagesToBottom";

export type SupportChatProps = {
  conversationId: string;
  embedded?: boolean;
  className?: string;
  onBack?: () => void;
};

function SupportChat({
  conversationId,
  embedded = false,
  className,
  onBack
}: SupportChatProps) {
  const router = useRouter();
  const styleTokensClassNames = _useStyleTokens();
  const listRef = React.useRef<HTMLDivElement>(null);
  const [messages, setMessages] = React.useState<SupportMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { scrollToBottom } = useStickMessagesToBottom(listRef, {
    threadKey: conversationId,
    messageKey: supportMessagesKey(messages),
    loading: loading && messages.length === 0
  });

  const page =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "home";

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (registerSupportBounce()) {
      router.replace(`/${page}`);
      return;
    }
    // Pop the entry the support landing pushed instead of pushing it again,
    // which is what used to trap the user between the two screens.
    if (canGoBackWithinApp()) {
      router.back();
      return;
    }
    router.replace(`/${page}/support`);
  };

  const loadMessages = React.useCallback(async () => {
    setError(null);
    try {
      const { ok, data } = await getSupportMessages(conversationId);
      if (!ok || data?.success === false) {
        setError(data?.message || "بارگذاری پیام‌ها ناموفق بود.");
        return;
      }
      setMessages(normalizeSupportMessages(data?.result ?? data));
    } catch {
      setError("خطا در دریافت پیام‌ها.");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  React.useEffect(() => {
    setLoading(true);
    void loadMessages();
    const timer = window.setInterval(() => {
      void loadMessages();
    }, 12000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const { ok, data } = await sendSupportMessage(conversationId, text);
      if (!ok || data?.success === false) {
        setError(data?.message || "ارسال پیام ناموفق بود.");
        return;
      }
      setDraft("");
      const created = (data?.result ?? null) as SupportMessage | null;
      if (created?.id) {
        setMessages(prev => {
          if (prev.some(item => item.id === created.id)) return prev;
          return [...prev, created];
        });
      } else {
        await loadMessages();
      }
      scrollToBottom("auto");
    } catch {
      setError("خطا در ارسال پیام.");
    } finally {
      setSending(false);
    }
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
        embedded ? chatStyles.embedded : chatStyles.root,
        className
      )}
    >
      <Header
        className={classNames("__wab_instance", sty.header)}
        search={false}
        runCode
        back={handleBack}
        slot={
          <div className={chatStyles.headerSlot}>
            <div className={chatStyles.headerTitle}>گفتگو</div>
          </div>
        }
      />

      <div
        className={classNames(
          chatStyles.shell,
          embedded && embedStyles.embedContent
        )}
      >
        <div className={chatStyles.messages} ref={listRef}>
          {loading && messages.length === 0 ? (
            <div className={chatStyles.empty}>در حال بارگذاری پیام‌ها...</div>
          ) : null}
          {!loading && messages.length === 0 ? (
            <div className={chatStyles.empty}>هنوز پیامی ثبت نشده است.</div>
          ) : null}
          {messages.map(item => {
            const mine = item.sender_type === "user";
            return (
              <div
                key={item.id}
                className={classNames(
                  chatStyles.bubbleRow,
                  mine ? chatStyles.mine : chatStyles.theirs
                )}
              >
                <div
                  className={classNames(
                    chatStyles.bubble,
                    mine ? chatStyles.bubbleMine : chatStyles.bubbleTheirs
                  )}
                >
                  <div className={chatStyles.bubbleSender}>
                    {mine ? "شما" : "پشتیبانی سایبان"}
                  </div>
                  <div className={chatStyles.bubbleText}>{item.message}</div>
                </div>
              </div>
            );
          })}
          <div
            className={chatStyles.scrollAnchor}
            data-support-scroll-anchor=""
            aria-hidden="true"
          />
        </div>

        {error ? <div className={chatStyles.error}>{error}</div> : null}

        <div className={chatStyles.composer}>
          <input
            className={chatStyles.input}
            placeholder="پیامتون رو بنویسین"
            value={draft}
            disabled={sending}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <Button
            className={chatStyles.send}
            color="success"
            disabled={sending || !draft.trim()}
            label={sending ? "..." : "ارسال"}
            onClick={() => {
              void send();
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default SupportChat;
