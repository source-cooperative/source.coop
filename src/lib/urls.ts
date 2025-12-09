import { CONFIG } from "./config";
import { headers } from "next/headers";

/**
 * Get the base URL for the application
 * Works across production, preview, and local environments
 */
export async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") || "source.coop";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  return `${protocol}://${host}`;
}

// Public URLs
export const homeUrl = () => "/";
export const accountUrl = (account_id: string, params?: string) =>
  `/${account_id}` + (params ? `?${params}` : "");
export const productUrl = (
  account_id: string,
  product_id: string,
  params?: string
) => `/${account_id}/${product_id}` + (params ? `?${params}` : "");
export const productListUrl = () => "/products";
export const newProductUrl = () => "/products/new";

// Auth URLs
export const loginUrl = () => CONFIG.auth.routes.login;
export const onboardingUrl = () => "/onboarding";

// Object URLs
export const objectUrl = (
  account_id: string,
  product_id: string,
  object_path: string
) => `/${account_id}/${product_id}/${object_path}`;

// Edit URLs
export const editAccountUrl = (account_id: string) =>
  `/edit/account/${account_id}`;
export const editAccountProfileUrl = (account_id: string) =>
  `/edit/account/${account_id}/profile`;
export const editAccountPermissionsUrl = (account_id: string) =>
  `/edit/account/${account_id}/permissions`;
export const editAccountMembershipsUrl = (account_id: string) =>
  `/edit/account/${account_id}/memberships`;
export const editAccountViewUrl = (account_id: string, view: string) =>
  `/edit/account/${account_id}/${view}`;
export const editProductUrl = (account_id: string, product_id: string) =>
  `/edit/product/${account_id}/${product_id}`;
export const editProductViewUrl = (
  account_id: string,
  product_id: string,
  view: string
) => `/edit/product/${account_id}/${product_id}/${view}`;
export const editProductDetailsUrl = (account_id: string, product_id: string) =>
  `/edit/product/${account_id}/${product_id}/details`;
export const editProductMembershipsUrl = (
  account_id: string,
  product_id: string
) => `/edit/product/${account_id}/${product_id}/memberships`;
export const editProfileUrl = (account_id: string) =>
  `/edit/profile/${account_id}`;

// Organization URLs
export const newOrganizationUrl = (account_id: string) =>
  `/${account_id}/organization/new`;

// External URLs
export const verifyEmailUrl = () =>
  // `${CONFIG.auth.api.frontendUrl}/ui/verification`;
  `${CONFIG.auth.api.frontendUrl}/self-service/verification/browser`;

export const fileSourceUrl = (
  product: { account_id: string; product_id: string },
  objectInfo: { path: string }
) =>
  `${CONFIG.storage.endpoint}/${product.account_id}/${product.product_id}/${objectInfo.path}`;
