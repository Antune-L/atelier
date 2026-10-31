import { z } from "zod";

export const BOARD_NAME_MAX_LENGTH = 40;
const OTHER_BOARD_URL_MAX_LENGTH = 2_048;
const HTTPS_PROTOCOL = "https:";
const DNS_HOSTNAME_PATTERN = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
// NOTE: the leading alphanumeric character keeps `ssh` from reading the alias as an option.
export const SSH_HOST_ALIAS_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,253}$/;

export const dnsHostnameSchema = z.string().trim().transform((value) => value.toLowerCase()).pipe(z.string().regex(DNS_HOSTNAME_PATTERN));

export const boardNameSchema = z.string().trim().min(1).max(BOARD_NAME_MAX_LENGTH);

export const sshHostAliasSchema = z.string().trim().regex(SSH_HOST_ALIAS_PATTERN);

function parseHttpsUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== HTTPS_PROTOCOL || url.username !== "" || url.password !== "") return null;
  return url;
}

export const otherBoardUrlSchema = z.string().trim().max(OTHER_BOARD_URL_MAX_LENGTH).transform((value, context) => {
  const url = parseHttpsUrl(value);
  if (url === null) {
    context.addIssue({ code: "custom", message: "An HTTPS URL without embedded credentials is required." });
    return z.NEVER;
  }
  return url.href;
});

export function safeOtherBoardUrl(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const parsed = otherBoardUrlSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
