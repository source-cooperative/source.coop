/** @jest-environment node */
import { trustPolicy } from "./trust-policy";

describe("trustPolicy", () => {
  test("pins the role's account and the connection's exact subject", () => {
    const policy = JSON.parse(
      trustPolicy(
        "https://data.source.coop",
        "arn:aws:iam::123456789012:role/source",
        "acme--bucket"
      )
    );
    expect(policy.Statement[0]).toEqual({
      Effect: "Allow",
      Principal: {
        Federated:
          "arn:aws:iam::123456789012:oidc-provider/data.source.coop",
      },
      Action: "sts:AssumeRoleWithWebIdentity",
      Condition: {
        StringEquals: {
          "data.source.coop:aud": "sts.amazonaws.com",
          "data.source.coop:sub": "scv1:conn:acme--bucket",
        },
      },
    });
  });

  test("names the issuer it's given and the role's partition", () => {
    const policy = trustPolicy(
      "https://data.staging.source.coop/",
      "arn:aws-us-gov:iam::123456789012:role/source",
      "acme--bucket"
    );
    expect(policy).toContain(
      '"arn:aws-us-gov:iam::123456789012:oidc-provider/data.staging.source.coop"'
    );
    expect(policy).toContain('"data.staging.source.coop:sub"');
  });

  test("leaves placeholders until the ARN and id exist", () => {
    const policy = trustPolicy("https://data.source.coop", "arn:aws:iam::", "");
    expect(policy).toContain("arn:aws:iam::<ACCOUNT_ID>:oidc-provider");
    expect(policy).toContain('"scv1:conn:<CONNECTION_ID>"');
  });
});
