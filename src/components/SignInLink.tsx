import SourceLink from "./SourceLink";
import { useRouter } from "next/router";

export function SignInLink({children, ...props}) {
    const router = useRouter();

    return (
        <SourceLink href={`/auth/login?return_to=${process.env.NEXT_PUBLIC_BASE_URL + router.asPath}`} {...props}>
            {children}
        </SourceLink>
    )
}