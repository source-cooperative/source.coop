import { renderHook, waitFor } from "@testing-library/react";
import { useProductIdValidation } from "./useIdValidation";

const answer = (status: number) => {
  global.fetch = jest.fn(async () => new Response(null, { status })) as jest.Mock;
};

const check = async () => {
  const { result } = renderHook(() => useProductIdValidation("abyssal-acoustics", "acoltrane"));
  await waitFor(() => expect(result.current.isValid).not.toBeNull(), { timeout: 2000 });
  return result.current;
};

describe("useProductIdValidation", () => {
  it("frees an ID only on a 404", async () => {
    answer(404);
    expect(await check()).toMatchObject({ isValid: true, error: null });
    expect(fetch).toHaveBeenCalledWith("/api/v1/products/acoltrane/abyssal-acoustics", {
      method: "HEAD",
    });
  });

  it.each([200, 401, 403])("calls an ID taken on a %i", async (status) => {
    answer(status);
    expect(await check()).toMatchObject({
      isValid: false,
      error: "Product ID is not available",
    });
  });

  it("reports a failed check rather than guessing", async () => {
    answer(500);
    expect(await check()).toMatchObject({
      isValid: false,
      error: "Failed to check product ID availability",
    });
  });
});
