import { Input, Box, Image, Grid } from "theme-ui";
import { Info, Globe } from "@carbonplan/icons";
import Skeleton from "react-loading-skeleton";
import Button from "./Button";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState(router.query.q || null);

  const handleSubmit = (e) => {
    e.stopPropagation();
    e.preventDefault();

    const form = e.currentTarget.parentElement.parentElement;
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

      if (body.query) {
        router.push(`/repositories?q=${body.query}`);
      } else {
        router.push(`/repositories`);
      }
    }
  };

  useEffect(() => {
    if (router.query && router.query.q) {
      setQuery(router.query.q);
    }
  }, [router.query]);

  return (
    <Box as="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
      <Grid sx={{ gridGap: 3, gridTemplateColumns: "auto max-content" }}>
        <Input
          placeholder="Search"
          name="query"
          defaultValue={query ? query : null}
        />
        <Button variant="nav" onClick={handleSubmit}>
          Browse
        </Button>
      </Grid>
    </Box>
  );
}
