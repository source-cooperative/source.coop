import { parseAssumeRoleWithWebIdentityResponse } from "./sts-response";

const VALID_XML = `<?xml version="1.0" encoding="UTF-8"?>
<AssumeRoleWithWebIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
  <AssumeRoleWithWebIdentityResult>
    <Credentials>
      <AccessKeyId>AKIAEXAMPLE</AccessKeyId>
      <SecretAccessKey>secret/+key</SecretAccessKey>
      <SessionToken>sess+tok/en</SessionToken>
      <Expiration>2026-04-10T12:00:00Z</Expiration>
    </Credentials>
  </AssumeRoleWithWebIdentityResult>
</AssumeRoleWithWebIdentityResponse>`;

describe("parseAssumeRoleWithWebIdentityResponse", () => {
  test("extracts credentials from valid STS response", () => {
    const creds = parseAssumeRoleWithWebIdentityResponse(VALID_XML);
    expect(creds).toEqual({
      accessKeyId: "AKIAEXAMPLE",
      secretAccessKey: "secret/+key",
      sessionToken: "sess+tok/en",
      expiration: "2026-04-10T12:00:00Z",
    });
  });

  test("throws when Credentials element is missing", () => {
    const xml = `<AssumeRoleWithWebIdentityResponse><AssumeRoleWithWebIdentityResult></AssumeRoleWithWebIdentityResult></AssumeRoleWithWebIdentityResponse>`;
    expect(() => parseAssumeRoleWithWebIdentityResponse(xml)).toThrow(
      /Credentials/,
    );
  });

  test("throws when a required field is missing", () => {
    const xml = `<AssumeRoleWithWebIdentityResponse>
      <AssumeRoleWithWebIdentityResult>
        <Credentials>
          <AccessKeyId>AKIAEXAMPLE</AccessKeyId>
          <SecretAccessKey>s</SecretAccessKey>
          <Expiration>2026-04-10T12:00:00Z</Expiration>
        </Credentials>
      </AssumeRoleWithWebIdentityResult>
    </AssumeRoleWithWebIdentityResponse>`;
    expect(() => parseAssumeRoleWithWebIdentityResponse(xml)).toThrow(
      /SessionToken/,
    );
  });
});
