import { NextRequest, NextResponse } from "next/server";
import { Actions, RepositoryListResponse, AccountFlags } from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { productsTable } from "@/lib/clients/database";

/**
 * @openapi
 * /repositories:
 *   get:
 *     tags: [Repositories]
 *     summary: List repositories
 *     description: Retrieves a list of repositories, optionally filtered by tags or search query.
 *     parameters:
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags to filter repositories
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for repository title, description, account_id, or repository_id
 *       - in: query
 *         name: next
 *         schema:
 *           type: integer
 *         description: Pagination cursor
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of repositories to return per page
 *     responses:
 *       200:
 *         description: Returns a list of repositories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RepositoryListResponse'
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const { searchParams } = new URL(request.url);
    const tags = searchParams.get("tags");
    const search = searchParams.get("search");
    const next = Number(searchParams.get("next")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const tagsArray =
      typeof tags === "string"
        ? tags.split(",").map((tag) => tag.trim().toLowerCase())
        : [];
    const filteredRepositories = [];
    const { products } = await productsTable.list();
    for (const repository of products) {
      let match = false;
      if (tagsArray.length === 0 && !search) {
        match = true;
      } else {
        if (search) {
          if (
            repository.meta.title
              .toLowerCase()
              .includes((search as string).toLowerCase())
          ) {
            match = true;
          }
          if (
            repository.meta.description
              .toLowerCase()
              .includes((search as string).toLowerCase())
          ) {
            match = true;
          }
          if (
            repository.account_id
              .toLowerCase()
              .includes((search as string).toLowerCase())
          ) {
            match = true;
          }
          if (
            repository.repository_id
              .toLowerCase()
              .includes((search as string).toLowerCase())
          ) {
            match = true;
          }
        }
        for (const tag of tagsArray) {
          if (repository.meta.tags.includes(tag)) {
            match = true;
          }
        }
      }
      if (
        repository.disabled &&
        !session?.account?.flags?.includes(AccountFlags.ADMIN)
      ) {
        continue;
      }
      if (match && isAuthorized(session, repository, Actions.ListRepository)) {
        filteredRepositories.push(repository);
      }
    }
    filteredRepositories.sort((a, b) => {
      const dateA = new Date(a.published);
      const dateB = new Date(b.published);
      return dateB.getTime() - dateA.getTime();
    });
    const startIndex = (next - 1) * limit;
    const endIndex = startIndex + limit;
    const repositoryResponse: RepositoryListResponse = {
      repositories: filteredRepositories.slice(startIndex, endIndex),
      count: filteredRepositories.length,
      next:
        filteredRepositories.length > endIndex ? String(next + 1) : undefined,
    };
    return NextResponse.json(repositoryResponse, { status: StatusCodes.OK });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
