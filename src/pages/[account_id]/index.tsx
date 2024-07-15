import { Layout } from "@/components/Layout";
import { ListUser } from "@/components/UserObject";
import { useRouter } from "next/router";
import { Divider, Grid, Heading } from "theme-ui";
import { RepositoryList } from "@/components/RepositoryList";
import {
	useProfile,
	useAccountRepositoryList,
	useUser,
	useAccountSideNav,
} from "@/lib/api";
import { useEffect } from "react";

export default function TenantDetails() {
	const router = useRouter();

	const { links } = useAccountSideNav({
		account_id: router.query.account_id,
		active_page: "repositories",
	});
	const { profile, isError } = useProfile({
		account_id: router.query.account_id,
	});

	useEffect(() => {
		console.log(router.query.account_id);
	}, [router.query.account_id]);

	const { result: repositoryResult } = useAccountRepositoryList({
		account_id: router.query.account_id,
		next: router.query.next,
		limit: 10,
	});

	return (
		<>
			<Layout notFound={isError && isError.status === 404} sideNavLinks={links}>
				<ListUser profile={profile} />
				<Divider />
				<Grid
					sx={{
						gridTemplateColumns: "1fr",
						justifyContent: "stretch",
						gridGap: 4,
					}}>
					{repositoryResult ? (
						repositoryResult.repositories.length > 0 ? (
							<RepositoryList
								repositoryResult={repositoryResult}
								isLoading={false}
								isError={false}
							/>
						) : (
							<Heading as="h2">No Repositories Found</Heading>
						)
					) : (
						<></>
					)}
				</Grid>
			</Layout>
		</>
	);
}
