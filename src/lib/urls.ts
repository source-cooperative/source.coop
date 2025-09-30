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

// Auth URLs
export const loginUrl = () => CONFIG.auth.routes.login;
export const onboardingUrl = (params?: string) =>
  `/onboarding` + (params ? `?${params}` : "");

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
  // `/edit/account/${account_id}/profile`;
  `/${account_id}/edit`; // TODO: Update to conform with admin menu
export const editAccountSecurityUrl = (account_id: string) =>
  `/edit/account/${account_id}/security`;
export const editAccountMembershipsUrl = (account_id: string) =>
  `/edit/account/${account_id}/memberships`;
export const editAccountViewUrl = (account_id: string, view: string) =>
  `/edit/account/${account_id}/${view}`;
export const editProductUrl = (account_id: string, product_id: string) =>
  `/edit/product/${account_id}/${product_id}`;
export const editProductDetailsUrl = (account_id: string, product_id: string) =>
  `/edit/product/${account_id}/${product_id}/details`;
export const editProductAccessUrl = (account_id: string, product_id: string) =>
  `/edit/product/${account_id}/${product_id}/access`;
export const editProductVisibilityUrl = (
  account_id: string,
  product_id: string
) => `/edit/product/${account_id}/${product_id}/visibility`;
export const editProductArchiveUrl = (account_id: string, product_id: string) =>
  `/edit/product/${account_id}/${product_id}/archive`;
export const editProfileUrl = (account_id: string) =>
  `/edit/profile/${account_id}`;

// Organization URLs
export const newOrganizationUrl = (account_id: string) =>
  `/${account_id}/organization/new`;
