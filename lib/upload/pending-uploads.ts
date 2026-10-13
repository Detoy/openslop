import { createEmitter } from "@/lib/store/emitter";

/** What an upload becomes once it lands: one element's picture or attribute, or the project's references, which every element inherits. */
export type UploadTarget = { element: string } | "project";

const feeds = (target: UploadTarget, elementId: string) =>
	target === "project" || target.element === elementId;

/** Uploads still in flight, so a generate control can wait for the input it is about to miss. */
export class PendingUploads {
	private readonly inFlight = new Set<{ target: UploadTarget }>();
	private readonly emitter = createEmitter();
	readonly subscribe = this.emitter.subscribe;

	/** Counts an upload for `target` until the returned release is called. */
	begin(target: UploadTarget): () => void {
		const upload = { target };
		this.inFlight.add(upload);
		this.emitter.notify();
		return () => {
			this.inFlight.delete(upload);
			this.emitter.notify();
		};
	}

	/** Whether generating `elementId` now would miss an upload still in flight. */
	blocks(elementId: string): boolean {
		for (const { target } of this.inFlight)
			if (feeds(target, elementId)) return true;
		return false;
	}
}
