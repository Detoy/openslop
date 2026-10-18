import { describe, expect, it, vi } from "vitest";
import { GenerationHolds, type GenerationHold } from "../generation-holds";

const hold = (target: GenerationHold["target"]): GenerationHold => ({
	target,
	label: "Busy…",
	reason: "Waiting",
});

describe("GenerationHolds", () => {
	it("holds an element only while its own hold is in place", () => {
		const holds = new GenerationHolds();
		const release = holds.begin(hold({ element: "a" }));

		expect(holds.holdOn("a")).toMatchObject({ reason: "Waiting" });
		expect(holds.holdOn("b")).toBeUndefined();

		release();
		expect(holds.holdOn("a")).toBeUndefined();
	});

	it("holds every element while a project hold is in place", () => {
		const holds = new GenerationHolds();
		const release = holds.begin(hold("project"));

		expect(holds.holdOn("a")).toBeDefined();
		expect(holds.holdOn("b")).toBeDefined();
		expect(holds.holdOn()).toBeDefined();

		release();
		expect(holds.holdOn("a")).toBeUndefined();
	});

	it("holds any of several elements when one of them is held", () => {
		const holds = new GenerationHolds();
		holds.begin(hold({ element: "b" }));

		expect(holds.holdOn("a", "b")).toBeDefined();
		expect(holds.holdOn("a", "c")).toBeUndefined();
	});

	it("keeps holding until every hold on the element is released", () => {
		const holds = new GenerationHolds();
		const same = hold({ element: "a" });
		const first = holds.begin(same);
		const second = holds.begin(same);

		first();
		expect(holds.holdOn("a")).toBeDefined();

		second();
		expect(holds.holdOn("a")).toBeUndefined();
	});

	it("notifies subscribers when a hold starts and when it is released", () => {
		const holds = new GenerationHolds();
		const listener = vi.fn();
		holds.subscribe(listener);

		const release = holds.begin(hold("project"));
		release();

		expect(listener).toHaveBeenCalledTimes(2);
	});
});
