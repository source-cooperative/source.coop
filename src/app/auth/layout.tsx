import { Box } from "@radix-ui/themes";
import "@ory/elements-react/theme/styles.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Box asChild my="6">
        <main>{children}</main>
      </Box>
    </div>
  );
};
