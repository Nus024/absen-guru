import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src";

describe("Status endpoint worker", () => {
	it("responds with botReady status (unit style)", async () => {
		const request = new Request("http://example.com/api/status");
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		const data = await response.json();
		expect(data).toHaveProperty("botReady");
		expect(data).toHaveProperty("autoRekapActive");
		expect(data).toHaveProperty("queue");
	});

	it("responds with botReady status (integration style)", async () => {
		const response = await SELF.fetch("http://example.com/api/status");
		const data = await response.json();
		expect(data).toHaveProperty("botReady");
		expect(data).toHaveProperty("autoRekapActive");
		expect(data).toHaveProperty("queue");
	});
});
