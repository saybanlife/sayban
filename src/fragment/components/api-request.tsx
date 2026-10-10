"use client";

import { CodeComponentMeta, useSelector } from "@plasmicapp/host";
import { ReactNode, useEffect, useRef, useState } from "react";
import axios from "axios";
import useSWR from "swr";
import { resolveClientApiUrl } from "@/lib/resolveClientApiUrl";
import { mergePublicAuthHeaders } from "@/lib/publicAuthHeaders";
import {
  DEFAULT_API_CACHE_TTL_MS,
  readApiCache,
  writeApiCache,
  type CachedApiEntry
} from "@/lib/persistentApiCache";

type ApiRequestType = {
  method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  url: string;
  params: Record<string, string | string[]>;
  body?: Record<string, any>;
  config?: Record<string, any>;
  children: ReactNode;
  shouldFetch?: boolean;
  /** Bypass SWR dedupe and always revalidate on mount (e.g. reservation history). */
  fresh?: boolean;
  /**
   * Opt in to the localStorage cache under this key. Must be stable and must
   * not encode the auth token, so a returning user hits the same entry.
   * While the entry is within its TTL no request is sent at all; once past it
   * the cached data still paints immediately and is revalidated in the
   * background. Ignored when `fresh` is set.
   */
  cacheKey?: string;
  /** TTL for `cacheKey`, in ms. Defaults to 12h. */
  cacheTtlMs?: number;
  /**
   * Poll the endpoint every N ms so the view keeps up without a manual refresh
   * (e.g. reservation status). Polling pauses while the tab is hidden. Off by
   * default; combine with `fresh` so responses are not served from cache.
   */
  refreshInterval?: number;
  errorDisplay?: ReactNode;
  loadingDisplay?: ReactNode;
  previewErrorDisplay?: boolean;
  previewLoadingDisplay?: boolean;
  onError?: (error?: any) => void;
  onLoading?: (loading: boolean) => void;
  onSuccess?: (data: any) => void;
};

export const ApiRequest = (props: ApiRequestType) => {
  const {
    method = "GET",
    params,
    url,
    body,
    config,
    errorDisplay,
    loadingDisplay,
    children,
    previewErrorDisplay,
    previewLoadingDisplay,
    onError,
    onLoading,
    shouldFetch = true,
    fresh = false,
    cacheKey,
    cacheTtlMs = DEFAULT_API_CACHE_TTL_MS,
    refreshInterval = 0,
    onSuccess
  } = props;
  const fragmentConfig = useSelector("Fragment");
  const [isLoading, setIsLoading] = useState(false);

  const cacheEnabled = !!cacheKey && !fresh;
  // Read synchronously on first render so a cached payload is available before
  // the first paint, rather than flashing the skeleton for a frame.
  const [cached, setCached] = useState<CachedApiEntry | null>(() =>
    cacheEnabled ? readApiCache(cacheKey!, cacheTtlMs) : null
  );
  const hasFreshCache = cacheEnabled && !!cached && !cached.stale;
  const finalUrl = resolveClientApiUrl(url);
  const fetchProps = {
    method,
    url: finalUrl,
    params,
    body,
    config: mergePublicAuthHeaders({
      ...fragmentConfig?.apiConfig,
      ...fragmentConfig?.previewApiConfig,
      ...config
    })
  };
  const shouldFetchRequest = shouldFetch !== false && !!url;
  const fetchKey = shouldFetchRequest
    ? JSON.stringify({ ...fetchProps, shouldFetch, fresh })
    : null;

  const reuqestFn = async ({ method, url, params, body, config }: any) => {
    onLoading?.(true);
    onError?.(null);
    // Do not clear prior success payload here — avoids empty flashes and feels faster.
    setIsLoading(true);
    try {
      if (method === "GET") {
        return await axios.get(url, {
          params,
          ...config
        });
      }
      return await axios[
        method.toLowerCase() as "post" | "delete" | "put" | "patch"
      ](url, body, {
        params,
        ...config
      });
    } catch (err) {
      // SWR still gets the rejection via onError; always clear loading so
      // abandoned/failed fetches cannot leave the panel overlay stuck.
      onLoading?.(false);
      setIsLoading(false);
      throw err;
    }
  };

  const { error, isValidating } = useSWR(
    fetchKey,
    () => reuqestFn(fetchProps),
    {
      onError(err) {
        onLoading?.(false);
        setIsLoading(false);
        if (axios.isAxiosError(err)) {
          onError?.(err.response?.data);
        }
      },
      onSuccess(data) {
        onLoading?.(false);
        setIsLoading(false);
        if (cacheEnabled) {
          writeApiCache(cacheKey!, data?.data);
          // Mark the entry fresh so a later key change (the Authorization
          // header resolving after hydration is the common one) does not
          // trigger a second identical request.
          setCached({ data: data?.data, stale: false, storedAt: Date.now() });
        }
        onSuccess?.(data?.data);
      },
      errorRetryCount: 0,
      revalidateOnFocus: false,
      // A fresh cache entry means "do not go to the network at all". A stale
      // one still revalidates, but behind the already-painted cached data.
      revalidateOnMount: hasFreshCache ? false : true,
      revalidateIfStale: hasFreshCache ? false : true,
      dedupingInterval: fresh ? 0 : 2000,
      keepPreviousData: !fresh,
      refreshInterval,
      // Polling a background tab wastes requests; SWR revalidates on remount.
      refreshWhenHidden: false,
      refreshWhenOffline: false
    }
  );

  // Hand the cached payload to consumers once, so `$state` is populated even
  // when no request runs. Callbacks come from Plasmic as inline arrows, so they
  // are held in refs to keep this to a single delivery.
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onLoadingRef = useRef(onLoading);
  onLoadingRef.current = onLoading;
  const deliveredCacheRef = useRef(false);

  useEffect(() => {
    if (!cacheEnabled || !cached || deliveredCacheRef.current) return;
    deliveredCacheRef.current = true;
    onLoadingRef.current?.(false);
    onSuccessRef.current?.(cached.data);
  }, [cacheEnabled, cached]);

  // When shouldFetch flips off (login/create, missing url, aborted key),
  // clear any in-flight loading flag — SWR will not call onSuccess/onError.
  useEffect(() => {
    if (fetchKey != null) return;
    setIsLoading(false);
    onLoadingRef.current?.(false);
  }, [fetchKey]);

  // Fresh requests should show loading whenever validating (no stale paint).
  // Any cached payload (even stale) suppresses the skeleton, since the data is
  // already on screen while revalidation happens in the background.
  const showLoading =
    previewLoadingDisplay ||
    (!(cacheEnabled && cached) &&
      (isLoading || (fresh && isValidating && shouldFetchRequest)));

  if (showLoading) {
    return loadingDisplay;
  }

  if (!!error || previewErrorDisplay) {
    return errorDisplay;
  }
  return children;
};

export const apiRequestMeta: CodeComponentMeta<ApiRequestType> = {
  name: "ApiRequest",
  displayName: "Fragment/ApiRequest",
  importPath: "@/fragment/components/api-request",
  figmaMappings: [{ figmaComponentName: "ApiRequest" }],
  props: {
    method: {
      type: "choice",
      options: ["GET", "POST", "DELETE", "PUT", "PATCH"],
      defaultValueHint: "GET",
      defaultValue: "GET"
    },
    url: {
      displayName: "URL",
      type: "string",
      defaultValueHint: "/api/v1/users",
      required: true
    },
    params: {
      displayName: "Query Params",
      type: "object",
      description: `e.g. { id: 20 }`,
      helpText: "It will append this to the end of the URL as ?key=value."
    },
    body: {
      displayName: "Body",
      type: "object",
      description: `e.g. { id: 20 }`,
      hidden: ps => ps.method == "GET"
    },
    config: {
      displayName: "Request Config",
      type: "object",
      description: `e.g. { headers: { 'Authorization': 'XXX' } }`,
      helpText:
        "Read about request configuration options at https://axios-http.com/docs/req_config"
    },
    shouldFetch: {
      displayName: "Should Fetch?",
      type: "boolean",
      description: "If false, the request will not run.",
      defaultValue: true
    },
    fresh: {
      displayName: "Always Fresh?",
      type: "boolean",
      description:
        "Skip SWR dedupe and always revalidate on mount (use for booking history).",
      defaultValue: false
    },
    cacheKey: {
      displayName: "Cache Key",
      type: "string",
      description:
        "Persist the response in localStorage under this key. While the entry is fresh no request is sent. Use for slow-changing data such as categories.",
      hidden: ps => !!ps.fresh
    },
    cacheTtlMs: {
      displayName: "Cache TTL (ms)",
      type: "number",
      description: "How long a cached entry stays fresh. Defaults to 12h.",
      hidden: ps => !ps.cacheKey
    },
    refreshInterval: {
      displayName: "Refresh Interval (ms)",
      type: "number",
      description:
        "Re-fetch every N ms so the view stays current without a manual refresh. Paused while the tab is hidden. 0 disables polling."
    },
    previewLoadingDisplay: {
      displayName: "Preview Loading Display",
      type: "boolean",
      editOnly: true
    },
    previewErrorDisplay: {
      displayName: "Preview Error Display",
      type: "boolean",
      editOnly: true
    },
    children: { displayName: "Children", type: "slot" },
    loadingDisplay: {
      displayName: "Loading Display",
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Loading..."
        }
      ]
    },
    errorDisplay: {
      displayName: "Error Display",
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Error fetching data"
        }
      ]
    },
    onSuccess: {
      type: "eventHandler",
      argTypes: [
        {
          name: "data",
          type: "object"
        }
      ]
    },
    onError: {
      type: "eventHandler",
      argTypes: [
        {
          name: "error",
          type: "object"
        }
      ]
    },
    onLoading: {
      type: "eventHandler",
      argTypes: [
        {
          name: "loading",
          type: "boolean"
        }
      ]
    }
  },
  classNameProp: "className",
  states: {
    data: {
      type: "readonly",
      variableType: "object",
      onChangeProp: "onSuccess"
    },
    error: {
      type: "readonly",
      variableType: "object",
      onChangeProp: "onError"
    },
    loading: {
      type: "readonly",
      variableType: "boolean",
      onChangeProp: "onLoading"
    }
  }
};
