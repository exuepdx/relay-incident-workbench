import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedOrigin, mintSession, validAccessCode, validSession } from "../lib/access";

test("origin checks use the Host the browser requested", () => {
  assert.equal(
    allowedOrigin(
      new Request("http://localhost:3000/api/session", {
        headers: { Host: "127.0.0.1:3000", Origin: "http://127.0.0.1:3000" },
      }),
    ),
    true,
  );
  assert.equal(
    allowedOrigin(
      new Request("https://relay.example/api/session", {
        headers: { Host: "relay.example", Origin: "https://evil.example" },
      }),
    ),
    false,
  );
  assert.equal(
    allowedOrigin(
      new Request("https://relay.example/api/session", {
        headers: { Host: "relay.example", Origin: "https://relay.example", "sec-fetch-site": "cross-site" },
      }),
    ),
    false,
  );
});

test("a reviewer session expires and cannot be extended by editing the timestamp", () => {
  const token = mintSession(1000);
  assert.equal(validSession(token, 1001), true);
  assert.equal(validSession(token, 1000 + 25 * 3600 * 1000), false);
  assert.equal(validSession(`9999999999999.${token.split(".")[1]}`, 1001), false);
  assert.equal(validSession("malformed", 1001), false);
  assert.equal(validSession(undefined, 1001), false);
});

test("the access code is compared in constant time and never matches when unset", () => {
  delete process.env.DEMO_ACCESS_CODE;
  assert.equal(validAccessCode("anything"), false);
  process.env.DEMO_ACCESS_CODE = "open-sesame";
  assert.equal(validAccessCode("open-sesame"), true);
  assert.equal(validAccessCode("open-sesam"), false);
  assert.equal(validAccessCode(42), false);
});
