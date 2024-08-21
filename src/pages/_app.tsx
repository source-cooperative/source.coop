import "@fontsource/ibm-plex-sans";
import "react-loading-skeleton/dist/skeleton.css";
import "../styles/globals.css";

import theme from "@/lib/theme";

import Router from "next/router";
import NProgress from "nprogress"; //nprogress module
import "../styles/nprogress.css"; //styles of nprogress
import { SkeletonTheme } from "react-loading-skeleton";

import provider from "@mdx-js/react";

import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
import { mdxOptions } from "@/lib/md";

import toast, { Toaster } from "react-hot-toast";

import { SWRConfig } from "swr";

const fetcher = async (opts) => {
  const { path, args, exclude_credentials, external, raw, markdown } = opts;

  var url = new URL(external ? path : process.env.NEXT_PUBLIC_API_BASE + path);

  if (args) {
    var params = [];

    Object.keys(args).forEach(function (key) {
      if (args[key]) {
        params.push([key, args[key]]);
      }
    });

    url.search = new URLSearchParams(params).toString();
  }

  var options = {};
  if (!exclude_credentials) {
    options = { credentials: "include" };
  }

  const res = await fetch(url, options);

  // If the status code is not in the range 200-299,
  // we still try to parse and throw it.
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    // Attach extra info to the error object.

    // @ts-ignore
    error.info = await res.json();
    // @ts-ignore
    error.status = res.status;
    throw error;
  }

  if (markdown) {
    const text = await res.text();
    return evaluate(text, {
      ...provider,
      ...runtime,
      useMDXComponents: SourceComponents,
      ...mdxOptions,
    } as any);
  } else {
    return res.json();
  }
};

//Binding events.
Router.events.on("routeChangeStart", () => NProgress.start());
Router.events.on("routeChangeComplete", () => NProgress.done());
Router.events.on("routeChangeError", () => NProgress.done());

import { SourceProvider, components as SourceComponents } from "@/lib/provider";

import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/react";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SWRConfig
      value={{
        refreshInterval: 1000,
        fetcher: fetcher,
      }}
    >
      <SourceProvider theme={theme} components={SourceComponents}>
        <main>
          <Toaster
            toastOptions={{
              style: {
                borderRadius: "0px",
                zIndex: 99999999,
              },
            }}
            position="bottom-right"
          />
          <SkeletonTheme
            baseColor="var(--theme-ui-colors-muted)"
            highlightColor="var(--theme-ui-colors-highlight)"
            borderRadius={0}
          >
            <Component {...pageProps} />
          </SkeletonTheme>
          <Analytics />
        </main>
      </SourceProvider>
    </SWRConfig>
  );
}
