import type { NextApiRequest, NextApiResponse } from "next";
import { get_repository } from "@/lib/api/utils";
import { ErrorResponse } from "@/lib/api/types";

type RepositoryServiceDetails = {
  type: string;
  url?: string;
};

type RepositoryService = {
  id: string;
  name: string;
  details: RepositoryServiceDetails;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RepositoryService[] | ErrorResponse>
) {
  const { account_id, repository_id } = req.query;

  const repository = await get_repository(
    account_id as string,
    repository_id as string
  );

  if (!repository) {
    return res
      .status(404)
      .json({
        code: 404,
        message: `Repository ${account_id}/${repository_id} not found`,
      });
  }

  res.status(200).json([
    {
      id: "readme",
      name: "Read Me",
      details: {
        type: "MARKDOWN",
        url: "{repository.data.cdn}/{repository.account_id}/{repository.repository_id}/README.md",
      },
    },
    {
      id: "browse",
      name: "Browse",
      details: {
        type: "FILE_BROWSER",
      },
    },
    {
      id: "access_data",
      name: "Access Data",
      details: {
        type: "ACCESS_DATA",
      },
    },
  ]);
}
