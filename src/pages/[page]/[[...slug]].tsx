"use client";

import * as React from "react";
import { PageParamsProvider as PageParamsProvider__ } from "@plasmicapp/react-web/lib/host";
import GlobalContextsProvider from "../../../../components/plasmic/website_starter/PlasmicGlobalContextsProvider";
import { PlasmicHomepage } from "../../../../components/plasmic/website_starter/PlasmicHomepage";

import { useParams } from "next/navigation";

function Homepage() {
  const params = useParams(); // ← اینجا درست همه داینامیک‌ها را می‌دهد

  return (
    <GlobalContextsProvider>
      <PageParamsProvider__
        route={window.location.pathname}
        params={params}
        query={params}
      >
        <PlasmicHomepage />
      </PageParamsProvider__>
    </GlobalContextsProvider>
  );
}

export default Homepage;
