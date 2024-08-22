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
} from "@/lib/api/types";

export function isAuthorized(
  principal: UserSession,
  resource: Account | Repository,
  action: Actions
): boolean {
  if (action === Actions.CREATE_ACCOUNT) {
    return createAccount(principal, resource as Account);
  } else if (action === Actions.CREATE_REPOSITORY) {
    return createRepository(principal, resource as Repository);
  } else if (action === Actions.DISABLE_ACCOUNT) {
    return disableAccount(principal, resource as Account);
  } else if (action === Actions.DISABLE_REPOSITORY) {
    return disableRepository(principal, resource as Repository);
  } else if (action === Actions.GET_ACCOUNT_PROFILE) {
    return getAccountProfile(principal, resource as Account);
  } else if (action === Actions.PUT_REPOSITORY) {
    return putRepository(principal, resource as Repository);
  } else if (action === Actions.LIST_REPOSITORY) {
    return listRepository(principal, resource as Repository);
  } else if (action === Actions.GET_REPOSITORY) {
    return getRepository(principal, resource as Repository);
  } else if (action === Actions.READ_REPOSITORY_DATA) {
    return readRepositoryData(principal, resource as Repository);
  } else if (action === Actions.WRITE_REPOSITORY_DATA) {
    return writeRepositoryData(principal, resource as Repository);
  } else if (action === Actions.PUT_ACCOUNT_PROFILE) {
    return putAccountProfile(principal, resource as Account);
  } else if (action === Actions.GET_ACCOUNT_FLAGS) {
    return getAccountFlags(principal, resource as Account);
  } else if (action === Actions.PUT_ACCOUNT_FLAGS) {
    return putAccountFlags(principal, resource as Account);
  }

  return false;
}

function putAccountFlags(principal: UserSession, account: Account): boolean {
  // If the user is an admin, they are authorized
  if (principal?.account?.flags.includes(AccountFlags.ADMIN)) {
    return true;
  }

  // Deny all users from changing their own flags
  return false;
}

function getAccountFlags(principal: UserSession, account: Account): boolean {
  // If the user is an admin, they are authorized
  if (principal?.account?.flags.includes(AccountFlags.ADMIN)) {
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
  if (principal?.account?.flags.includes(AccountFlags.ADMIN)) {
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
  if (principal?.account?.flags.includes(AccountFlags.ADMIN)) {
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
  if (principal?.account?.flags.includes(AccountFlags.ADMIN)) {
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
  if (principal?.account?.flags.includes(AccountFlags.ADMIN)) {
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
  if (principal?.account?.flags.includes(AccountFlags.ADMIN)) {
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
  if (principal?.account?.flags?.includes(AccountFlags.ADMIN)) {
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
  if (principal?.account?.flags.includes(AccountFlags.ADMIN)) {
    return true;
  }

  return false;
}

function disableAccount(principal: UserSession, account: Account): boolean {
  // If the user is an admin, they are authorized
  if (principal?.account?.flags.includes(AccountFlags.ADMIN)) {
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
  if (principal?.account?.flags.includes(AccountFlags.ADMIN)) {
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
    // If the user is signed in or has already created an account, they are not authorized
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
    if (principal.account.flags.includes(AccountFlags.ADMIN)) {
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
