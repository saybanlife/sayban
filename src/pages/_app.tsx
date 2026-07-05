import "../../components/plasmic/sayban/plasmic.css"; // plasmic-import: qARqpE4p5tZmJuNxFbTaPz/projectcss
import "@/styles/globals.css";
import "@/styles/date-picker.css";

import { useEffect } from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import type { AppProps } from "next/app";
import Head from "next/head";

import { initFcm } from "@/lib/fcm";

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    initFcm();
  }, []);

  return (
    <PlasmicRootProvider Head={Head}>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6F8A3A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sayban" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </Head>

      <Component {...pageProps} />
    </PlasmicRootProvider>
  );
}
