import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export function useFeatured() {
  const { data, error, isLoading } = useSWR(
    { path: "/api/repositories/featured" },
    { refreshInterval: 5000 }
  );

  return {
    repositories: data,
    isLoading,
    isError: error,
  };
}

export function useProfile({ account_id }) {
  const { data, error, isLoading } = useSWR(
    { path: !account_id ? null : `/accounts/${account_id}/profile` },
    { refreshInterval: 0 }
  );

  return {
    profile: data,
    isLoading,
    isError: error,
  };
}

export function useAccountRepositoryList({ account_id, next, limit }) {
  const { data, error, isLoading } = useSWR(
    {
      path: !account_id ? null : `/api/repositories/${account_id}`,
      args: { next, limit },
    },
    { refreshInterval: 0 }
  );

  return {
    result: data,
    isLoading,
    isError: error,
  };
}

export function useRepositoryList({ next, limit, tags, q }) {
  const { data, error, isLoading } = useSWR(
    {
      path: "/api/repositories",
      args: { next, limit, tags, q },
      external: false,
    },
    { refreshInterval: 0 }
  );

  return {
    result: data,
    isLoading,
    isError: error,
  };
}

export function useUser() {
  const { data, error, isLoading } = useSWR(
    { path: "/api/whoami" },
    { refreshInterval: 10000 }
  );

  return {
    user: data,
    isLoading,
    isError: error,
  };
}

export function useRepository({ account_id, repository_id }) {
  const { data, error, isLoading } = useSWR(
    {
      path:
        !account_id || !repository_id
          ? null
          : `/api/repositories/${account_id}/${repository_id}`,
    },
    { refreshInterval: 0 }
  );

  return {
    repository: data,
    isLoading,
    isError: error,
  };
}

export function useAccountSideNav({ account_id, active_page }) {
  const { user } = useUser();
  const { profile } = useProfile({ account_id });

  if (!profile) {
    return {
      links: null,
    };
  }

  var links = [
    {
      type: "link",
      href: `/${profile.account_id}`,
      title: "Repositories",
      active: active_page == "repositories",
    },
  ];

  if (user && user.flags.includes("admin")) {
    links.push({
      type: "link",
      href: `/account/${profile.account_id}/admin`,
      title: "Manage",
      active: active_page == "manage",
    });
  }

  return {
    links,
  };
}

export function useRepositorySideNav({
  account_id,
  repository_id,
  active_page,
}) {
  var { data, error, isLoading } = useSWR(
    {
      path:
        !account_id || !repository_id
          ? null
          : `/api/repositories/${account_id}/${repository_id}/services`,
    },
    { refreshInterval: 0 }
  );

  if (data) {
    data = data.map((service) => {
      if (service.id == "readme") {
        return {
          id: service.id,
          type: "link",
          active: service.id == active_page,
          title: service.name,
          href:
            "/repositories/" +
            account_id +
            "/" +
            repository_id +
            "/description",
        };
      } else if (service.id == "browse") {
        return {
          id: service.id,
          type: "link",
          active: service.id == active_page,
          title: service.name,
          href: "/" + account_id + "/" + repository_id,
        };
      } else if (service.id == "access_data") {
        return {
          id: service.id,
          type: "link",
          active: service.id == active_page,
          title: service.name,
          href:
            "/repositories/" + account_id + "/" + repository_id + "/download",
        };
      } else if (service.id == "edit") {
        return {
          id: service.id,
          type: "link",
          active: service.id == active_page,
          title: service.name,
          href: "/repositories/" + account_id + "/" + repository_id + "/edit",
        };
      }
    });
  }

  return {
    sideNavLinks: data,
    isLoading,
    isError: error,
  };
}

export async function setUserFlags({ account_id, flags }) {
  await fetch(`${API_BASE}/accounts/${account_id}/flags`, {
    method: "PUT",
    credentials: "include",
    body: JSON.stringify(flags),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((result) => {
      if (result.ok) {
        toast.success("Updated User Flags");
      } else {
        toast.error("Failed to Update User Flags");
      }
    })
    .catch((e) => {
      toast.error("Failed to Update User Flags");
    });
}

export async function updateRepository({ repository }) {
  await fetch(
    `${API_BASE}/repositories/${repository.account_id}/${repository.repository_id}`,
    {
      method: "PUT",
      credentials: "include",
      body: JSON.stringify(repository),
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((r) => {
    if (r.ok) {
      toast.success("Repository Updated");
    } else {
      toast.error("Error Updating Repository");
    }
  });
}

export async function toggleRepositoryDisabled({ account_id, repository_id }) {
  const { repository } = useRepository({ account_id, repository_id });

  repository.disabled = !repository.disabled;

  await fetch(`${API_BASE}/repositories/${account_id}/${repository_id}`, {
    method: "PUT",
    credentials: "include",
    body: JSON.stringify(repository),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((r) => {
    if (r.ok) {
      toast.success("Repository Updated");
    } else {
      toast.error("Error Updating Repository");
    }
  });
}

export function useCredentials({
  account_id,
  repository_id,
  mirror_id,
  random,
}) {
  const { data, error, isLoading } = useSWRImmutable(
    {
      path:
        !account_id || !repository_id || !mirror_id
          ? null
          : `/repositories/${account_id}/${repository_id}/${mirror_id}/access`,
      random: random,
    },
    { refreshInterval: 0 }
  );

  return {
    credentials: data,
    isLoading,
    isError: error,
  };
}

export async function claimUsername({ account_id, identity_id }) {
  await fetch(`${API_BASE}/accounts/`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
      account: {
        account_id: account_id,
        account_type: "user",
        identity_id: identity_id,
      },
    }),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((r) => {
    if (r.ok) {
      toast.success("Username Claimed");
    } else {
      toast.error("Error Claiming Username");
    }
  });
}
