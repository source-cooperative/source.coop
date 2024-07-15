import { Box, Grid, Heading } from "theme-ui";
import SourceButton from "@/components/Button";
import { RepositoryListing } from "./RepositoryListing";
import { useRouter } from "next/router";

import { usePathname } from "next/navigation";

export function RepositoryList({
	repositoryResult,
	isLoading,
	isError,
}: {
	repositoryResult: any;
	isLoading: any;
	isError: any;
}) {
	const router = useRouter();
	var repositories = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
	];
	var nextPage = null;
	if (!isLoading && !isError) {
		repositories = repositoryResult.repositories;
		if (repositoryResult.next) {
			var params = [["next", repositoryResult.next]];

			if (router.query["limit"]) {
				params.push(["limit", router.query["limit"] as string]);
			} else {
				params.push(["limit", "10"]);
			}

			if (router.query["tags"]) {
				params.push(["tags", router.query["tags"] as string]);
			}

			const pathname = usePathname();
			nextPage = pathname + "/?" + new URLSearchParams(params).toString();
		}
	}

	return (
		<>
			<Grid
				sx={{
					gridTemplateColumns: "1fr",
					justifyContent: "stretch",
					gridGap: 4,
				}}>
				{repositories.length == 0 && !isLoading && !isError ? (
					<Box sx={{ textAlign: "center" }}>
						<Heading as="h1">No repositories found</Heading>
					</Box>
				) : (
					<></>
				)}
				{repositories.map((repository, i) => (
					<RepositoryListing
						key={"repo-" + i}
						repository={repository}
						truncate={true}
					/>
				))}
			</Grid>
			<Grid
				sx={{
					pt: 4,
					gridTemplateColumns: "auto auto",
				}}>
				<Box sx={{ textAlign: "left" }}>
					<SourceButton
						disabled={!router.query.next}
						onClick={() => router.back()}>
						Prev
					</SourceButton>
				</Box>
				<Box sx={{ textAlign: "right" }}>
					<SourceButton disabled={!nextPage} href={nextPage}>
						Next
					</SourceButton>
				</Box>
			</Grid>
		</>
	);
}
