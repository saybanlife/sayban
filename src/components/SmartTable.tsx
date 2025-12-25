import React, {
  forwardRef,
  useMemo,
  useState,
} from "react";
import { CodeComponentMeta } from "@plasmicapp/host";

export type ColumnType = "text" | "number" | "price" | "checkbox";

export type Column = {
  key: string;
  title: string;
  type?: ColumnType;
};

export type SmartTableProps = {
  columns: Column[];
  data: Record<string, any>[];
  className?: string;

  sortable?: boolean;
  mobileCardView?: boolean;
  selectableRows?: boolean;
  autoDetectColumnType?: boolean;

  selectedRowIndexes?: number[];
  onSelectedRowIndexesChange?: (rows: number[]) => void;
};

export const SmartTable = forwardRef<HTMLDivElement, SmartTableProps>(
  (props, ref) => {
    const {
      columns,
      data,
      className,

      sortable = false,
      mobileCardView = false,
      selectableRows = false,
      autoDetectColumnType = false,

      selectedRowIndexes = [],
      onSelectedRowIndexesChange,
    } = props;

    const [sortConfig, setSortConfig] = useState<{
      key: string;
      direction: "asc" | "desc";
    } | null>(null);

    const detectType = (value: any): ColumnType => {
      if (typeof value === "number") return "number";
      if (typeof value === "string" && value.startsWith("$")) return "price";
      return "text";
    };

    const resolvedColumns = useMemo(() => {
      if (!autoDetectColumnType) return columns;
      return columns.map((col) => ({
        ...col,
        type: col.type ?? detectType(data?.[0]?.[col.key]),
      }));
    }, [columns, autoDetectColumnType, data]);

    const sortedData = useMemo(() => {
      if (!sortConfig) return data;
      return [...data].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        return 0;
      });
    }, [data, sortConfig]);

    const toggleSort = (key: string) => {
      if (!sortable) return;
      setSortConfig((prev) =>
        prev?.key === key
          ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
          : { key, direction: "asc" }
      );
    };

    const toggleRow = (index: number) => {
      const next = selectedRowIndexes.includes(index)
        ? selectedRowIndexes.filter((i) => i !== index)
        : [...selectedRowIndexes, index];
      onSelectedRowIndexesChange?.(next);
    };

    const isSmall = (type?: ColumnType) =>
      type === "number" || type === "price" || type === "checkbox";

    return (
      <div
        ref={ref}
        className={`smart-table ${mobileCardView ? "card-view" : ""} ${
          className || ""
        }`}
      >
        {/* CSS */}
        <style>{`
          .smart-table {
            display: flex;
            flex-direction: column;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
          }

          .smart-header,
          .smart-row {
            display: flex;
            align-items: center;
          }

          .smart-header {
            font-weight: 600;
            background: #f4f4f4;
            cursor: default;
          }

          .smart-cell {
            flex: 1;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .smart-cell.small {
            flex: 0.4;
            justify-content: center;
            white-space: nowrap;
          }

          .smart-row:hover {
            background: #fafafa;
          }

          /* Mobile card view */
          .card-view .smart-header {
            display: none;
          }

          .card-view .smart-row {
            flex-direction: column;
            border-bottom: 1px solid #eee;
            padding: 8px;
          }

          .card-view .smart-cell {
            width: 100%;
            justify-content: space-between;
          }
        `}</style>

        {/* HEADER */}
        <div className="smart-header">
          {selectableRows && (
            <div className="smart-cell small">✓</div>
          )}
          {resolvedColumns.map((col) => (
            <div
              key={col.key}
              className={`smart-cell ${isSmall(col.type) ? "small" : ""}`}
              onClick={() => toggleSort(col.key)}
            >
              {col.title}
              {sortable && sortConfig?.key === col.key && (
                <span>{sortConfig.direction === "asc" ? "▲" : "▼"}</span>
              )}
            </div>
          ))}
        </div>

        {/* ROWS */}
        {sortedData.map((row, rowIndex) => (
          <div key={rowIndex} className="smart-row">
            {selectableRows && (
              <div className="smart-cell small">
                <input
                  type="checkbox"
                  checked={selectedRowIndexes.includes(rowIndex)}
                  onChange={() => toggleRow(rowIndex)}
                />
              </div>
            )}
            {resolvedColumns.map((col) => (
              <div
                key={col.key}
                className={`smart-cell ${isSmall(col.type) ? "small" : ""}`}
              >
                {row[col.key]}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
);
export const SmartTableMeta: CodeComponentMeta<SmartTableProps> = {
  name: "SmartTable",
  importPath: "@/components/SmartTable",
  props: {
    columns: {
      type: "array",
      itemType: {
        type: "object",
        fields: {
          key: { type: "string" },
          title: { type: "string" },
          type: {
            type: "choice",
            options: ["text", "number", "price", "checkbox"],
          },
        },
      },
    },

    data: {
      type: "array",
      itemType: {
        type: "object",
        // دیتا آزاد → Plasmic اجازه میده
        fields: {},
      },
    },

    className: { type: "class" },

    sortable: { type: "boolean", defaultValue: false },
    mobileCardView: { type: "boolean", defaultValue: false },
    selectableRows: { type: "boolean", defaultValue: false },
    autoDetectColumnType: { type: "boolean", defaultValue: false },

    selectedRowIndexes: {
      type: "array",
      itemType: "number",
    },

    onSelectedRowIndexesChange: {
      type: "eventHandler",
      argTypes: [{ name: "rows", type: "array" }],
    },
  },

  states: {
    selectedRowIndexes: {
      type: "writable",
      variableType: "array",
      valueProp: "selectedRowIndexes",
      onChangeProp: "onSelectedRowIndexesChange",
    },
  },
};

