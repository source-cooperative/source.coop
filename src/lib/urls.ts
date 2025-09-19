// Public URLs
export const accountUrl = (account_id: string) => `/${account_id}`;
export const productUrl = (account_id: string, product_id: string) =>
  `/${account_id}/${product_id}`;

// Edit URLs
export const editAccountUrl = (account_id: string) =>
  `/edit/account/${account_id}`;
export const editProductUrl = (account_id: string, product_id: string) =>
  `/edit/product/${account_id}/${product_id}`;
export const editProfileUrl = (account_id: string) =>
  `/edit/profile/${account_id}`;
