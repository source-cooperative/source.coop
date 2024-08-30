import type { NextApiRequest, NextApiResponse } from "next";
import { withErrorHandling } from "@/api/middleware";

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ message: "Hello World" });
}

export default withErrorHandling(handler);
