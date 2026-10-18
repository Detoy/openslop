import { dedent } from "@/lib/dedent";
import { z } from "zod";
import { InsertElement } from "@/components/ui/icon";
import { modelRefSchema } from "@/lib/connectors/models";
import { plural } from "@/lib/format";
import { defineTool } from "./define-tool";
import { requireConnected } from "./require-connected";

export const setElementModel = defineTool({
	description: dedent`
	  Move elements already on the canvas onto a model from list_models, by their \`id\`. Every
	  element must be of a type that model generates. Narration and character lines speak
	  with their voice's model, so move the asset_voice instead. Nothing regenerates: the
	  elements go stale until the user generates them.
	`,
	input: modelRefSchema.extend({ ids: z.array(z.string()).min(1) }),
	output: z.string(),
	icon: InsertElement,
	label: ({ model }) => `Switching elements${model ? ` to ${model}` : ""}`,
	execute: async ({ ids, ...model }, ctx) => {
		requireConnected(model.provider, ctx);
		ctx.setElementModels(ids, model);
		return `Moved ${ids.length} ${plural(ids.length, "element")} to ${model.model} from ${model.provider}. They are stale until generated; read the script again before editing further.`;
	},
});
