import { z } from "zod";

export const SideNavLinkSchema = z.object({
  title: z.string(),
  href: z.string(),
  active: z.boolean(),
});

export type SideNavLink = z.infer<typeof SideNavLinkSchema>;
