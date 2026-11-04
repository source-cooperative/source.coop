import { randomUUID } from "crypto";
import { z } from "zod";
import {
  AccountType,
  Actions,
  isServiceAccount,
  Membership,
  MembershipRole,
  MembershipSchema,
  MembershipState,
  UserSession,
} from "@/types";
import { isAuthorized } from "@/lib/api/authz";
import {
  SERVICE_ACCOUNT_ROLES,
  serviceAccountGrantProblem,
} from "@/lib/accounts/service-accounts";
import { LOGGER } from "@/lib/logging";
import {
  accountsTable,
  membershipsTable,
  productsTable,
} from "@/lib/clients/database";
import {
  conflict,
  deny,
  forbidden,
  fromZodError,
  invalid,
  notFound,
  ok,
  onePage,
  OperationResult,
  Page,
  pageSchema,
  unauthenticated,
} from "./result";

/** Who to invite, and to what: an account, or one of its products. */
export const InviteMemberSchema = MembershipSchema.pick({
  membership_account_id: true,
  product_id: true,
  account_id: true,
  role: true,
}).openapi("MembershipInvitation");

// One change per request: a role change and a change of state are authorized
// for different callers (a manager, the member).
export const UpdateMembershipSchema = MembershipSchema.pick({ role: true })
  .partial()
  .extend({
    state: z
      .enum([MembershipState.Member, MembershipState.Revoked])
      .optional()
      .openapi({
        description:
          "`member` accepts a pending invitation; `revoked` ends a membership or withdraws or declines an invitation.",
      }),
  })
  .strict()
  .refine((b) => (b.role === undefined) !== (b.state === undefined), {
    message: "Send either `role` or `state`",
  })
  .openapi("UpdateMembership");

export const MembershipPageSchema = pageSchema("MembershipPage", MembershipSchema);

// Filters are the fields they match. Every list goes through one of the
// table's indexes: by member, by account, or by product. Revoked memberships
// aren't offered: GetMembership hides them from everyone but admins, the
// member included.
export const ListMembershipsQuerySchema = MembershipSchema.pick({
  account_id: true,
  membership_account_id: true,
  product_id: true,
})
  .partial()
  .extend({
    state: z.enum([MembershipState.Invited, MembershipState.Member]).optional(),
  })
  .refine((q) => q.account_id || q.membership_account_id, {
    message: "Pass `account_id`, `membership_account_id`, or both",
  })
  .refine((q) => !q.product_id || q.membership_account_id, {
    message: "`product_id` needs `membership_account_id`",
    path: ["product_id"],
  });

/** Every membership change leaves a log line saying who made it. */
function audit(operation: string, session: UserSession, m: Membership) {
  LOGGER.info("Membership changed", {
    operation,
    context: "memberships",
    metadata: {
      by: session.account?.account_id ?? session.identity_id,
      membership_id: m.membership_id,
      account_id: m.account_id,
      membership_account_id: m.membership_account_id,
      product_id: m.product_id,
      role: m.role,
      state: m.state,
    },
  });
  return m;
}

/**
 * Invites an account to an account or product. A service account becomes a
 * member at once: nobody is at its keyboard to accept an invitation.
 */
export async function inviteMember(
  session: UserSession | null,
  input: unknown
): Promise<OperationResult<Membership>> {
  if (!session) return unauthenticated();
  const parsed = InviteMemberSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { membership_account_id, product_id, account_id, role } =
    parsed.data;
  // Before any lookup, so a caller who may not invite here learns nothing
  // about which accounts and products exist.
  if (!isAuthorized(session, parsed.data, Actions.InviteMembership)) {
    return forbidden(
      role === MembershipRole.Owners
        ? "Only an owner can invite an owner"
        : "You may not invite members here"
    );
  }

  if (product_id) {
    const product = await productsTable.fetchById(
      membership_account_id,
      product_id
    );
    if (!product) {
      return notFound(
        `Product ${membership_account_id}/${product_id} not found`
      );
    }
  } else {
    const parent = await accountsTable.fetchById(membership_account_id);
    if (!parent) return notFound(`Account ${membership_account_id} not found`);
    if (isServiceAccount(parent)) {
      return invalid("Service accounts cannot have members");
    }
  }

  const member = await accountsTable.fetchById(account_id);
  if (!member) return invalid(`Account ${account_id} not found`, "account_id");
  if (member.type === AccountType.ORGANIZATION) {
    return invalid("Organizations cannot be members", "account_id");
  }
  const grantProblem = serviceAccountGrantProblem(member, parsed.data, role);
  if (grantProblem) {
    // Only a disallowed role is the role field's fault; the other problem is
    // the target, which no role would fix.
    return invalid(
      grantProblem,
      SERVICE_ACCOUNT_ROLES.includes(role) ? undefined : "role"
    );
  }

  const membership: Membership = {
    ...parsed.data,
    membership_id: randomUUID(),
    state: isServiceAccount(member)
      ? MembershipState.Member
      : MembershipState.Invited,
    state_changed: new Date().toISOString(),
  };

  const existing = await membershipsTable.listByAccount(
    membership_account_id,
    product_id
  );
  if (existing.some((m) => m.account_id === account_id && m.state !== MembershipState.Revoked)) {
    return conflict(
      `${account_id} is already a member or has a pending invitation`
    );
  }
  return ok(audit("inviteMember", session, await membershipsTable.create(membership)));
}

/**
 * The memberships the caller may see, of one member, one account or one
 * product, optionally only those in one state.
 */
export async function listMemberships(
  session: UserSession | null,
  query: unknown
): Promise<OperationResult<Page<Membership>>> {
  const parsed = ListMembershipsQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const { account_id, membership_account_id, product_id, state } = parsed.data;
  let memberships: Membership[];
  if (membership_account_id && product_id) {
    const found = await productsTable.fetchById(membership_account_id, product_id);
    if (!found) return notFound(`Product ${membership_account_id}/${product_id} not found`);
    if (!isAuthorized(session, found, Actions.ListRepositoryMemberships)) {
      return deny(session, "You may not list this product's members");
    }
    memberships = await membershipsTable.listByAccount(membership_account_id, product_id);
  } else if (membership_account_id) {
    const found = await accountsTable.fetchById(membership_account_id);
    if (!found) return notFound(`Account ${membership_account_id} not found`);
    if (!isAuthorized(session, found, Actions.ListAccountMemberships)) {
      return deny(session, "You may not list this account's members");
    }
    memberships = await membershipsTable.listByAccount(membership_account_id);
  } else {
    // Each row is checked below: anyone may see an active membership, and
    // only the member and its managers an invitation.
    memberships = await membershipsTable.listByUser(account_id!);
  }
  return ok(
    onePage(
      memberships.filter(
        (m) =>
          (!account_id || m.account_id === account_id) &&
          (!state || m.state === state) &&
          isAuthorized(session, m, Actions.GetMembership)
      )
    )
  );
}

/**
 * Applies the change `decide` answers to a membership, once the caller is
 * `allowed` to change it. `decide` sees the membership as it is and refuses
 * by answering a failure; anything it reads from the request, it reads only
 * after `allowed`, so a caller who may not act learns nothing from it.
 */
async function changeMembership(
  session: UserSession | null,
  membership_id: string,
  allowed: (m: Membership) => boolean,
  decide: (
    m: Membership
  ) => OperationResult<Partial<Membership>> | Promise<OperationResult<Partial<Membership>>>
): Promise<OperationResult<Membership>> {
  if (!session) return unauthenticated();
  // DynamoDB rejects an empty key outright.
  const membership =
    membership_id && (await membershipsTable.fetchById(membership_id));
  if (!membership) return notFound(`Membership ${membership_id} not found`);
  if (!allowed(membership)) {
    return forbidden("You may not change this membership");
  }
  const change = await decide(membership);
  if (!change.ok) return change;
  const updated = await membershipsTable.update({ ...membership, ...change.value });
  return ok(audit("changeMembership", session, updated));
}

const resolved = () => ({ state_changed: new Date().toISOString() });

const refused = () => forbidden("You may not change this membership");

const ifInvited = (m: Membership, change: Partial<Membership>) =>
  m.state === MembershipState.Invited
    ? ok(change)
    : conflict("Membership is not a pending invitation");

const accept = (m: Membership) =>
  ifInvited(m, { state: MembershipState.Member, ...resolved() });

const revoke = (m: Membership) =>
  m.state === MembershipState.Revoked
    ? conflict("Membership is already revoked")
    : ok({ state: MembershipState.Revoked, ...resolved() });

export const acceptInvitation = (
  session: UserSession | null,
  membership_id: string
) =>
  changeMembership(
    session,
    membership_id,
    (m) => isAuthorized(session, m, Actions.AcceptMembership),
    accept
  );

export const rejectInvitation = (
  session: UserSession | null,
  membership_id: string
) =>
  changeMembership(
    session,
    membership_id,
    (m) => isAuthorized(session, m, Actions.RejectMembership),
    (m) => ifInvited(m, { state: MembershipState.Revoked, ...resolved() })
  );

export const revokeMembership = (
  session: UserSession | null,
  membership_id: string
) =>
  changeMembership(
    session,
    membership_id,
    (m) => isAuthorized(session, m, Actions.RevokeMembership),
    revoke
  );

export async function updateMembership(
  session: UserSession | null,
  membership_id: string,
  input: unknown
): Promise<OperationResult<Membership>> {
  return changeMembership(
    session,
    membership_id,
    // Any change this caller could make, so a caller who may make none is
    // refused before the body is read. The change the body asks for is
    // checked once it has been parsed.
    (m) =>
      isAuthorized(session, m, Actions.UpdateMembershipRole) ||
      isAuthorized(session, m, Actions.AcceptMembership) ||
      isAuthorized(session, m, Actions.RevokeMembership),
    async (m) => {
      const parsed = UpdateMembershipSchema.safeParse(input);
      if (!parsed.success) return fromZodError(parsed.error);
      const { role, state } = parsed.data;
      if (state === MembershipState.Revoked) {
        return isAuthorized(session, m, Actions.RevokeMembership) ? revoke(m) : refused();
      }
      if (!role) {
        return isAuthorized(session, m, Actions.AcceptMembership) ? accept(m) : refused();
      }
      // The role it gets as well as the role it has, so no one without the
      // right to hold the higher of the two can grant or take it away.
      if (
        !isAuthorized(session, m, Actions.UpdateMembershipRole) ||
        !isAuthorized(session, { ...m, role }, Actions.UpdateMembershipRole)
      ) {
        return refused();
      }
      if (m.state !== MembershipState.Member) {
        return conflict("Membership is not active");
      }
      const member = await accountsTable.fetchById(m.account_id);
      const problem = member && serviceAccountGrantProblem(member, m, role);
      return problem ? invalid(problem, "role") : ok({ role });
    }
  );
}
