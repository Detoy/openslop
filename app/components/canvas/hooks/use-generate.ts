import { useCallback } from "react";
import type { AssetResult } from "@/lib/connectors/types";
import {
	useGenerationQueue,
	useQueueSelector,
} from "@/lib/generation/generation-queue-provider";
import { hasPrompt } from "@/lib/generation/graph";
import { buildNode } from "@/lib/generation/generation-graph";
import { useBuildContext } from "@/lib/generation/use-build-context";
import { useLiveNodeFacts } from "@/lib/generation/use-live-node-facts";
import type { GeneratedElement } from "@/lib/canvas/types";

export function useGenerate(element: GeneratedElement) {
	const queue = useGenerationQueue();
	const buildContext = useBuildContext();
	const facts = useLiveNodeFacts(element);
	const snapshot = useQueueSelector((q) => q.getElementSnapshot(element.id));

	// Built again at the click: the live graph keeps a node whose job alone changed, see isUnchanged.
	const generate = useCallback(() => {
		const current = buildNode(element, buildContext());
		if (!hasPrompt(current)) {
			queue.setError(current.id, "Enter a prompt first");
			return;
		}
		queue.enqueueGraph([current]);
	}, [queue, element, buildContext]);

	const commitUpload = useCallback(
		(result: AssetResult) =>
			queue.commitResult(buildNode(element, buildContext()), result, {
				pinned: true,
			}),
		[queue, element, buildContext],
	);

	const discard = useCallback(() => {
		queue.discard(element.id);
	}, [queue, element.id]);

	return {
		...facts,
		status: snapshot.status,
		startedAt: snapshot.startedAt,
		result: snapshot.result,
		error: snapshot.error,
		pinned: snapshot.pinned,
		hasResult: Boolean(snapshot.result),
		generate,
		commitUpload,
		discard,
	};
}
