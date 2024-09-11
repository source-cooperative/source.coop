import { Layout } from "@/components/Layout";
import { Heading, Grid, Container, Spinner } from "theme-ui";
import { SettingsFlow, UpdateSettingsFlowBody } from "@ory/client";
import ory from "@/pkg/sdk";
import { AxiosError } from "axios";
import { handleFlowError } from "@/pkg/errors";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";

import AuthForm from "@/components/AuthForm";
import { SideNavLink } from "@/lib/types";

export default function Account() {
  const sideNavLinks: SideNavLink[] = [
    { href: "/account/profile", title: "Profile", active: true },
  ];

  return (
    <>
      <Layout sideNavLinks={sideNavLinks}></Layout>
    </>
  );
}
