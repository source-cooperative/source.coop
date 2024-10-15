/**
 * @fileoverview Authorization module for the Source Cooperative API.
 *
 * This module provides functions to check and enforce access control rules
 * for various actions in the Source Cooperative application. It implements
 * a role-based access control (RBAC) system with additional checks for
 * account ownership, membership status, and admin privileges.
 *
 * The main function, `isAuthorized`, serves as an entry point for all
 * authorization checks. It uses pattern matching to delegate to specific
 * authorization functions based on the action being performed.
 *
 * Key features:
 * - Granular permission checks for accounts, repositories, API keys, and memberships
 * - Support for different account types (user, organization, service)
 * - Handling of various membership roles and states
 * - Special handling for admin users
 *
 * @module api/authz
 * @requires @/api/types
 * @requires @/api/utils
 * @requires ts-pattern
 *
 * @example
 * import { isAuthorized } from '@/api/authz';
 *
 * const authorized = isAuthorized(userSession, repository, Actions.ReadRepositoryData);
 * if (authorized) {
 *   // Proceed with the action
 * } else {
 *   // Handle unauthorized access
 * }
 */

import {
  Account,
  Repository,
  Actions,
  UserSession,
  AccountFlags,
  AccountType,
  MembershipState,
  MembershipRole,
  RepositoryDataMode,
  APIKey,
  Membership,
  RepositoryState,
  DataConnection,
} from "@/api/types";
import { isAdmin } from "@/api/utils";
import { match } from "ts-pattern";

export function isAuthorized(
  principal: UserSession | null,
  resource:
    | Account
    | Repository
    | APIKey
    | Membership
    | DataConnection
    | undefined,
  action: Actions
): boolean {
  if (resource === undefined) {
    return false;
  }

  const result = match(action)
    .with(Actions.CreateAccount, () =>
      createAccount(principal, resource as Account)
    )
    .with(Actions.CreateRepository, () =>
      createRepository(principal, resource as Repository)
    )
    .with(Actions.DisableAccount, () =>
      disableAccount(principal, resource as Account)
    )
    .with(Actions.DisableRepository, () =>
      disableRepository(principal, resource as Repository)
    )
    .with(Actions.GetAccountProfile, () =>
      getAccountProfile(principal, resource as Account)
    )
    .with(Actions.PutRepository, () =>
      putRepository(principal, resource as Repository)
    )
    .with(Actions.ListRepository, () =>
      listRepository(principal, resource as Repository)
    )
    .with(Actions.ListAccount, () =>
      listAccount(principal, resource as Account)
    )
    .with(Actions.GetRepository, () =>
      getRepository(principal, resource as Repository)
    )
    .with(Actions.GetAccount, () => getAccount(principal, resource as Account))
    .with(Actions.ReadRepositoryData, () =>
      readRepositoryData(principal, resource as Repository)
    )
    .with(Actions.WriteRepositoryData, () =>
      writeRepositoryData(principal, resource as Repository)
    )
    .with(Actions.PutAccountProfile, () =>
      putAccountProfile(principal, resource as Account)
    )
    .with(Actions.GetAccountFlags, () =>
      getAccountFlags(principal, resource as Account)
    )
    .with(Actions.PutAccountFlags, () =>
      putAccountFlags(principal, resource as Account)
    )
    .with(Actions.ListAccountAPIKeys, () =>
      listAccountAPIKeys(principal, resource as Account)
    )
    .with(Actions.GetAPIKey, () => getAPIKey(principal, resource as APIKey))
    .with(Actions.CreateAPIKey, () =>
      createAPIKey(principal, resource as APIKey)
    )
    .with(Actions.RevokeAPIKey, () =>
      revokeAPIKey(principal, resource as APIKey)
    )
    .with(Actions.GetMembership, () =>
      getMembership(principal, resource as Membership)
    )
    .with(Actions.AcceptMembership, () =>
      acceptMembership(principal, resource as Membership)
    )
    .with(Actions.RejectMembership, () =>
      rejectMembership(principal, resource as Membership)
    )
    .with(Actions.RevokeMembership, () =>
      revokeMembership(principal, resource as Membership)
    )
    .with(Actions.InviteMembership, () =>
      inviteMembership(principal, resource as Membership)
    )
    .with(Actions.ListRepositoryAPIKeys, () =>
      listRepositoryAPIKeys(principal, resource as Repository)
    )
    .with(Actions.ListRepositoryMemberships, () =>
      listRepositoryMemberships(principal, resource as Repository)
    )
    .with(Actions.ListAccountMemberships, () =>
      listAccountMemberships(principal, resource as Account)
    )
    .with(Actions.GetDataConnection, () =>
      getDataConnection(principal, resource as DataConnection)
    )
    .with(Actions.CreateDataConnection, () =>
      createDataConnection(principal, resource as DataConnection)
    )
    .with(Actions.DisableDataConnection, () =>
      disableDataConnection(principal, resource as DataConnection)
    )
    .with(Actions.UseDataConnection, () =>
      useDataConnection(principal, resource as DataConnection)
    )
    .with(Actions.ViewDataConnectionCredentials, () =>
      viewDataConnectionCredentials(principal, resource as DataConnection)
    )
    .with(Actions.PutDataConnection, () =>
      putDataConnection(principal, resource as DataConnection)
    )
    .otherwise(() => false);

  return result;
}

function getDataConnection(
  principal: UserSession | null,
  dataConnection: DataConnection
): boolean {
  if (principal?.account?.disabled) {
    return false;
  }

  return true;
}

function createDataConnection(
  principal: UserSession | null,
  dataConnection: DataConnection
): boolean {
  if (principal?.account?.disabled) {
    return false;
  }

  if (isAdmin(principal)) {
    return true;
  }
  return false;
}

function disableDataConnection(
  principal: UserSession | null,
  dataConnection: DataConnection
): boolean {
  if (principal?.account?.disabled) {
    return false;
  }

  if (isAdmin(principal)) {
    return true;
  }

  return false;
}

function useDataConnection(
  principal: UserSession | null,
  dataConnection: DataConnection
): boolean {
  if (principal?.account?.disabled) {
    return false;
  }

  if (isAdmin(principal)) {
    return true;
  }

  if (dataConnection.read_only) {
    return false;
  }

  if (dataConnection.required_flag) {
    if (principal?.account?.flags?.includes(dataConnection.required_flag)) {
      return true;
    }
    return false;
  } else {
    return true;
  }
}

function viewDataConnectionCredentials(
  principal: UserSession | null,
  dataConnection: DataConnection
): boolean {
  if (principal?.account?.disabled) {
    return false;
  }

  if (isAdmin(principal)) {
    return true;
  }

  return false;
}

function putDataConnection(
  principal: UserSession | null,
  dataConnection: DataConnection
): boolean {
  if (principal?.account?.disabled) {
    return false;
  }

  if (isAdmin(principal)) {
    return true;
  }

  return false;
}

function putAccountFlags(
  principal: UserSession | null,
  account: Account
): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // Deny all users from changing their own flags
  return false;
}

function getAccountFlags(
  principal: UserSession | null,
  account: Account
): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the account is disabled, no one is authorized
  if (account.disabled) {
    return false;
  }

  // If the user is the account owner, they are authorized
  if (principal?.account?.account_id === account.account_id) {
    return true;
  }

  // If the account is not an organization, no one is authorized
  if (account.account_type !== AccountType.ORGANIZATION) {
    return false;
  }

  // If the user is an owner or maintainer of the repository, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    account.account_id
  );

  return false;
}

function putAccountProfile(
  principal: UserSession | null,
  account: Account
): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the account is disabled, no one is authorized
  if (account.disabled) {
    return false;
  }

  // If the user is the account owner, they are authorized
  if (principal?.account?.account_id === account.account_id) {
    return true;
  }

  // If the account is not an organization, no one is authorized
  if (account.account_type !== AccountType.ORGANIZATION) {
    return false;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    account.account_id
  );
}

function writeRepositoryData(
  principal: UserSession | null,
  repository: Repository
): boolean {
  // If the repository is disabled, no one is authorized
  if (repository.disabled) {
    return false;
  }

  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the account is disabled, no one is authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === repository.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the repository, they are authorized
  return hasRole(
    principal,
    [
      MembershipRole.Owners,
      MembershipRole.Maintainers,
      MembershipRole.WriteData,
    ],
    repository.account_id,
    repository.repository_id
  );
}

function readRepositoryData(
  principal: UserSession | null,
  repository: Repository
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the repository is disabled, they are not authorized
  if (repository.disabled) {
    return false;
  }

  // If the repository is open, everyone is authorized
  if (repository.data_mode === RepositoryDataMode.Open) {
    return true;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === repository.account_id) {
    return true;
  }

  // If the user is a member of the repository, they are authorized
  return hasRole(
    principal,
    [
      MembershipRole.Owners,
      MembershipRole.Maintainers,
      MembershipRole.WriteData,
      MembershipRole.ReadData,
    ],
    repository.account_id,
    repository.repository_id
  );
}

function getRepository(
  principal: UserSession | null,
  repository: Repository
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the repository is disabled, they are not authorized
  if (repository.disabled) {
    return false;
  }

  // If the repository is open, everyone is authorized
  if (repository.data_mode === RepositoryDataMode.Open) {
    return true;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === repository.account_id) {
    return true;
  }

  // If the user is a member of the repository, they are authorized
  return hasRole(
    principal,
    [
      MembershipRole.Owners,
      MembershipRole.Maintainers,
      MembershipRole.WriteData,
      MembershipRole.ReadData,
    ],
    repository.account_id,
    repository.repository_id
  );
}

function listRepository(
  principal: UserSession | null,
  repository: Repository
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the repository is disabled, they are not authorized
  if (repository.disabled) {
    return false;
  }

  // If the repository is listed , everyone is authorized
  if (
    repository.state === RepositoryState.Listed &&
    repository.data_mode === RepositoryDataMode.Open
  ) {
    return true;
  }

  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === repository.account_id) {
    return true;
  }

  // If the user is a member of the repository, they are authorized
  return hasRole(
    principal,
    [
      MembershipRole.Owners,
      MembershipRole.Maintainers,
      MembershipRole.ReadData,
      MembershipRole.WriteData,
    ],
    repository.account_id,
    repository.repository_id
  );
}

function putRepository(
  principal: UserSession | null,
  repository: Repository
): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the repository is disabled, they are not authorized
  if (repository.disabled) {
    return false;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === repository.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the repository, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    repository.account_id,
    repository.repository_id
  );
}

function getAccountProfile(
  principal: UserSession | null,
  account: Account
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the account is disabled, they are not authorized
  if (account.disabled) {
    return false;
  }

  return true;
}

function disableRepository(
  principal: UserSession | null,
  repository: Repository
): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the repository is disabled, they are not authorized
  if (repository.disabled) {
    return false;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === repository.account_id) {
    return true;
  }

  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    repository.account_id,
    repository.repository_id
  );
}

function disableAccount(
  principal: UserSession | null,
  account: Account
): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal || !principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  if (account.account_type === AccountType.ORGANIZATION) {
    return hasRole(principal, [MembershipRole.Owners], account.account_id);
  }

  return false;
}

function getAccount(principal: UserSession | null, account: Account): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  if (account.account_type === AccountType.ORGANIZATION) {
    return hasRole(
      principal,
      [MembershipRole.Owners, MembershipRole.Maintainers],
      account.account_id
    );
  } else if (account.account_type === AccountType.USER) {
    if (principal?.account?.account_id === account.account_id) {
      return true;
    }
  }

  return false;
}

function listAccount(principal: UserSession | null, account: Account): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  if (account.account_type === AccountType.ORGANIZATION) {
    return hasRole(
      principal,
      [MembershipRole.Owners, MembershipRole.Maintainers],
      account.account_id
    );
  } else if (account.account_type === AccountType.USER) {
    if (principal?.account?.account_id === account.account_id) {
      return true;
    }
  }

  return false;
}

function createRepository(
  principal: UserSession | null,
  repository: Repository
): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user does not have the create repositories flag, they are not authorized
  if (!principal?.account?.flags.includes(AccountFlags.CREATE_REPOSITORIES)) {
    return false;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === repository.account_id) {
    return true;
  }

  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    repository.account_id,
    repository.repository_id
  );
}

function createAccount(
  principal: UserSession | null,
  account: Account
): boolean {
  // Handle user creation
  if (account.account_type === AccountType.USER) {
    // If the user is not signed in or has already created an account, they are not authorized
    if (principal?.account || !principal?.identity_id) {
      return false;
    }

    return true;
  }

  // Handle organization creation
  if (account.account_type === AccountType.ORGANIZATION) {
    // If the user does not have an account, they are not authorized
    if (!principal?.account) {
      return false;
    }

    // If the user is disabled, they are not authorized
    if (principal?.account?.disabled) {
      return false;
    }

    // If the user is an admin, they are authorized
    if (isAdmin(principal)) {
      return true;
    }

    // If the user has the create organizations flag, they are authorized
    if (principal.account.flags.includes(AccountFlags.CREATE_ORGANIZATIONS)) {
      return true;
    }

    return false;
  }

  // Let admins create service accounts
  if (account.account_type === AccountType.SERVICE) {
    return isAdmin(principal);
  }

  return false;
}

function createAPIKey(principal: UserSession | null, api_key: APIKey): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user is the owner of the API key, they are authorized
  if (api_key.account_id === principal.account.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    api_key.account_id,
    api_key.repository_id
  );
}

function listAccountAPIKeys(
  principal: UserSession | null,
  account: Account
): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user is the owner of the API key, they are authorized
  if (account.account_id === principal.account.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    account.account_id
  );
}

function listAccountMemberships(
  principal: UserSession | null,
  account: Account
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  return true;
}

function listRepositoryAPIKeys(
  principal: UserSession | null,
  repository: Repository
): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user is the owner of the API key, they are authorized
  if (repository.account_id === principal.account.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    repository.account_id,
    repository.repository_id
  );
}

function listRepositoryMemberships(
  principal: UserSession | null,
  repository: Repository
): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user is the owner of the API key, they are authorized
  if (repository.account_id === principal.account.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    repository.account_id,
    repository.repository_id
  );
}

function revokeAPIKey(principal: UserSession | null, api_key: APIKey): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the API key is disabled, the user is not authorized
  if (api_key.disabled) {
    return false;
  }

  // If the user is the owner of the API key, they are authorized
  if (api_key.account_id === principal.account.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    api_key.account_id,
    api_key.repository_id
  );
}

function getAPIKey(principal: UserSession | null, api_key: APIKey): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the API key is disabled, the user is not authorized
  if (api_key.disabled) {
    return false;
  }

  // If the user is the owner of the API key, they are authorized
  if (api_key.account_id === principal?.account?.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    api_key.account_id,
    api_key.repository_id
  );
}

function getMembership(
  principal: UserSession | null,
  membership: Membership
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the membership is active, the user is authorized
  if (membership.state === MembershipState.Member) {
    return true;
  }

  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  if (membership.state === MembershipState.Revoked) {
    return false;
  }

  // If the membership pertains to the principal's account, they are authorized
  if (principal?.account?.account_id === membership.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization or repository, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    membership.membership_account_id,
    membership.repository_id
  );
}

function acceptMembership(
  principal: UserSession | null,
  membership: Membership
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the membership pertains to the principal's account, they are authorized
  if (principal?.account?.account_id === membership.account_id) {
    return true;
  }

  return false;
}

function rejectMembership(
  principal: UserSession | null,
  membership: Membership
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the membership pertains to the principal's account, they are authorized
  if (principal?.account?.account_id === membership.account_id) {
    return true;
  }

  return false;
}

function revokeMembership(
  principal: UserSession | null,
  membership: Membership
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the membership pertains to the principal's account, they are authorized
  if (principal?.account?.account_id === membership.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization or repository, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    membership.membership_account_id,
    membership.repository_id
  );
}

function inviteMembership(
  principal: UserSession | null,
  membership: Membership
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user is an owner or maintainer of the organization or repository, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    membership.membership_account_id,
    membership.repository_id
  );
}

function hasRole(
  principal: UserSession | null,
  roles: MembershipRole[],
  account_id: String,
  repository_id?: String
): boolean {
  // If the user is the owner of the account, they are authorized
  if (principal?.account?.account_id === account_id) {
    return true;
  }

  if (!principal || !principal?.memberships || !principal?.account) {
    return false;
  }

  for (var membership of principal.memberships) {
    if (membership.state !== MembershipState.Member) {
      continue;
    }

    if (membership.membership_account_id !== account_id) {
      continue;
    }

    if (!roles.includes(membership.role)) {
      continue;
    }

    // If the membership is organizationship-wide, return true
    if (
      !membership.repository_id &&
      membership.membership_account_id === account_id
    ) {
      return true;
    }

    // If the membership is repository-specific, check the repository_id
    if (
      membership.repository_id &&
      membership.membership_account_id === account_id &&
      membership.repository_id === repository_id
    ) {
      return true;
    }
  }

  return false;
}
