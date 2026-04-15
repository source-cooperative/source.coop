export interface StsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
}

/**
 * Parses the XML response from an STS AssumeRoleWithWebIdentity call.
 * Uses regex extraction — STS XML is simple enough that a full parser
 * is unnecessary.
 */
export function parseAssumeRoleWithWebIdentityResponse(
  xml: string,
): StsCredentials {
  const credsBlock = xml.match(/<Credentials>([\s\S]*?)<\/Credentials>/)?.[1];
  if (!credsBlock) {
    throw new Error("STS response missing <Credentials> element");
  }

  const extract = (tag: string): string => {
    const match = credsBlock.match(
      new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`),
    );
    if (!match) {
      throw new Error(`STS response missing <${tag}> element`);
    }
    return match[1];
  };

  return {
    accessKeyId: extract("AccessKeyId"),
    secretAccessKey: extract("SecretAccessKey"),
    sessionToken: extract("SessionToken"),
    expiration: extract("Expiration"),
  };
}
