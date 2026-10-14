import { test } from "node:test";
import assert from "node:assert/strict";
import { gatewayOptions } from "../lib/gateway";
import { config } from "../lib/config";

test("gateway routing carries fallbacks, and the outage drill pins the primary to a provider that cannot serve it", () => {
  const normal = gatewayOptions("none");
  assert.deepEqual(normal.gateway.models, config.fallbackModels);
  assert.equal(normal.gateway.only, undefined);
  const drill = gatewayOptions("provider-outage");
  assert.deepEqual(drill.gateway.only, [config.outageDrillProviderOnly]);
  assert.deepEqual(drill.gateway.models, config.fallbackModels);
});

