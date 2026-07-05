import * as React from "react"
import * as RechartsPrimitive from "recharts"

// فرض می‌کنیم مسیر utils شما این است. آن را بر اساس ساختار پروژه خود تنظیم کنید.
import { cn } from "@/lib/utils"

// تعریف تم‌ها: کلید نام تم، مقدار سلکتور CSS مربوط به آن.
const THEMES = { light: "", dark: ".dark" } as const

// تعریف نوع ChartConfig
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

// پراپ‌های مورد نیاز برای ChartContext
type ChartContextProps = {
  config: ChartConfig
}

// ایجاد یک Context برای به اشتراک‌گذاری پیکربندی نمودار
const ChartContext = React.createContext<ChartContextProps | null>(null)

// هوک سفارشی برای دسترسی به ChartContext
function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

// کامپوننت اصلی کانتینر نمودار
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line-line]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

// کامپوننت برای تزریق استایل‌های CSS
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, configItem]) => configItem.theme || configItem.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES).map(
          ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
        ).join('')
      }}
    />
  )
}

// Wrapper ساده برای Tooltip
const ChartTooltip = RechartsPrimitive.Tooltip

// تعریف Interface سفارشی برای Payload
// این Interface پراپرتی‌های اصلی که از payload استفاده می‌کنیم را پوشش می‌دهد
interface CustomPayload {
  value?: number | string
  name?: string
  payload: any // Payload اصلی که ممکن است شامل داده‌های بیشتری باشد
  color?: string
  fill?: string
  dataKey?: string // برای مطابقت با نمونه‌های احتمالی
  // سایر پراپرتی‌های مورد نیاز را در صورت نیاز اضافه کنید
}

// کامپوننت سفارشی برای نمایش محتوای Tooltip
// شامل رفع خطای 'index' و تعریف پارامترهای formatter
const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
      // تعریف formatter که index را نیز دریافت می‌کند و از CustomPayload استفاده می‌کند
      formatter?: (
        value: number | string,
        name: string,
        item: CustomPayload, // <<< استفاده از CustomPayload
        index: number, // اضافه شد
        payload: CustomPayload[] // <<< استفاده از CustomPayload[]
      ) => React.ReactNode
      // تعریف labelFormatter که index را نیز دریافت می‌کند
      labelFormatter?: (
        value: any,
        payload: CustomPayload[] // <<< استفاده از CustomPayload[]
      ) => React.ReactNode
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel,
      hideIndicator,
      label,
      labelFormatter,
      labelClassName,
      formatter, // اکنون formatter پارامتر index را می‌پذیرد
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      // اطمینان از اینکه payload حاوی آیتم‌های CustomPayload است
      const typedPayload = payload as CustomPayload[];
      const [item] = typedPayload;

      const key = `${labelKey || item.dataKey || item.name || "value"}`
      const itemConfig = getPayloadConfigFromPayload(config, item, key)
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label

      // اگر labelFormatter تعریف شده باشد، از آن با پارامترهای لازم استفاده کنید
      if (labelFormatter) {
        // فرض بر این است که labelFormatter نیز پارامتر payload (به صورت CustomPayload[]) را دریافت می‌کند
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, typedPayload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [
      label,
      labelFormatter,
      payload, // payload به عنوان آرایه CustomPayload در نظر گرفته می‌شود
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ])

    if (!active || !payload?.length) {
      return null
    }

    // اطمینان از اینکه payload حاوی آیتم‌های CustomPayload است
    const typedPayload = payload as CustomPayload[];

    const nestLabel = typedPayload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {typedPayload.map((item, index) => { // index در اینجا تعریف شده است
            const key = `${nameKey || item.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            // استفاده از ?. برای ایمنی بیشتر در دسترسی به payload.fill
            const indicatorColor = color || item.payload?.fill || item.color

            return (
              <div
                key={item.dataKey || index} // استفاده از index به عنوان key پشتیبان
                className={cn(
                  "flex w-full items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {/* اگر formatter سفارشی تعریف شده باشد، از آن استفاده کن */}
                {formatter && item.value !== undefined && item.name !== undefined ? (
                  // !!! اینجا formatter با پارامترهای کامل صدا زده می‌شود !!!
                  formatter(item.value, item.name, item, index, typedPayload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value !== undefined && ( // بررسی برای undefined
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

// Wrapper ساده برای Legend
const ChartLegend = RechartsPrimitive.Legend

// کامپوننت سفارشی برای نمایش محتوای Legend
const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean
      nameKey?: string
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    // اطمینان از اینکه payload حاوی آیتم‌های CustomPayload است
    const typedPayload = payload as CustomPayload[]

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {typedPayload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={item.dataKey || item.name} // استفاده از name به عنوان key پشتیبان
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

// تابع کمکی برای استخراج تنظیمات پیکربندی یک آیتم از payload
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: CustomPayload, // <<< تغییر داده شد به CustomPayload
  key: string
): { label?: React.ReactNode; icon?: React.ComponentType } | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  // اطمینان از اینکه payload.payload نیز درست مدیریت می‌شود
  const payloadPayload = payload.payload && typeof payload.payload === "object"
    ? payload.payload
    : undefined;

  let configLabelKey: string = key

  // تلاش برای یافتن کلید پیکربندی مناسب
  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
     // اگر کلید مستقیماً در payload به عنوان string وجود دارد
     configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key as keyof typeof payloadPayload] === "string") {
     // اگر کلید در payload.payload به عنوان string وجود دارد
     configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  } else if (payload.name && typeof payload.name === 'string') {
      // اگر payload.name وجود دارد و string است، از آن استفاده کن
      configLabelKey = payload.name;
  } else if (payload.dataKey && typeof payload.dataKey === 'string') {
      // اگر payload.dataKey وجود دارد و string است، از آن استفاده کن
      configLabelKey = payload.dataKey;
  }
  // در نهایت، اگر هیچکدام یافت نشد، از کلید اصلی استفاده می‌شود.

  // جستجو در config با کلید یافت شده یا کلید اصلی
  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config];
}

// خروجی دادن کامپوننت‌های اصلی
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
