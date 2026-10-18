import { createEmitter } from "@/lib/store/emitter";

export type HoldTarget = { element: string } | "project";

export type GenerationHold = {
	target: HoldTarget;
	label: string;
	reason: string;
};

const covers = ({ target }: GenerationHold, elementIds: string[]) =>
	target === "project" || elementIds.includes(target.element);

/** Work in flight that generate controls wait for, without knowing what it is. */
export class GenerationHolds {
	private readonly holds = new Set<GenerationHold>();
	private readonly emitter = createEmitter();
	readonly subscribe = this.emitter.subscribe;

	begin(hold: GenerationHold): () => void {
		const entry = { ...hold };
		this.holds.add(entry);
		this.emitter.notify();
		return () => {
			this.holds.delete(entry);
			this.emitter.notify();
		};
	}

	holdOn(...elementIds: string[]): GenerationHold | undefined {
		for (const hold of this.holds) if (covers(hold, elementIds)) return hold;
		return undefined;
	}
}
