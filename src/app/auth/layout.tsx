import { DefaultCardLayout } from "@ory/elements-react/theme";
import "@ory/elements-react/theme/styles.css";

export default ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {children}
    </div>
  );
};
