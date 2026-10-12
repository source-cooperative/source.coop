import {
  addProductMirror,
  removeProductMirror,
  setPrimaryMirror,
  updateMirrorPrefix,
} from "./product-mirrors";
import { getPageSession } from "../api/utils";
import * as ops from "@/lib/operations/mirrors";

jest.mock("../api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/operations/mirrors", () => ({
  addMirror: jest.fn(),
  removeMirror: jest.fn(),
  updateMirror: jest.fn(),
}));

const SESSION = { identity_id: "user-1" };
const STATE = { message: "", data: new FormData(), fieldErrors: {}, success: false };

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};
const IDS = { account_id: "acct", product_id: "prod" };

beforeEach(() => {
  jest.resetAllMocks();
  (getPageSession as jest.Mock).mockResolvedValue(SESSION);
  for (const op of [ops.addMirror, ops.removeMirror, ops.updateMirror]) {
    (op as jest.Mock).mockResolvedValue({ ok: true, value: {} });
  }
});

test("addProductMirror passes the connection", async () => {
  const result = await addProductMirror(STATE, form({ ...IDS, connection_id: "c" }));
  expect(ops.addMirror).toHaveBeenCalledWith(SESSION, "acct", "prod", { connection_id: "c" });
  expect(result).toMatchObject({ success: true, message: "Data connection added successfully!" });
});

test("removeProductMirror passes the mirror key", async () => {
  await removeProductMirror(STATE, form({ ...IDS, mirror_key: "a" }));
  expect(ops.removeMirror).toHaveBeenCalledWith(SESSION, "acct", "prod", "a");
});

test("updateMirrorPrefix sends an absent prefix as the connection root", async () => {
  await updateMirrorPrefix(STATE, form({ ...IDS, mirror_key: "a" }));
  expect(ops.updateMirror).toHaveBeenCalledWith(SESSION, "acct", "prod", "a", { prefix: "" });
});

test("setPrimaryMirror promotes the mirror", async () => {
  await setPrimaryMirror(STATE, form({ ...IDS, mirror_key: "a" }));
  expect(ops.updateMirror).toHaveBeenCalledWith(SESSION, "acct", "prod", "a", {
    is_primary: true,
  });
});

test("a refusal becomes the form's message", async () => {
  (ops.removeMirror as jest.Mock).mockResolvedValue({
    ok: false,
    error: "conflict",
    message: "This product was modified by someone else.",
  });
  expect(await removeProductMirror(STATE, form({ ...IDS, mirror_key: "a" }))).toMatchObject({
    success: false,
    message: "This product was modified by someone else.",
  });
});
