import { Box, Grid } from "theme-ui";
import SourceButton from "@/components/Button";
import { FormSelect, FormInput, FormTextarea, FormCheckbox } from "./Form";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useRepository, useUser, updateRepository } from "@/lib/api";

interface RepositoryEditFormProps {
  account_id: string,
  repository_id: string,
  create?: boolean,
}

const defaultRepositoryEditFormProps: RepositoryEditFormProps = {
  account_id: null,
  repository_id: null,
  create: false,
}

function requestBody(repository, body) {
    let d;
    if (repository) {
        d = {...repository};
        d["meta"]["description"] = body["description"]
        d["meta"]["title"] = body["title"]
        d["meta"]["tags"] = body["tags"].split(",").map((tag) => {return tag.trim().toLowerCase()})
        d["mode"] = body["mode"]
        d["featured"] = body["featured"] == "on" ? 1 : 0
    } else {
        d = {
            "account_id": body["account_id"],
            "repository_id": body["repository_id"],
            "mode": body["mode"],
            "featured": 0,
            "disabled": false,
            "meta": {
                "description": body["description"],
                "title": body["title"],
                "tags": body["tags"].split(",").map((tag) => {return tag.trim().toLowerCase()}),
                "published": "2000-01-01T00:00:00Z"
            },
            "data_mode": "open",
            "data": {
                "cdn": "https://data.source.coop",
                "mirrors": {
                    "s3-us-west-2": {
                        "name": "S3 US-West-2",
                        "delimiter": "/",
                        "region": "us-west-2",
                        "provider": "s3",
                        "uri": "s3://us-west-2.opendata.source.coop/" + body["account_id"] + "/" + body["repository_id"],
                    }
                },
                "primary_mirror": "s3-us-west-2"
            }
        }
    }
    return d;
}

export function RepositoryEditForm(input: RepositoryEditFormProps) {
  const router = useRouter();
  const { account_id, repository_id, create } = input;

  const { repository, isLoading, isError } = useRepository({
    account_id,
    repository_id
  })

  console.log(account_id, repository_id);

  const { user } = useUser();


  var stateOptions = [];

  if (repository) {
    stateOptions.push({
      label: "Listed",
      value: "listed"
    })

    stateOptions.push({
      label: "Unlisted",
      value: "unlisted"
    })

    if (repository.mode == "private" || user.flags.includes("admin")) {
      /*stateOptions.push({
        label: "Private",
        value: "private"
      })*/
    }
  } else {
    stateOptions.push({
      label: "Public",
      value: "unlisted"
    })

    /*stateOptions.push({
      label: "Private",
      value: "private"
    })*/
  }

  var accounts = [];

  if (repository) {
    accounts.push({label: "@" + repository.account_id, value: repository.account_id})
  } else {
      if (create && user) {
        accounts.push({label: "@" + user.account_id, value: user.account_id})
        if (user.organizations) {
            user.organizations.forEach((organization) => {
              accounts.push({label: "@" + organization, value: organization})
            })
        }
      }
  }

    const [formStatus, setFormStatus] = useState({
      "messages": [],
      "banner": null,
      "profile": user,
      "modes": [],
      "fieldValidity": {
        "account_id": true,
        "repository_id": true,
        "title": !create,
        "description": true,
        "tags": true,
        "listed": true,
        "private": true,
        "disabled": true,
      }
    })
    const [repositoryId, setRepositoryId] = useState("");
    const [accountId, setAccountId] = useState("");
    const [submittable, setSubmittable] = useState(!create);

    typeof sessionStorage !== "undefined" ? sessionStorage.getItem("profile") ? JSON.parse(sessionStorage.getItem("profile")) : null : null

    const handleSubmit = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setSubmittable(false);
    
        const form = e.currentTarget.parentElement.parentElement.parentElement;

        let body;
    
        if (form && form instanceof HTMLFormElement) {
          const formData = new FormData(form);
          
          // map the entire form data to JSON for the request body
          body = Object.fromEntries(formData);
          const method = e.currentTarget;
          body = {
            ...body,
            ...{ [method.name]: method.value },
          };
        }
        const b = requestBody(repository, body);

        if (create) {
          fetch(process.env.NEXT_PUBLIC_API_BASE + "/repositories/", {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(b),
            headers: {
                "Content-Type": "application/json"
            }
          }).then((r) => {
            if (r.ok) {
              router.push("/repositories/" + b["account_id"] + "/" + b["repository_id"] + "//edit")
            } else {
              if (r.status < 500) {
                // TODO: Error Messages
              }
            }
            setSubmittable(true);
          });
        } else {
          updateRepository({repository: b}).then(() => {
            setSubmittable(true);
          })
        }

        
    }
    
    useEffect(() => {
      var f = { ...formStatus };
      var submittable = true;
      for (const [k, v] of Object.entries(f.fieldValidity)) {
        if (!v) {
          submittable = false;
        }
      }

      setSubmittable(submittable);
    }, [formStatus])
    
    
    useEffect(() => {
      if (!create) {
        return
      }
      var f = { ...formStatus };

      if (repositoryId.length <= 0) {
        f.messages["repository_id"] = null;
        f.fieldValidity["repository_id"] = false;
        setFormStatus(f)
        return;
      }

      if (repositoryId.length < 3 || repositoryId.length >= 40) {
        f.messages["repository_id"] = {
          "type": "error",
          "text": "Repository IDs must be between 3 and 39 characters long"
        }
        f.fieldValidity["repository_id"] = false;
        setFormStatus(f)
        return;
      }

      var p = new RegExp('^[a-z0-9\-]*$')
      if (!p.test(repositoryId)) {
        f.messages["repository_id"] = {
          "type": "error",
          "text": "Repository IDs may only contain alphanumeric characters and hyphens (A-Z, 0-9, -)"
        }
        f.fieldValidity["repository_id"] = false;
        setFormStatus(f)
        return;
      }

      var p = new RegExp('--+')
      if (p.test(repositoryId)) {
        f.messages["repository_id"] = {
          "type": "error",
          "text": "Repository IDs may not contain consecutive hyphens"
        }
        f.fieldValidity["repository_id"] = false;
        setFormStatus(f)
        return;
      }

      var p = new RegExp('^[^-].*[^-]$')
      if (!p.test(repositoryId)) {
        f.messages["repository_id"] = {
          "type": "error",
          "text": "Repository IDs may not begin or end with a hyphen"
        }
        f.fieldValidity["repository_id"] = false;
        setFormStatus(f)
        return;
      }

      f.messages["repository_id"] = {
        "type": "warning",
        "text": "Checking if Repository ID is available..."
      }

      setFormStatus(f);

      const timer = setTimeout(() => {
        var f = { ...formStatus };

        if (repositoryId.length <= 0) {
          f.messages["repository_id"] = null;
          f.fieldValidity["repository_id"] = false;
          setFormStatus(f)
          return;
        }
  
        fetch(process.env.NEXT_PUBLIC_API_BASE + "/repositories/" + accountId + "/" + repositoryId + "/", {credentials: "include"}).then((res) => {
          if (!res.ok) {
            if (res.status == 404) {
              f.messages["repository_id"] = {
                "type": "success",
                "text": "Available"
              }
              f.fieldValidity["repository_id"] = true;
            } else {
              f.messages["repository_id"] = {
                "type": "error",
                "text": "Not Available"
              }
            }
          } else {
            f.messages["repository_id"] = {
              "type": "error",
              "text": "Not Available"
            }
            f.fieldValidity["repository_id"] = false;
          }
          setFormStatus(f);
        })
      }, 250);

      return () => clearTimeout(timer);
    }, [repositoryId, accountId])

    function toggleDisabled(e) {
      e.stopPropagation();
      e.preventDefault();

      setSubmittable(false);

      var r = { ...repository };
      r.disabled = !repository.disabled;

      updateRepository({
        repository: r
      }).then(() => {
        setSubmittable(true);
      })
    }

    function validateTitle(e) {
      var f = { ...formStatus };
      if (e.target.value.length < 3 || e.target.value.length > 100) {
        f.messages["title"] = {
          "type": "error",
          "text": "Title must be between 3 and 100 characters in length"
        }
        f.fieldValidity["title"] = false;
      } else {
        f.messages["title"] = null;
        if (e.target.value.length <= 0) {
          f.fieldValidity["title"] = false;
        } else {
          f.fieldValidity["title"] = true;
        }
      }

      setFormStatus(f);
    }
    
    function validateDescription(e) {
      var f = { ...formStatus };
      if (e.target.value.length > 500) {
        f.messages["description"] = {
          "type": "error",
          "text": "Description must be less than 500 characters"
        }      
      } else {
        f.messages["description"] = null;
      }
        
      setFormStatus(f);
    }
    
    function validateTags(e) {
      var f = { ...formStatus };
      if (e.target.value.split(",").length > 20) {
        f.messages["tags"] = {
          "type": "error",
          "text": "There may not be more than 20 tags"
        }      
      } else {
        f.messages["tags"] = null;
      }  
    
      setFormStatus(f);
    }
    
    return (
    <Box as="form" onSubmit={handleSubmit}>
        {
          !create ? <FormInput
            name="account_id"
            required={true}
            defaultValue={repository ? repository.account_id : null}
            type="hidden" /> : <></>
        }

        {
          !create ? <FormInput
            name="repository_id"
            required={true}
            defaultValue={repository ? repository.repository_id : null}
            type="hidden" /> : <></>
        }
        <Grid sx={{
          gridTemplateColumns: ["1fr", "1fr 1fr fr 3fr", "1fr 1fr 3fr", "1fr 1fr 5fr"]
        }}>
          <FormSelect
            sx={{gridColumnStart: 1, gridColumnEnd: ["end", 2, 2, 2]}}
            name="mode"
            label="Mode"
            required={true}
            message={null}
            help={null}
            disabled={!create && !repository}
            defaultValue={repository ? repository.mode : "unlisted"}
            options={stateOptions} />

          {
            create ? <FormSelect
            sx={{gridColumnStart: 1, gridColumnEnd: ["end", 3, 3, 3]}}
            name="account_id"
            label="Account ID"
            required={true}
            message={null}
            help={"The repository will be published within the selected account."}
            defaultValue={repository ? repository.account_id : accounts.length > 0 ? accounts[0].value : null}
            disabled={!create}
            onChange={(e) => {setAccountId(e.target.value)}}
            options={accounts} /> : <></>
          }

          {
            create ? <FormInput
            sx={{gridColumnStart: [1,3,3,3], gridColumnEnd: "end"}}
            name="repository_id"
            label="Repository ID"
            required={true}
            message={formStatus.messages["repository_id"]}
            defaultValue={repository ? repository.repository_id : null}
            disabled={!create}
            help={"This ID will be used to create the URL for the repository page. For example, https://beta.source.coop/{ACCOUNT_ID}/{REPOSITORY_ID}"}
            placeholder={"example-id "}
            onChange={(e) => {setRepositoryId(e.target.value)}}
            type="text" /> : <></>
          }

          <FormInput
            sx={{gridColumnStart: 1, gridColumnEnd: "end"}}
            name="title"
            label="Title"
            disabled={!create && !repository}
            message={formStatus.messages["title"]}
            defaultValue={repository? repository.meta.title : null}
            onChange={validateTitle}
            required={true} />  

          <FormTextarea
            sx={{gridColumnStart: 1, gridColumnEnd: "end"}}
            name="description"
            label="Description"
            required={false}
            disabled={!create && !repository}
            defaultValue={repository? repository.meta.description : null}
            message={formStatus.messages["description"]}
            onChange={validateDescription}
            rows={4} />

          <FormTextarea
            sx={{gridColumnStart: 1, gridColumnEnd: "end"}}
            name="tags"
            label="Tags"
            required={false}
            disabled={!create && !repository}
            message={formStatus.messages["tags"]}
            defaultValue={repository? repository.meta.tags.join(", ") : null}
            help={"Tags must be comma-separated"}
            onChange={validateTags}
            rows={1} />

          {
            repository && user.flags.includes("admin") ? <FormCheckbox name="featured" defaultValue={repository.featured == 1} label={"Featured"} /> : <></>
          }

          <Box sx={{gridColumnStart: 1, gridColumnEnd: "end"}}>
            <SourceButton disabled={!submittable || !create && !repository} onClick={handleSubmit}>{create ? "Create" : "Save"}</SourceButton>
            {
              repository && user.flags.includes("admin") ? <SourceButton disabled={!submittable || !create && !repository} variant={repository.disabled ? "success" : "error"} sx={{ml: 2}} onClick={toggleDisabled}>{repository.disabled ? "Enable" : "Disable"}</SourceButton> : <></>
            }
          </Box>
        </Grid>
      </Box>
    );
}

RepositoryEditForm.defaultProps = defaultRepositoryEditFormProps;