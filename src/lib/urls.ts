import { CONFIG } from "./config";

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

// Admin URLs
export const adminUrl = () => "/admin";
export const adminUserLookupUrl = () => "/admin/user-lookup";
export const adminDataConnectionsUrl = () => "/admin/data-connections";
export const adminDataConnectionCreateUrl = () =>
  "/admin/data-connections/create";
export const adminDataConnectionEditUrl = (data_connection_id: string) =>
  `/admin/data-connections/${data_connection_id}`;

// Auth URLs
export const loginUrl = (returnTo?: string) => {
  const base = CONFIG.auth.routes.login;
  if (!returnTo) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}return_to=${encodeURIComponent(returnTo)}`;
};
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
export const editAccountProfilePictureUrl = (account_id: string) =>
  `/edit/account/${account_id}/profile-picture`;
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
export const editProductDataConnectionsUrl = (
  account_id: string,
  product_id: string
) => `/edit/product/${account_id}/${product_id}/data-connections`;
export const editProfileUrl = (account_id: string) =>
  `/edit/profile/${account_id}`;

// Organization URLs
export const newOrganizationUrl = (account_id: string) =>
  `/${account_id}/organization/new`;

// External URLs
export const verifyEmailUrl = () =>
  // `${CONFIG.auth.api.frontendUrl}/ui/verification`;
  `${CONFIG.auth.api.frontendUrl}/self-service/verification/browser`;

export const orySettingsUrl = () =>
  `${CONFIG.auth.api.frontendUrl}/self-service/settings/browser`;

export const fileSourceUrl = ({ account_id, product_id, object_path }: {
  account_id: string
  product_id: string
  object_path: string
}) =>
  `${CONFIG.storage.endpoint}/${account_id}/${product_id}/${object_path}`;
