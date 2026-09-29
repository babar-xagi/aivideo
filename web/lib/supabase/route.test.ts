import { expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { isSameOrigin } from "./route";

function authRequest(headers: Record<string, string>) {
  const request = new NextRequest("http://localhost:3000/auth/sign-in/submit", {
    method: "POST",
  });
  request.headers.set("host", "localhost:3000");
  for (const [name, value] of Object.entries(headers)) {
    request.headers.set(name, value);
  }
  return request;
}

test("accepts a matching Origin", () => {
  expect(isSameOrigin(authRequest({ origin: "http://localhost:3000" }))).toBe(true);
});

test("accepts a browser same-origin request without Origin", () => {
  expect(isSameOrigin(authRequest({ "sec-fetch-site": "same-origin" }))).toBe(true);
  expect(isSameOrigin(authRequest({ origin: "null", "sec-fetch-site": "same-origin" }))).toBe(true);
});

test("rejects cross-site and unverifiable origins", () => {
  expect(isSameOrigin(authRequest({ "sec-fetch-site": "cross-site" }))).toBe(false);
  expect(isSameOrigin(authRequest({}))).toBe(false);
  expect(isSameOrigin(authRequest({ origin: "null", "sec-fetch-site": "cross-site" }))).toBe(false);
  expect(isSameOrigin(authRequest({ origin: "https://evil.example", "sec-fetch-site": "same-origin" }))).toBe(false);
});
