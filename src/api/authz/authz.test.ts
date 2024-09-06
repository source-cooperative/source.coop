import { isAuthorized } from "./index";
import {
  sessions,
  mappedRepositories,
  mappedAPIKeys,
  memberships,
} from "../utils/mock";
import {
  Account,
  Actions,
  AccountType,
  AccountFlags,
  DataConnection,
  S3Regions,
  DataProvider,
  RepositoryDataMode,
} from "@/api/types";

describe("Authorization Tests", () => {
  test("Action: repository:create", () => {
    const action = Actions.CreateRepository;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Regular User Repository
    repo =
      mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);
  });

  test("Action: repository:get", () => {
    const action = Actions.GetRepository;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(true);

    // Regular User Repository
    repo =
      mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(true);

    // Unlisted Repository
    repo = mappedRepositories["organization"]["unlisted-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(true);

    // Private Repository
    repo = mappedRepositories["organization"]["private-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);
  });

  test("Action: repository:list", () => {
    const action = Actions.ListRepository;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(true);

    // Regular User Repository
    repo =
      mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(true);

    // Unlisted Repository
    repo = mappedRepositories["organization"]["unlisted-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Private Repository
    repo = mappedRepositories["organization"]["private-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);
  });

  test("Action: repository:disable", () => {
    const action = Actions.DisableRepository;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Regular User Repository
    repo =
      mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);
  });

  test("Action: repository:put", () => {
    const action = Actions.PutRepository;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Regular User Repository
    repo =
      mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);
  });

  test("Action: repository:data:read", () => {
    const action = Actions.ReadRepositoryData;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(true);

    // Regular User Repository
    repo =
      mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(true);

    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Private Repository
    repo = mappedRepositories["organization"]["private-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Unlisted Repository
    repo = mappedRepositories["organization"]["unlisted-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(true);
  });

  test("Action: repository:data:write", () => {
    const action = Actions.WriteRepositoryData;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Regular User Repository
    repo =
      mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Private Repository
    repo = mappedRepositories["organization"]["private-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Unlisted Repository
    repo = mappedRepositories["organization"]["unlisted-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);
  });

  test("Action: repository:listAPIKeys", () => {
    const action = Actions.ListRepositoryAPIKeys;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Regular User Repository
    repo =
      mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);
  });

  test("Action: repository:listRepositoryMemberships", () => {
    const action = Actions.ListRepositoryMemberships;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);

    // Regular User Repository
    repo =
      mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], repo, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], repo, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-maintainer"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-read-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-write-data"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["repo-member-invited"], repo, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], repo, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action)).toBe(false);
  });

  test("Action: account:create", () => {
    const action = Actions.CreateAccount;

    // User Account
    var account: Account = sessions["regular-user"]!.account as Account;
    expect(isAuthorized(sessions["admin"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(true);

    // Organization Account
    account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States",
      },
      flags: [],
    };
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);
  });

  test("Action: account:disable", () => {
    const action = Actions.DisableAccount;

    // User Account
    var account = sessions["regular-user"]!.account;
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);

    // Organization Account
    account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States",
      },
      flags: [],
    };
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);
  });

  test("Action: account:get", () => {
    const action = Actions.GetAccount;

    // User Account
    var account = sessions["regular-user"]!.account;
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);

    // Organization Account
    account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States",
      },
      flags: [],
    };
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);
  });

  test("Action: account:listMemberships", () => {
    const action = Actions.ListAccountMemberships;

    // User Account
    var account = sessions["regular-user"]!.account;
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);

    // Organization Account
    account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States",
      },
      flags: [],
    };
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);
  });

  test("Action: account:listAPIKeys", () => {
    const action = Actions.ListAccountAPIKeys;

    // User Account
    var account = sessions["regular-user"]!.account;
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);

    // Organization Account
    account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States",
      },
      flags: [],
    };
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);
  });

  test("Action: account:list", () => {
    const action = Actions.ListAccount;

    // User Account
    var account = sessions["regular-user"]!.account;
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], account, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], account, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);

    // Organization Account
    account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States",
      },
      flags: [],
    };
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], account, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], account, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);
  });

  test("Action: account:listAPIKeys", () => {
    const action = Actions.ListAccountAPIKeys;

    // User Account
    var account = sessions["regular-user"]!.account;
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], account, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], account, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);

    // Organization Account
    account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States",
      },
      flags: [],
    };
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], account, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], account, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);
  });

  test("Action: account:flags:get", () => {
    const action = Actions.GetAccountFlags;

    // User Account
    var account = sessions["regular-user"]!.account;
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], account, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], account, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);

    // Organization Account
    account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States",
      },
      flags: [],
    };
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], account, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], account, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);
  });

  test("Action: account:flags:put", () => {
    const action = Actions.PutAccountFlags;

    // User Account
    var account = sessions["regular-user"]!.account;
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], account, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], account, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);

    // Organization Account
    account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States",
      },
      flags: [],
    };
    expect(isAuthorized(sessions["admin"], account, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], account, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], account, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], account, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], account, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], account, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action)).toBe(false);
  });

  test("Action: api_key:get", () => {
    const action = Actions.GetAPIKey;

    // Regular User API Key
    var apiKey = mappedAPIKeys["SCREGULARUSER"];
    expect(isAuthorized(sessions["admin"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], apiKey, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], apiKey, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action)).toBe(false);

    // Disabled API Key
    var apiKey = mappedAPIKeys["SCDISABLED"];
    expect(isAuthorized(sessions["admin"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], apiKey, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], apiKey, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action)).toBe(false);

    // Organization API Key
    var apiKey = mappedAPIKeys["SCORGANIZATION"];
    expect(isAuthorized(sessions["admin"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], apiKey, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], apiKey, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action)).toBe(false);

    // Repository API Key
    var apiKey = mappedAPIKeys["SCREPOSITORY"];
    expect(isAuthorized(sessions["admin"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], apiKey, action)).toBe(
      true
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-read-data"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], apiKey, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action)).toBe(false);
  });

  test("Action: api_key:revoke", () => {
    const action = Actions.RevokeAPIKey;

    // Regular User API Key
    var apiKey = mappedAPIKeys["SCREGULARUSER"];
    expect(isAuthorized(sessions["admin"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], apiKey, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], apiKey, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action)).toBe(false);

    // Disabled API Key
    var apiKey = mappedAPIKeys["SCDISABLED"];
    expect(isAuthorized(sessions["admin"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], apiKey, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], apiKey, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action)).toBe(false);

    // Organization API Key
    var apiKey = mappedAPIKeys["SCORGANIZATION"];
    expect(isAuthorized(sessions["admin"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], apiKey, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], apiKey, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action)).toBe(false);

    // Repository API Key
    var apiKey = mappedAPIKeys["SCREPOSITORY"];
    expect(isAuthorized(sessions["admin"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], apiKey, action)).toBe(
      true
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-read-data"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], apiKey, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action)).toBe(false);
  });

  test("Action: api_key:create", () => {
    const action = Actions.CreateAPIKey;

    // Regular User API Key
    var apiKey = mappedAPIKeys["SCREGULARUSER"];
    expect(isAuthorized(sessions["admin"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], apiKey, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], apiKey, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action)).toBe(false);

    // Organization API Key
    var apiKey = mappedAPIKeys["SCORGANIZATION"];
    expect(isAuthorized(sessions["admin"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], apiKey, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], apiKey, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action)).toBe(false);

    // Repository API Key
    var apiKey = mappedAPIKeys["SCREPOSITORY"];
    expect(isAuthorized(sessions["admin"], apiKey, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-owner"], apiKey, action)).toBe(
      true
    );
    expect(
      isAuthorized(sessions["repo-member-maintainer"], apiKey, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-read-data"], apiKey, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["repo-member-invited"], apiKey, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["disabled"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action)).toBe(false);
    expect(
      isAuthorized(sessions["create-repositories-user"], apiKey, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action)).toBe(false);
  });

  test("Action: membership:get", () => {
    const action = Actions.GetMembership;

    // Regular User Organization Invitation
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "regular-user" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      true
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );

    // Organization Owner Member
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "organization-owner-user" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(true);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      true
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(true);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(true);

    // Revoked Membership
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "create-repositories-user" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );

    // Regular User Repository Membership Invite
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "repo-member-invited" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(true);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );
  });

  test("Action: membership:accept", () => {
    const action = Actions.AcceptMembership;

    // Regular User Organization Invitation
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "regular-user" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      true
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );

    // Regular User Repository Membership Invite
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "repo-member-invited" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(true);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );
  });

  test("Action: membership:reject", () => {
    const action = Actions.RejectMembership;

    // Regular User Organization Invitation
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "regular-user" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      true
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );

    // Regular User Repository Membership Invite
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "repo-member-invited" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(true);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );
  });

  test("Action: membership:revoke", () => {
    const action = Actions.RevokeMembership;

    // Organization Owner Membership
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "organization-owner-user" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );

    // Organization Member Membership
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "organization-read-data-user" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );

    // Repository Member Membership
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "repo-member-owner" &&
        membership.membership_account_id == "organization" &&
        membership.repository_id == "org-repo-id"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );
  });

  test("Action: membership:invite", () => {
    const action = Actions.InviteMembership;

    // Regular User Membership Invite
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "regular-user" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );

    // Regular User Repository Membership Invite
    var membership = memberships.find((membership) => {
      return (
        membership.account_id == "repo-member-invited" &&
        membership.membership_account_id == "organization"
      );
    });
    expect(isAuthorized(sessions["admin"], membership, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-maintainer-user"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-read-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["organization-write-data-user"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], membership, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-read-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], membership, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], membership, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action)).toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action)).toBe(
      false
    );
  });

  test("Action: data_connection:get", () => {
    const action = Actions.GetDataConnection;

    var dataConnection: DataConnection = {
      data_connection_id: "test-connection",
      name: "Test Connection",
      read_only: false,
      allowed_data_modes: [RepositoryDataMode.Open],
      details: {
        provider: DataProvider.S3,
        bucket: "test-bucket",
        base_prefix: "test-prefix",
        region: S3Regions.US_EAST_1,
      },
    };

    expect(isAuthorized(sessions["admin"], dataConnection, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], dataConnection, action)
    ).toBe(true);
    expect(
      isAuthorized(
        sessions["organization-maintainer-user"],
        dataConnection,
        action
      )
    ).toBe(true);
    expect(
      isAuthorized(
        sessions["organization-read-data-user"],
        dataConnection,
        action
      )
    ).toBe(true);
    expect(
      isAuthorized(
        sessions["organization-write-data-user"],
        dataConnection,
        action
      )
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-owner"], dataConnection, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], dataConnection, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-read-data"], dataConnection, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-write-data"], dataConnection, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-invited"], dataConnection, action)
    ).toBe(true);
    expect(isAuthorized(sessions["disabled"], dataConnection, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["regular-user"], dataConnection, action)).toBe(
      true
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], dataConnection, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], dataConnection, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["no-account"], dataConnection, action)).toBe(
      true
    );
  });

  test("Action: data_connection:create", () => {
    const action = Actions.CreateDataConnection;

    var dataConnection: DataConnection = {
      data_connection_id: "test-connection",
      name: "Test Connection",
      read_only: false,
      allowed_data_modes: [RepositoryDataMode.Open],
      details: {
        provider: DataProvider.S3,
        bucket: "test-bucket",
        base_prefix: "test-prefix",
        region: S3Regions.US_EAST_1,
      },
    };

    expect(isAuthorized(sessions["admin"], dataConnection, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-maintainer-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-read-data-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-write-data-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], dataConnection, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], dataConnection, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["regular-user"], dataConnection, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], dataConnection, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], dataConnection, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["no-account"], dataConnection, action)).toBe(
      false
    );
  });

  test("Action: data_connection:disable", () => {
    const action = Actions.DisableDataConnection;

    var dataConnection: DataConnection = {
      data_connection_id: "test-connection",
      name: "Test Connection",
      read_only: false,
      allowed_data_modes: [RepositoryDataMode.Open],
      details: {
        provider: DataProvider.S3,
        bucket: "test-bucket",
        base_prefix: "test-prefix",
        region: S3Regions.US_EAST_1,
      },
    };

    expect(isAuthorized(sessions["admin"], dataConnection, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-maintainer-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-read-data-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-write-data-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], dataConnection, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], dataConnection, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["regular-user"], dataConnection, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], dataConnection, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], dataConnection, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["no-account"], dataConnection, action)).toBe(
      false
    );
  });

  test("Action: data_connection:use", () => {
    const action = Actions.UseDataConnection;

    var dataConnection: DataConnection = {
      data_connection_id: "test-connection",
      name: "Test Connection",
      read_only: false,
      allowed_data_modes: [RepositoryDataMode.Open],
      details: {
        provider: DataProvider.S3,
        bucket: "test-bucket",
        base_prefix: "test-prefix",
        region: S3Regions.US_EAST_1,
      },
    };

    expect(isAuthorized(sessions["admin"], dataConnection, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], dataConnection, action)
    ).toBe(true);
    expect(
      isAuthorized(
        sessions["organization-maintainer-user"],
        dataConnection,
        action
      )
    ).toBe(true);
    expect(
      isAuthorized(
        sessions["organization-read-data-user"],
        dataConnection,
        action
      )
    ).toBe(true);
    expect(
      isAuthorized(
        sessions["organization-write-data-user"],
        dataConnection,
        action
      )
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-owner"], dataConnection, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], dataConnection, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-read-data"], dataConnection, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-write-data"], dataConnection, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["repo-member-invited"], dataConnection, action)
    ).toBe(true);
    expect(isAuthorized(sessions["disabled"], dataConnection, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["regular-user"], dataConnection, action)).toBe(
      true
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], dataConnection, action)
    ).toBe(true);
    expect(isAuthorized(sessions["anonymous"], dataConnection, action)).toBe(
      true
    );
    expect(isAuthorized(sessions["no-account"], dataConnection, action)).toBe(
      true
    );

    // Test with read_only set to true
    dataConnection.read_only = true;
    expect(isAuthorized(sessions["admin"], dataConnection, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], dataConnection, action)
    ).toBe(false);
    expect(isAuthorized(sessions["regular-user"], dataConnection, action)).toBe(
      false
    );

    // Test with required_flag
    dataConnection.read_only = false;
    dataConnection.required_flag = AccountFlags.CREATE_REPOSITORIES;
    expect(isAuthorized(sessions["admin"], dataConnection, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], dataConnection, action)
    ).toBe(true);
    expect(
      isAuthorized(sessions["create-repositories-user"], dataConnection, action)
    ).toBe(true);
    expect(isAuthorized(sessions["regular-user"], dataConnection, action)).toBe(
      false
    );
  });

  test("Action: data_connection:credentials:view", () => {
    const action = Actions.ViewDataConnectionCredentials;

    var dataConnection: DataConnection = {
      data_connection_id: "test-connection",
      name: "Test Connection",
      read_only: false,
      allowed_data_modes: [RepositoryDataMode.Open],
      details: {
        provider: DataProvider.S3,
        bucket: "test-bucket",
        base_prefix: "test-prefix",
        region: S3Regions.US_EAST_1,
      },
    };

    expect(isAuthorized(sessions["admin"], dataConnection, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-maintainer-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-read-data-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-write-data-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], dataConnection, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], dataConnection, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["regular-user"], dataConnection, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], dataConnection, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], dataConnection, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["no-account"], dataConnection, action)).toBe(
      false
    );
  });

  test("Action: data_connection:put", () => {
    const action = Actions.PutDataConnection;

    var dataConnection: DataConnection = {
      data_connection_id: "test-connection",
      name: "Test Connection",
      read_only: false,
      allowed_data_modes: [RepositoryDataMode.Open],
      details: {
        provider: DataProvider.S3,
        bucket: "test-bucket",
        base_prefix: "test-prefix",
        region: S3Regions.US_EAST_1,
      },
    };

    expect(isAuthorized(sessions["admin"], dataConnection, action)).toBe(true);
    expect(
      isAuthorized(sessions["organization-owner-user"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-maintainer-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-read-data-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(
        sessions["organization-write-data-user"],
        dataConnection,
        action
      )
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-owner"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-maintainer"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-read-data"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-write-data"], dataConnection, action)
    ).toBe(false);
    expect(
      isAuthorized(sessions["repo-member-invited"], dataConnection, action)
    ).toBe(false);
    expect(isAuthorized(sessions["disabled"], dataConnection, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["regular-user"], dataConnection, action)).toBe(
      false
    );
    expect(
      isAuthorized(sessions["create-repositories-user"], dataConnection, action)
    ).toBe(false);
    expect(isAuthorized(sessions["anonymous"], dataConnection, action)).toBe(
      false
    );
    expect(isAuthorized(sessions["no-account"], dataConnection, action)).toBe(
      false
    );
  });
});
