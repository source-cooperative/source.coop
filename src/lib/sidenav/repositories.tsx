export function getRepositorySideNavLinks({account_id, repository_id, activePage, callback}) {
    fetch(process.env.NEXT_PUBLIC_API_BASE + "/repositories/" + account_id + "/" + repository_id + "/services", {credentials: "include"}).then((res) => {
        if (res.ok) {
            res.json().then((services) => {
                callback(
                    services.map((service) => {
                        if (service.id == "readme") {
                          return {
                            id: service.id,
                            type: "link",
                            active: service.id == activePage,
                            title: service.name,
                            href: "/repositories/" + account_id + "/" + repository_id + "/description"
                          }
                        } else if (service.id == "browse") {
                          return {
                            id: service.id,
                            type: "link",
                            active: service.id == activePage,
                            title: service.name,
                            href: "/" + account_id + "/" + repository_id
                          }
                        } else if (service.id == "access_data") {
                          return {
                            id: service.id,
                            type: "link",
                            active: service.id == activePage,
                            title: service.name,
                            href: "/repositories/" + account_id + "/" + repository_id + "/download"
                          }
                        } else if (service.id == "edit") {
                          return {
                            id: service.id,
                            type: "link",
                            active: service.id == activePage,
                            title: service.name,
                            href: "/repositories/" + account_id + "/" + repository_id + "/edit"
                          }
                        }
                    })
                )
            })
        } else {
            callback(null)
        }
    })
}
