import {
  Account,
  Repository,
  Actions,
  UserSession,
  AccountFlags,
  RepositoryMode,
  AccountType,
  MembershipState,
  MembershipRole,
  RepositoryDataMode,
  APIKey,
  Membership,
} from "@/lib/api/types";
import logger from "@/utils/logger";
import { isAdmin } from "../utils";

export function isAuthorized(
  principal: UserSession,
  resource: Account | Repository | APIKey | Membership,
  action: Actions
): boolean {
  let result: boolean;

  if (action === Actions.CREATE_ACCOUNT) {
    result = createAccount(principal, resource as Account);
  } else if (action === Actions.CREATE_REPOSITORY) {
    result = createRepository(principal, resource as Repository);
  } else if (action === Actions.DISABLE_ACCOUNT) {
    result = disableAccount(principal, resource as Account);
  } else if (action === Actions.DISABLE_REPOSITORY) {
    result = disableRepository(principal, resource as Repository);
  } else if (action === Actions.GET_ACCOUNT_PROFILE) {
    result = getAccountProfile(principal, resource as Account);
  } else if (action === Actions.PUT_REPOSITORY) {
    result = putRepository(principal, resource as Repository);
  } else if (action === Actions.LIST_REPOSITORY) {
    result = listRepository(principal, resource as Repository);
  } else if (action === Actions.GET_REPOSITORY) {
    result = getRepository(principal, resource as Repository);
  } else if (action === Actions.READ_REPOSITORY_DATA) {
    result = readRepositoryData(principal, resource as Repository);
  } else if (action === Actions.WRITE_REPOSITORY_DATA) {
    result = writeRepositoryData(principal, resource as Repository);
  } else if (action === Actions.PUT_ACCOUNT_PROFILE) {
    result = putAccountProfile(principal, resource as Account);
  } else if (action === Actions.GET_ACCOUNT_FLAGS) {
    result = getAccountFlags(principal, resource as Account);
  } else if (action === Actions.PUT_ACCOUNT_FLAGS) {
    result = putAccountFlags(principal, resource as Account);
  } else if (action === Actions.LIST_ACCOUNT_API_KEYS) {
    result = listAccountAPIKeys(principal, resource as Account);
  } else if (action === Actions.GET_API_KEY) {
    result = getAPIKey(principal, resource as APIKey);
  } else if (action === Actions.CREATE_API_KEY) {
    result = createAPIKey(principal, resource as APIKey);
  } else if (action === Actions.REVOKE_API_KEY) {
    result = revokeAPIKey(principal, resource as APIKey);
  } else if (action === Actions.GET_MEMBERSHIP) {
    result = getMembership(principal, resource as Membership);
  } else if (action === Actions.ACCEPT_MEMBERSHIP) {
    result = acceptMembership(principal, resource as Membership);
  } else if (action === Actions.REJECT_MEMBERSHIP) {
    result = rejectMembership(principal, resource as Membership);
  } else if (action === Actions.REVOKE_MEMBERSHIP) {
    result = revokeMembership(principal, resource as Membership);
  } else if (action === Actions.INVITE_MEMBERSHIP) {
    result = inviteMembership(principal, resource as Membership);
  } else {
    result = false;
  }

  const principial_id = principal
    ? principal.account
      ? principal.account.account_id
      : principal.identity_id
    : "ANONYMOUS";

  const authorized = result ? "AUTHORIZED" : "UNAUTHORIZED";

  logger.debug(
    `Checked authorization for principal "${principial_id}" with action "${action}"; Result: ${authorized}`
  );

  return result;
}

function putAccountFlags(principal: UserSession, account: Account): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // Deny all users from changing their own flags
  return false;
}

function getAccountFlags(principal: UserSession, account: Account): boolean {
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

  // If the user is a member of the repository, they are authorized
  if (
    principal?.memberships?.find((membership) => {
      if (membership.state === MembershipState.MEMBER) {
        if (membership.membership_account_id === account.account_id) {
          return true;
        }
      }
    })
  ) {
    return true;
  }

  return false;
}

function putAccountProfile(principal: UserSession, account: Account): boolean {
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
  if (
    principal?.memberships?.find((membership) => {
      if (
        membership.state === MembershipState.MEMBER &&
        !membership.repository_id
      ) {
        if (
          membership.role === MembershipRole.OWNERS ||
          membership.role === MembershipRole.MAINTAINERS
        ) {
          if (membership.membership_account_id === account.account_id) {
            return true;
          }
        }
      }
    })
  ) {
    return true;
  }

  return false;
}

function writeRepositoryData(
  principal: UserSession,
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

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === repository.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the repository, they are authorized
  if (
    principal?.memberships?.find((membership) => {
      if (membership.state === MembershipState.MEMBER) {
        if (
          membership.role === MembershipRole.OWNERS ||
          membership.role === MembershipRole.MAINTAINERS ||
          membership.role === MembershipRole.WRITE_DATA
        ) {
          if (membership.membership_account_id === repository.account_id) {
            if (
              !membership.repository_id ||
              membership.repository_id === repository.repository_id
            ) {
              return true;
            }
          }
        }
      }
    })
  ) {
    return true;
  }

  return false;
}

function readRepositoryData(
  principal: UserSession,
  repository: Repository
): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the repository is disabled, they are not authorized
  if (repository.disabled) {
    return false;
  }

  // If the repository is open, everyone is authorized
  if (repository.data_mode === RepositoryDataMode.OPEN) {
    return true;
  }

  // If the repository is under the user's account, they are authorized
  if (principal?.account?.account_id === repository.account_id) {
    return true;
  }

  // If the user is a member of the repository, they are authorized
  if (
    principal?.memberships?.find((membership) => {
      if (membership.state === MembershipState.MEMBER) {
        if (membership.membership_account_id === repository.account_id) {
          if (
            !membership.repository_id ||
            membership.repository_id === repository.repository_id
          ) {
            return true;
          }
        }
      }
    })
  ) {
    return true;
  }

  return false;
}

function getRepository(
  principal: UserSession,
  repository: Repository
): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the repository is disabled, they are not authorized
  if (repository.disabled) {
    return false;
  }

  return true;
}

function listRepository(
  principal: UserSession,
  repository: Repository
): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the repository is disabled, they are not authorized
  if (repository.disabled) {
    return false;
  }

  // If the repository is listed , everyone is authorized
  if (repository.mode === RepositoryMode.LISTED) {
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
  if (
    principal?.memberships?.find((membership) => {
      if (membership.state === MembershipState.MEMBER) {
        if (membership.membership_account_id === repository.account_id) {
          if (
            !membership.repository_id ||
            membership.repository_id === repository.repository_id
          ) {
            return true;
          }
        }
      }
    })
  ) {
    return true;
  }

  return false;
}

function putRepository(
  principal: UserSession,
  repository: Repository
): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
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
  if (
    principal?.memberships?.find((membership) => {
      if (membership.state === MembershipState.MEMBER) {
        if (
          membership.role === MembershipRole.OWNERS ||
          membership.role === MembershipRole.MAINTAINERS
        ) {
          if (membership.membership_account_id === repository.account_id) {
            if (
              !membership.repository_id ||
              membership.repository_id === repository.repository_id
            ) {
              return true;
            }
          }
        }
      }
    })
  ) {
    return true;
  }

  return false;
}

function getAccountProfile(principal: UserSession, account: Account): boolean {
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
  principal: UserSession,
  repository: Repository
): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  return false;
}

function disableAccount(principal: UserSession, account: Account): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  return false;
}

function createRepository(
  principal: UserSession,
  repository: Repository
): boolean {
  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user has the create repositories flag, they are authorized
  if (principal?.account?.flags.includes(AccountFlags.CREATE_REPOSITORIES)) {
    return true;
  }

  return false;
}

function createAccount(principal: UserSession, account: Account): boolean {
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

  return false;
}

function createAPIKey(principal: UserSession, api_key: APIKey): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is the owner of the API key, they are authorized
  if (api_key.account_id === principal.account.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  if (
    hasRole(
      principal,
      [MembershipRole.OWNERS, MembershipRole.MAINTAINERS],
      api_key.account_id
    )
  ) {
    return true;
  }

  return false;
}

function listAccountAPIKeys(principal: UserSession, account: Account): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is the owner of the API key, they are authorized
  if (account.account_id === principal.account.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  if (
    hasRole(
      principal,
      [MembershipRole.OWNERS, MembershipRole.MAINTAINERS],
      account.account_id
    )
  ) {
    return true;
  }

  return false;
}

function revokeAPIKey(principal: UserSession, api_key: APIKey): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is the owner of the API key, they are authorized
  if (api_key.account_id === principal.account.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  if (
    hasRole(
      principal,
      [MembershipRole.OWNERS, MembershipRole.MAINTAINERS],
      api_key.account_id
    )
  ) {
    return true;
  }

  return false;
}

function getAPIKey(principal: UserSession, api_key: APIKey): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user does not have an account, they are not authorized
  if (!principal?.account) {
    return false;
  }

  // If the user is the owner of the API key, they are authorized
  if (api_key.account_id === principal?.account?.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization, they are authorized
  if (
    hasRole(
      principal,
      [MembershipRole.OWNERS, MembershipRole.MAINTAINERS],
      api_key.account_id
    )
  ) {
    return true;
  }

  return false;
}

function getMembership(
  principal: UserSession,
  membership: Membership
): boolean {
  // If the membership is active, the user is authorized
  if (membership.state === MembershipState.MEMBER) {
    return true;
  }

  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  if (membership.state === MembershipState.REVOKED) {
    return false;
  }

  // If the membership pertains to the principal's account, they are authorized
  if (principal?.account?.account_id === membership.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization or repository, they are authorized
  if (
    hasRole(
      principal,
      [MembershipRole.OWNERS, MembershipRole.MAINTAINERS],
      membership.membership_account_id,
      membership.repository_id
    )
  ) {
    return true;
  }

  return false;
}

function acceptMembership(
  principal: UserSession,
  membership: Membership
): boolean {
  // If the membership pertains to the principal's account, they are authorized
  if (principal?.account?.account_id === membership.account_id) {
    return true;
  }

  return false;
}

function rejectMembership(
  principal: UserSession,
  membership: Membership
): boolean {
  // If the membership pertains to the principal's account, they are authorized
  if (principal?.account?.account_id === membership.account_id) {
    return true;
  }

  return false;
}

function revokeMembership(
  principal: UserSession,
  membership: Membership
): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the membership pertains to the principal's account, they are authorized
  if (principal?.account?.account_id === membership.account_id) {
    return true;
  }

  // If the user is an owner or maintainer of the organization or repository, they are authorized
  if (
    hasRole(
      principal,
      [MembershipRole.OWNERS, MembershipRole.MAINTAINERS],
      membership.membership_account_id,
      membership.repository_id
    )
  ) {
    return true;
  }

  return false;
}

function inviteMembership(
  principal: UserSession,
  membership: Membership
): boolean {
  // If the user is an admin, they are authorized
  if (isAdmin(principal)) {
    return true;
  }

  // If the user is an owner or maintainer of the organization or repository, they are authorized
  if (
    hasRole(
      principal,
      [MembershipRole.OWNERS, MembershipRole.MAINTAINERS],
      membership.membership_account_id,
      membership.repository_id
    )
  ) {
    return true;
  }

  return false;
}

function hasRole(
  principal: UserSession,
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
    if (membership.state !== MembershipState.MEMBER) {
      continue;
    }

    if (membership.account_id !== account_id) {
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
