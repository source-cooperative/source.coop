import { randomUUID } from "crypto";
import { z } from "zod";
import {
  AccountType,
  Actions,
  isServiceAccount,
  Membership,
  MembershipSchema,
  MembershipState,
  MembershipStateSchema,
  UserSession,
} from "@/types";
import { isAuthorized } from "@/lib/api/authz";
import { serviceAccountGrantProblem } from "@/lib/accounts/service-accounts";
import {
  accountsTable,
  membershipsTable,
  productsTable,
} from "@/lib/clients/database";
import {
  conflict,
  forbidden,
  fromZodError,
  invalid,
  notFound,
  ok,
  OperationResult,
  unauthenticated,
} from "./result";

type Failure = Extract<OperationResult<never>, { ok: false }>;

/** Who to invite, and to what: an account, or one of its products. */
export const InviteMemberSchema = MembershipSchema.pick({
  membership_account_id: true,
  repository_id: true,
  account_id: true,
  role: true,
});

export const UpdateMembershipSchema = MembershipSchema.pick({
  role: true,
}).openapi("UpdateMembership");

export const ListMembershipsQuerySchema = z.object({
  state: MembershipStateSchema.optional(),
});

const deny = (session: UserSession | null, message: string) =>
  session ? forbidden(message) : unauthenticated();

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
  const { membership_account_id, repository_id, account_id, role } =
    parsed.data;

  if (repository_id) {
    const product = await productsTable.fetchById(
      membership_account_id,
      repository_id
    );
    if (!product) {
      return notFound(
        `Product ${membership_account_id}/${repository_id} not found`
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
  if (grantProblem) return invalid(grantProblem, "role");

  const membership: Membership = {
    ...parsed.data,
    membership_id: randomUUID(),
    state: isServiceAccount(member)
      ? MembershipState.Member
      : MembershipState.Invited,
    state_changed: new Date().toISOString(),
  };
  if (!isAuthorized(session, membership, Actions.InviteMembership)) {
    return forbidden("You may not invite members here");
  }

  const existing = await membershipsTable.listByAccount(
    membership_account_id,
    repository_id
  );
  if (existing.some((m) => m.account_id === account_id && m.state !== MembershipState.Revoked)) {
    return conflict(
      `${account_id} is already a member or has a pending invitation`
    );
  }
  return ok(await membershipsTable.create(membership));
}

/** The memberships of an account, or of one of its products. */
export async function listMembers(
  session: UserSession | null,
  scope: { account_id: string; product_id?: string }
): Promise<OperationResult<Membership[]>> {
  const { account_id, product_id } = scope;
  if (product_id) {
    const product = await productsTable.fetchById(account_id, product_id);
    if (!product) return notFound(`Product ${account_id}/${product_id} not found`);
    if (!isAuthorized(session, product, Actions.ListRepositoryMemberships)) {
      return deny(session, "You may not list this product's members");
    }
  } else {
    const account = await accountsTable.fetchById(account_id);
    if (!account) return notFound(`Account ${account_id} not found`);
    if (!isAuthorized(session, account, Actions.ListAccountMemberships)) {
      return deny(session, "You may not list this account's members");
    }
  }
  const memberships = await membershipsTable.listByAccount(account_id, product_id);
  return ok(
    memberships.filter((m) => isAuthorized(session, m, Actions.GetMembership))
  );
}

/** The caller's own memberships, optionally only those in one state. */
export async function listMemberships(
  session: UserSession | null,
  query: unknown
): Promise<OperationResult<Membership[]>> {
  if (!session) return unauthenticated();
  const parsed = ListMembershipsQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  if (!session.account) return ok([]);
  const memberships = await membershipsTable.listByUser(
    session.account.account_id
  );
  return ok(
    memberships.filter(
      (m) =>
        (!parsed.data.state || m.state === parsed.data.state) &&
        isAuthorized(session, m, Actions.GetMembership)
    )
  );
}

/**
 * Applies `change` to a membership, once the caller is `allowed` to and the
 * membership's current state doesn't `refuse` it.
 */
async function changeMembership(
  session: UserSession | null,
  membership_id: string,
  allowed: (m: Membership) => boolean,
  refuse: (m: Membership) => Failure | null | Promise<Failure | null>,
  change: Partial<Membership>
): Promise<OperationResult<Membership>> {
  if (!session) return unauthenticated();
  const membership = await membershipsTable.fetchById(membership_id);
  if (!membership) return notFound(`Membership ${membership_id} not found`);
  if (!allowed(membership)) {
    return forbidden("You may not change this membership");
  }
  const refusal = await refuse(membership);
  if (refusal) return refusal;
  return ok(await membershipsTable.update({ ...membership, ...change }));
}

const resolved = () => ({ state_changed: new Date().toISOString() });

const unlessInvited = (m: Membership) =>
  m.state === MembershipState.Invited
    ? null
    : conflict("Membership is not a pending invitation");

export const acceptInvitation = (
  session: UserSession | null,
  membership_id: string
) =>
  changeMembership(
    session,
    membership_id,
    (m) => isAuthorized(session, m, Actions.AcceptMembership),
    unlessInvited,
    { state: MembershipState.Member, ...resolved() }
  );

export const rejectInvitation = (
  session: UserSession | null,
  membership_id: string
) =>
  changeMembership(
    session,
    membership_id,
    (m) => isAuthorized(session, m, Actions.RejectMembership),
    unlessInvited,
    { state: MembershipState.Revoked, ...resolved() }
  );

export const revokeMembership = (
  session: UserSession | null,
  membership_id: string
) =>
  changeMembership(
    session,
    membership_id,
    (m) => isAuthorized(session, m, Actions.RevokeMembership),
    (m) =>
      m.state === MembershipState.Revoked
        ? conflict("Membership is already revoked")
        : null,
    { state: MembershipState.Revoked, ...resolved() }
  );

export async function updateMembership(
  session: UserSession | null,
  membership_id: string,
  input: unknown
): Promise<OperationResult<Membership>> {
  if (!session) return unauthenticated();
  const parsed = UpdateMembershipSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { role } = parsed.data;
  return changeMembership(
    session,
    membership_id,
    (m) => isAuthorized(session, m, Actions.UpdateMembershipRole),
    async (m) => {
      if (m.state !== MembershipState.Member) {
        return conflict("Membership is not active");
      }
      const member = await accountsTable.fetchById(m.account_id);
      const problem = member && serviceAccountGrantProblem(member, m, role);
      return problem ? invalid(problem, "role") : null;
    },
    { role }
  );
}
