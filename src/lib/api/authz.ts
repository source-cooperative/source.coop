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
 * @requires @/types
 * @requires @/api/utils
 * @requires ts-pattern
 *
 * @example
 * import { isAuthorized } from '@/lib/api/authz';
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
  AccountFlags,
  AccountType,
  Actions,
  APIKey,
  DataConnection,
  Membership,
  MembershipRole,
  MembershipState,
  Product,
  ProductDataMode,
  UserSession,
} from "@/types";
import { match } from "ts-pattern";

// Type mapping: which resource type is required for each action
type ActionResourceMap = {
  // Account actions
  [Actions.GetAccount]: Account;
  [Actions.GetAccountProfile]: Account;
  [Actions.PutAccountProfile]: Account;
  [Actions.GetAccountFlags]: Account;
  [Actions.PutAccountFlags]: Account;
  [Actions.ListAccount]: Account;
  [Actions.DisableAccount]: Account;
  [Actions.ListAccountAPIKeys]: Account;
  [Actions.ListAccountMemberships]: Account;
  [Actions.CreateAccount]: Account | "*";

  // Product/Repository actions
  [Actions.GetRepository]: Product;
  [Actions.ListRepository]: Product;
  [Actions.PutRepository]: Product;
  [Actions.DisableRepository]: Product;
  [Actions.ReadRepositoryData]: Product;
  [Actions.WriteRepositoryData]: Product;
  [Actions.ListRepositoryAPIKeys]: Product;
  [Actions.ListRepositoryMemberships]: Product;
  [Actions.CreateRepository]: Product | "*";

  // API Key actions
  [Actions.GetAPIKey]: APIKey;
  [Actions.CreateAPIKey]: APIKey;
  [Actions.RevokeAPIKey]: APIKey;

  // Membership actions
  [Actions.GetMembership]: Membership;
  [Actions.AcceptMembership]: Membership;
  [Actions.RejectMembership]: Membership;
  [Actions.RevokeMembership]: Membership;
  [Actions.UpdateMembershipRole]: Membership;
  [Actions.InviteMembership]: Pick<
    Membership,
    "membership_account_id" | "repository_id"
  >;

  // Data Connection actions
  [Actions.GetDataConnection]: DataConnection;
  [Actions.CreateDataConnection]: DataConnection;
  [Actions.DisableDataConnection]: DataConnection;
  [Actions.UseDataConnection]: DataConnection;
  [Actions.ViewDataConnectionCredentials]: DataConnection;
  [Actions.PutDataConnection]: DataConnection;
  [Actions.DeleteDataConnection]: DataConnection;
};

// Type helper to extract resource type from ActionResourceMap
type ResourceForAction<A extends Actions> = ActionResourceMap[A];

// Function overload signatures for type safety without generic inference overhead
// Account action overloads
export function isAuthorized(
  principal: UserSession | null,
  resource: Account,
  action: Actions.GetAccount
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Account,
  action: Actions.GetAccountProfile
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Account,
  action: Actions.PutAccountProfile
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Account,
  action: Actions.GetAccountFlags
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Account,
  action: Actions.PutAccountFlags
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Account,
  action: Actions.ListAccount
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Account,
  action: Actions.DisableAccount
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Account,
  action: Actions.ListAccountAPIKeys
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Account,
  action: Actions.ListAccountMemberships
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Account | "*",
  action: Actions.CreateAccount
): boolean;

// Product/Repository action overloads
export function isAuthorized(
  principal: UserSession | null,
  resource: Product,
  action: Actions.GetRepository
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Product,
  action: Actions.ListRepository
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Product,
  action: Actions.PutRepository
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Product,
  action: Actions.DisableRepository
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Product,
  action: Actions.ReadRepositoryData
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Product,
  action: Actions.WriteRepositoryData
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Product,
  action: Actions.ListRepositoryAPIKeys
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Product,
  action: Actions.ListRepositoryMemberships
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Product | "*",
  action: Actions.CreateRepository
): boolean;

// API Key action overloads
export function isAuthorized(
  principal: UserSession | null,
  resource: APIKey,
  action: Actions.GetAPIKey
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: APIKey,
  action: Actions.CreateAPIKey
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: APIKey,
  action: Actions.RevokeAPIKey
): boolean;

// Membership action overloads
export function isAuthorized(
  principal: UserSession | null,
  resource: Membership,
  action: Actions.GetMembership
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Membership,
  action: Actions.AcceptMembership
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Membership,
  action: Actions.RejectMembership
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Membership,
  action: Actions.RevokeMembership
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Membership,
  action: Actions.UpdateMembershipRole
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: Pick<Membership, "membership_account_id" | "repository_id">,
  action: Actions.InviteMembership
): boolean;

// Data Connection action overloads
export function isAuthorized(
  principal: UserSession | null,
  resource: DataConnection,
  action: Actions.GetDataConnection
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: DataConnection,
  action: Actions.CreateDataConnection
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: DataConnection,
  action: Actions.DisableDataConnection
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: DataConnection,
  action: Actions.UseDataConnection
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: DataConnection,
  action: Actions.ViewDataConnectionCredentials
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: DataConnection,
  action: Actions.PutDataConnection
): boolean;
export function isAuthorized(
  principal: UserSession | null,
  resource: DataConnection,
  action: Actions.DeleteDataConnection
): boolean;

// Implementation signature - uses union of all possible resource types
export function isAuthorized(
  principal: UserSession | null,
  resource: ResourceForAction<Actions> | undefined,
  action: Actions
): boolean {
  if (resource === undefined) {
    return false;
  }

  // Match on action only, using type assertion with proper type narrowing context
  // This avoids the generic parameter overhead while maintaining exhaustiveness checking
  return (
    match(action)
      .with(Actions.CreateAccount, () =>
        createAccount(principal, resource as ResourceForAction<Actions.CreateAccount>)
      )
      .with(Actions.CreateRepository, () =>
        createRepository(principal, resource as ResourceForAction<Actions.CreateRepository>)
      )
      .with(Actions.DisableAccount, () =>
        disableAccount(principal, resource as ResourceForAction<Actions.DisableAccount>)
      )
      .with(Actions.DisableRepository, () =>
        disableRepository(principal, resource as ResourceForAction<Actions.DisableRepository>)
      )
      .with(Actions.GetAccountProfile, () =>
        getAccountProfile(principal, resource as ResourceForAction<Actions.GetAccountProfile>)
      )
      .with(Actions.PutRepository, () =>
        putRepository(principal, resource as ResourceForAction<Actions.PutRepository>)
      )
      .with(Actions.ListRepository, () =>
        listRepository(principal, resource as ResourceForAction<Actions.ListRepository>)
      )
      .with(Actions.ListAccount, () =>
        listAccount(principal, resource as ResourceForAction<Actions.ListAccount>)
      )
      .with(Actions.GetRepository, () =>
        getRepository(principal, resource as ResourceForAction<Actions.GetRepository>)
      )
      .with(Actions.GetAccount, () =>
        getAccount(principal, resource as ResourceForAction<Actions.GetAccount>)
      )
      .with(Actions.ReadRepositoryData, () =>
        readRepositoryData(principal, resource as ResourceForAction<Actions.ReadRepositoryData>)
      )
      .with(Actions.WriteRepositoryData, () =>
        writeRepositoryData(principal, resource as ResourceForAction<Actions.WriteRepositoryData>)
      )
      .with(Actions.PutAccountProfile, () =>
        putAccountProfile(principal, resource as ResourceForAction<Actions.PutAccountProfile>)
      )
      .with(Actions.GetAccountFlags, () =>
        getAccountFlags(principal, resource as ResourceForAction<Actions.GetAccountFlags>)
      )
      .with(Actions.PutAccountFlags, () =>
        putAccountFlags(principal, resource as ResourceForAction<Actions.PutAccountFlags>)
      )
      .with(Actions.ListAccountAPIKeys, () =>
        listAccountAPIKeys(principal, resource as ResourceForAction<Actions.ListAccountAPIKeys>)
      )
      .with(Actions.GetAPIKey, () =>
        getAPIKey(principal, resource as ResourceForAction<Actions.GetAPIKey>)
      )
      .with(Actions.CreateAPIKey, () =>
        createAPIKey(principal, resource as ResourceForAction<Actions.CreateAPIKey>)
      )
      .with(Actions.RevokeAPIKey, () =>
        revokeAPIKey(principal, resource as ResourceForAction<Actions.RevokeAPIKey>)
      )
      .with(Actions.GetMembership, () =>
        getMembership(principal, resource as ResourceForAction<Actions.GetMembership>)
      )
      .with(Actions.AcceptMembership, () =>
        acceptMembership(principal, resource as ResourceForAction<Actions.AcceptMembership>)
      )
      .with(Actions.RejectMembership, () =>
        rejectMembership(principal, resource as ResourceForAction<Actions.RejectMembership>)
      )
      .with(Actions.RevokeMembership, () =>
        revokeMembership(principal, resource as ResourceForAction<Actions.RevokeMembership>)
      )
      .with(Actions.InviteMembership, () =>
        inviteMembership(principal, resource as ResourceForAction<Actions.InviteMembership>)
      )
      .with(Actions.ListRepositoryAPIKeys, () =>
        listRepositoryAPIKeys(principal, resource as ResourceForAction<Actions.ListRepositoryAPIKeys>)
      )
      .with(Actions.ListRepositoryMemberships, () =>
        listRepositoryMemberships(principal, resource as ResourceForAction<Actions.ListRepositoryMemberships>)
      )
      .with(Actions.ListAccountMemberships, () =>
        listAccountMemberships(principal, resource as ResourceForAction<Actions.ListAccountMemberships>)
      )
      .with(Actions.GetDataConnection, () =>
        getDataConnection(principal, resource as ResourceForAction<Actions.GetDataConnection>)
      )
      .with(Actions.CreateDataConnection, () =>
        createDataConnection(principal, resource as ResourceForAction<Actions.CreateDataConnection>)
      )
      .with(Actions.DisableDataConnection, () =>
        disableDataConnection(principal, resource as ResourceForAction<Actions.DisableDataConnection>)
      )
      .with(Actions.UseDataConnection, () =>
        useDataConnection(principal, resource as ResourceForAction<Actions.UseDataConnection>)
      )
      .with(Actions.ViewDataConnectionCredentials, () =>
        viewDataConnectionCredentials(principal, resource as ResourceForAction<Actions.ViewDataConnectionCredentials>)
      )
      .with(Actions.PutDataConnection, () =>
        putDataConnection(principal, resource as ResourceForAction<Actions.PutDataConnection>)
      )
      .with(Actions.DeleteDataConnection, () =>
        deleteDataConnection(principal, resource as ResourceForAction<Actions.DeleteDataConnection>)
      )
      .with(Actions.UpdateMembershipRole, () =>
        updateMembershipRole(principal, resource as ResourceForAction<Actions.UpdateMembershipRole>)
      )
      // exhaustive ensures all Actions enum values are covered
      .exhaustive()
  );
}

function getDataConnection(
  principal: UserSession | null,
  _dataConnection: DataConnection
): boolean {
  if (principal?.account?.disabled) {
    return false;
  }

  return true;
}

function createDataConnection(
  principal: UserSession | null,
  _dataConnection: DataConnection
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
  _dataConnection: DataConnection
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
  _dataConnection: DataConnection
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
  _dataConnection: DataConnection
): boolean {
  if (principal?.account?.disabled) {
    return false;
  }

  if (isAdmin(principal)) {
    return true;
  }

  return false;
}

function deleteDataConnection(
  principal: UserSession | null,
  _dataConnection: DataConnection
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
  _account: Account
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
  if (account.type !== AccountType.ORGANIZATION) {
    return false;
  }

  // If the user is an owner or maintainer of the repository, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    account.account_id
  );
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
  if (account.type !== AccountType.ORGANIZATION) {
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
  product: Product
): boolean {
  // If the repository is disabled, no one is authorized
  if (product.disabled) {
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
  if (principal?.account?.account_id === product.account_id) {
    return true;
  }

  if (isAdmin(principal)) {
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
    product.account_id,
    product.product_id
  );
}

function readRepositoryData(
  principal: UserSession | null,
  product: Product
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
  if (product.disabled) {
    return false;
  }

  // If the repository is open, everyone is authorized
  if (product.data_mode === ProductDataMode.Open) {
    return true;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === product.account_id) {
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
    product.account_id,
    product.product_id
  );
}

function getRepository(
  principal: UserSession | null,
  product: Product
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
  if (product.disabled) {
    return false;
  }

  // If the repository is open, everyone is authorized
  // TODO: Right now we are treating unset data_mode as open
  if (!product.data_mode || product.data_mode === ProductDataMode.Open) {
    return true;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === product.account_id) {
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
    product.account_id,
    product.product_id
  );
}

function listRepository(
  principal: UserSession | null,
  product: Product
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
  if (product.disabled) {
    return false;
  }

  // If the repository is listed , everyone is authorized
  if (
    // product.state === RepositoryState.Listed &&
    // product.data_mode === RepositoryDataMode.Open
    product.visibility === "public"
  ) {
    return true;
  }

  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === product.account_id) {
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
    product.account_id,
    product.product_id
  );
}

function putRepository(
  principal: UserSession | null,
  product: Product
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
  if (product.disabled) {
    return false;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === product.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the repository, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    product.account_id,
    product.product_id
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
  product: Product
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
  if (product.disabled) {
    return false;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === product.account_id) {
    return true;
  }

  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    product.account_id,
    product.product_id
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

  if (account.type === AccountType.ORGANIZATION) {
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

  if (account.type === AccountType.ORGANIZATION) {
    return hasRole(
      principal,
      [MembershipRole.Owners, MembershipRole.Maintainers],
      account.account_id
    );
  } else if (account.type === AccountType.INDIVIDUAL) {
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

  if (account.type === AccountType.ORGANIZATION) {
    return hasRole(
      principal,
      [MembershipRole.Owners, MembershipRole.Maintainers],
      account.account_id
    );
  } else if (account.type === AccountType.INDIVIDUAL) {
    if (principal?.account?.account_id === account.account_id) {
      return true;
    }
  }

  return false;
}

function createRepository(
  principal: UserSession | null,
  product: Product | "*"
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

  // If the product is not provided (ie this is a check if a user can create any product), the user is authorized
  if (product === "*") {
    return true;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === product.account_id) {
    return true;
  }

  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    product.account_id,
    product.product_id
  );
}

function createAccount(
  principal: UserSession | null,
  account: Account | "*"
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  if (account === "*") {
    return !!principal?.account?.flags.includes(
      AccountFlags.CREATE_ORGANIZATIONS
    );
  }

  // Handle user creation
  if (account.type === AccountType.INDIVIDUAL) {
    // If the user is not signed in or has already created an account, they are not authorized
    if (principal?.account || !principal?.identity_id) {
      return false;
    }

    return true;
  }

  // Handle organization creation
  if (account.type === AccountType.ORGANIZATION) {
    // If the user does not have an account, they are not authorized
    if (!principal?.account) {
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
  // NOTE: Service accounts are not supported yet
  // if (account.type === AccountType.SERVICE) {
  //   return isAdmin(principal);
  // }

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
  _account: Account
): boolean {
  // If the user is disabled, they are not authorized
  if (principal?.account?.disabled) {
    return false;
  }

  return true;
}

function listRepositoryAPIKeys(
  principal: UserSession | null,
  product: Product
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
  if (product.account_id === principal.account.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    product.account_id,
    product.product_id
  );
}

function listRepositoryMemberships(
  principal: UserSession | null,
  product: Product
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
  if (product.account_id === principal.account.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  return hasRole(
    principal,
    [MembershipRole.Owners, MembershipRole.Maintainers],
    product.account_id,
    product.product_id
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

function updateMembershipRole(
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

function inviteMembership(
  principal: UserSession | null,
  membership: Pick<Membership, "membership_account_id" | "repository_id">
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
  account_id: string,
  repository_id?: string
): boolean {
  // If the user is the owner of the account, they are authorized
  if (principal?.account?.account_id === account_id) {
    return true;
  }

  if (!principal || !principal?.memberships || !principal?.account) {
    return false;
  }

  for (const membership of principal.memberships) {
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

/**
 * Checks if the given user session belongs to an admin user.
 * @param session - The user session object.
 * @returns A boolean indicating whether the user is an admin.
 */
export function isAdmin(session?: UserSession | null): boolean {
  if (session?.account?.flags) {
    return session?.account?.flags.includes(AccountFlags.ADMIN);
  } else {
    return false;
  }
}
