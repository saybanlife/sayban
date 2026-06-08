import React, { useState, useEffect, useRef } from "react";
import { classNames } from "@plasmicapp/react-web";
import { CodeComponentMeta } from "@plasmicapp/host";

type TextCollapseProps = {
  text?: string;
  maxLines?: number;
  enableToggle?: boolean;

  className?: string;       // قابل استایل از پلزمیک
  textClassName?: string;   // قابل استایل از پلزمیک
  buttonClassName?: string; // قابل استایل از پلزمیک
};

export const TextCollapse = (props: TextCollapseProps) => {
  const {
    text = "",
    maxLines = 3,
    enableToggle = true,
    className,
    textClassName,
    buttonClassName,
  } = props;

  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const el = textRef.current;
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      const maxHeight = lineHeight * maxLines;

      setIsOverflowing(el.scrollHeight > maxHeight);
    }
  }, [text, maxLines]);

  return (
    <div className={classNames("tc-wrapper", className)}>
      <div
        ref={textRef}
        className={classNames("tc-text", textClassName)}
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          transition: "all 0.3s ease-in-out",
          WebkitLineClamp: expanded ? "unset" : maxLines,
          whiteSpace: "pre-line",
        }}
      >
        {text}
      </div>

      {enableToggle && isOverflowing && (
        <button
          className={classNames("tc-toggle-btn", buttonClassName)}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "نمایش کمتر" : "نمایش بیشتر"}
        </button>
      )}
    </div>
  );
};

export const TextCollapseMeta: CodeComponentMeta<TextCollapseProps> = {
  name: "TextCollapse",
  importPath: "@/components/TextCollapse",
  props: {
    text: {
      type: "string",
      defaultValue: "متنی که می‌تواند طولانی باشد...",
    },
    maxLines: {
      type: "number",
      defaultValue: 3,
    },
    enableToggle: {
      type: "boolean",
      defaultValue: true,
    },

    className: {
      type: "class",
      displayName: "Wrapper Style",
    },
    textClassName: {
      type: "class",
      displayName: "Text Style",
    },
    buttonClassName: {
      type: "class",
      displayName: "Button Style",
    },
  },
};
