import minBy from "lodash/minBy";
import type { ImageGenerateParams, ModelEntry } from "@/lib/connectors/types";
import type { BundleFile } from "@/lib/api/asset-bundle";
import {
	DEFAULT_IMAGE_FORMAT,
	IMAGE_MIME_TYPES,
	type ImageFormat,
} from "@/lib/connectors/image/enums";
import { RUNWARE_IMAGE_MODELS } from "@/lib/connectors/image/runware/models";
import { BaseProvider, type RawResult } from "../base";
import { renderCharacterRefs } from "@/lib/connectors/character-refs";
import { characterAvatars } from "@/lib/connectors/characters";
import { validateRunwareKey, withRunware } from "../runware";
import type { VendorParams } from "@/lib/connectors/models";
import type { Dimensions } from "@/lib/project/aspect-ratio";
import type { ImageProvider } from "../types";

type RawImageResult = { data: string; format: ImageFormat } & RawResult;

/** A model that renders only at its own frames, like Muse. */
type Framed = ModelEntry & { frames?: readonly Dimensions[] };

const RUNWARE_FORMATS = { jpg: "JPG", png: "PNG", webp: "WEBP" } as const;

const DEFAULT_SIZE: Dimensions = { width: 2848, height: 1600 };

const framesFor = (model: string) =>
	Object.values<Framed>(RUNWARE_IMAGE_MODELS).find(({ id }) => id === model)
		?.frames;

const shape = ({ width, height }: Dimensions) => Math.log(width / height);

function sizeFor(model: string, requested: Dimensions): Dimensions {
	const frames = framesFor(model);
	if (!frames) return requested;
	const target = shape(requested);
	return minBy(frames, (frame) => Math.abs(shape(frame) - target)) ?? requested;
}

export class RunwareImage
	extends BaseProvider<VendorParams<ImageGenerateParams>, RawImageResult>
	implements ImageProvider
{
	protected readonly blobConfig = { type: "image", provider: "runware" };
	private apiKey: string;

	constructor(apiKey: string) {
		super();
		this.apiKey = apiKey;
	}

	async validate() {
		return validateRunwareKey(this.apiKey);
	}

	protected toFiles(result: RawImageResult): BundleFile[] {
		return [
			{
				key: "image",
				filename: `output.${result.format}`,
				data: Buffer.from(result.data, "base64"),
				contentType: IMAGE_MIME_TYPES[result.format],
			},
		];
	}

	protected async _generate(params: VendorParams<ImageGenerateParams>) {
		const format = params.format ?? DEFAULT_IMAGE_FORMAT;
		const referenceImages = [
			...characterAvatars(params.characterAssets ?? []),
			...(params.referenceImages ?? []),
		];
		const size = sizeFor(params.model, {
			width: params.width ?? DEFAULT_SIZE.width,
			height: params.height ?? DEFAULT_SIZE.height,
		});
		return withRunware(this.apiKey, async (runware) => {
			const results = await runware.imageInference({
				positivePrompt: renderCharacterRefs(params.prompt),
				model: params.model,
				...size,
				outputType: "base64Data",
				outputFormat: RUNWARE_FORMATS[format],
				numberResults: 1,
				includeCost: true,
				...(referenceImages.length > 0 && { inputs: { referenceImages } }),
			});

			const image = results?.[0];
			if (!image?.imageBase64Data) throw new Error("No image data returned");
			if (image.cost === undefined) throw new Error("No image cost returned");

			return { data: image.imageBase64Data, format, costUsd: image.cost };
		});
	}
}
