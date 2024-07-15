// @ts-nocheck

import { Layout } from "@/components/Layout";
import { useEffect, useState, version } from "react";
import { Heading } from "theme-ui";
import { RepositoryEditForm } from "@/components/RepositoryEditForm";
import { useRouter } from "next/router";

export default function CreateRepository() {
  const router = useRouter();
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  
  function onMessages(messages) {
    setMessages(messages)
  }

  useEffect(() => {
    const sessionProfile = localStorage.getItem("profile");
    var profile = null;
    if (sessionProfile) {
      profile = JSON.parse(sessionProfile); 
    }

    setProfile(profile)

    if (!profile || !(profile.flags.includes("admin") || profile.flags.includes("create_repository"))) {
      router.push("/auth/login?return_to=/repositories/new")
    }
  }, [])

  return (
    <>
      <Layout error={error} notFound={notFound} messages={messages}>
      <Heading as="h2">New Repository</Heading>
      <RepositoryEditForm create={true} profile={profile} onMessages={onMessages}/>
      </Layout>
    </>
  );
}
