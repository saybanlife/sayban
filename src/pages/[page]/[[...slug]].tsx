"use client";

import { usePathname } from "next/navigation";
import { PageParamsProvider as PageParamsProvider__ } from "@plasmicapp/react-web/lib/host";
import GlobalContextsProvider from "../../../components/plasmic/website_starter/PlasmicGlobalContextsProvider";
import { PlasmicHomepage } from "../../../components/plasmic/website_starter/PlasmicHomepage";

export default function Homepage() {
  const pathname = usePathname() || "/";

  // "/centers/sport/football" → ["centers","sport","football"]
  const parts = pathname.split("/").filter(Boolean);

  const page = parts[0] || undefined; // ← تغییر از null به undefined
  const slug = parts.slice(1);

  const params = { page, slug };

  return (
    <GlobalContextsProvider>
      <PageParamsProvider__
        route={pathname}
        params={params}
        query={params}
      >
        <PlasmicHomepage />
      </PageParamsProvider__>
    </GlobalContextsProvider>
  );
}
