import type { NextApiRequest, NextApiResponse } from "next";
import { get_repositories } from "@/lib/api/utils";
import { Repository } from "@/lib/api/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Repository[]>
) {
  const repositories = await get_repositories();

  res
    .status(200)
    .json(
      repositories.filter((repository: Repository) => repository.featured === 1)
    );
}
