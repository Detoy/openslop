import type { Editor } from "slate";
import { ELEMENT_MODEL } from "@/lib/connectors/attributes/model";
import { modelEntry } from "@/lib/connectors/models";
import type { AssetConnectorType, ModelRef } from "@/lib/connectors/types";
import { mergeAttrs, findElementById } from "./editor-ops";
import { attributeSchemaFor } from "./element-connector";
import { connectorOf, type ElementType } from "./types";

/** The connector an element of this type picks its own model from, unless its model is chosen for it. */
const pickedModelType = (type: ElementType): AssetConnectorType | undefined =>
	attributeSchemaFor(type, {}).hidesModel ? undefined : connectorOf(type);

/** Moves every element onto `model`, or none when any of them cannot take it. */
export function setElementModels(
	editor: Editor,
	ids: readonly string[],
	model: ModelRef,
): void {
	for (const id of ids) {
		const element = findElementById(editor, id)?.[0];
		if (!element) throw new Error(`Element "${id}" is not on the canvas`);
		const type = pickedModelType(element.type);
		if (!type)
			throw new Error(`A ${element.type} element does not pick its own model`);
		modelEntry(type, model);
	}
	for (const id of ids)
		mergeAttrs(editor, id, {
			[ELEMENT_MODEL.providerAttr]: model.provider,
			[ELEMENT_MODEL.key]: model.model,
		});
}
