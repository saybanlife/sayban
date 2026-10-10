import * as React from "react";
import { PageParamsProvider as PageParamsProvider__ } from "@plasmicapp/react-web/lib/host";
import GlobalContextsProvider from "../../components/plasmic/sayban/PlasmicGlobalContextsProvider";
import { StyleTokensProvider } from "../../components/plasmic/sayban/PlasmicStyleTokensProvider";
import { PlasmicQueryDataProvider } from "@plasmicapp/react-web/lib/query";
import { useRouter } from "next/router";
import ResetPasswordPage from "../../components/ResetPasswordPage";

function ForgotPasswordRoute() {
  const router = useRouter();

  return (
    <GlobalContextsProvider>
      <PlasmicQueryDataProvider>
        <PageParamsProvider__
          route={router.pathname}
          params={router.query}
          query={router.query}
        >
          <StyleTokensProvider>
            <ResetPasswordPage />
          </StyleTokensProvider>
        </PageParamsProvider__>
      </PlasmicQueryDataProvider>
    </GlobalContextsProvider>
  );
}

export default ForgotPasswordRoute;
