import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/asset-bundle");

const mockDisconnect = vi.fn();
const mockImageInference = vi.fn();

vi.mock("@runware/sdk-js", () => ({
	Runware: class {
		constructor() {
			return {
				imageInference: mockImageInference,
				disconnect: mockDisconnect,
			};
		}
	},
}));

import { AssetBundle } from "@/lib/api/asset-bundle";
import { RunwareImage } from "../image/runware";

const MODEL = "bytedance:seedream@5.0-lite";
const MUSE = "meta:muse@image";

describe("RunwareImage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("generates an image with defaults", async () => {
		mockImageInference.mockResolvedValue([
			{ imageBase64Data: "abc123", cost: 0.02, seed: 1 },
		]);

		const provider = new RunwareImage("test-key");
		const result = await provider.generate({ prompt: "a cat", model: MODEL });

		expect(result.output.result.image).toBe("url");
		expect(mockImageInference).toHaveBeenCalledWith({
			positivePrompt: "a cat",
			model: MODEL,
			width: 2848,
			height: 1600,
			outputType: "base64Data",
			outputFormat: "JPG",
			numberResults: 1,
			includeCost: true,
		});
		expect(mockDisconnect).toHaveBeenCalled();
	});

	it("names the characters plainly, their avatars ahead of the other reference images", async () => {
		mockImageInference.mockResolvedValue([
			{ imageBase64Data: "abc", cost: 0.02 },
		]);

		await new RunwareImage("test-key").generate({
			prompt: "{{Red}} pets a cat",
			model: MODEL,
			characterAssets: [{ name: "Red", avatarUrl: "https://img/red.png" }],
			referenceImages: ["https://img/style.png"],
		});

		expect(mockImageInference).toHaveBeenCalledWith(
			expect.objectContaining({
				positivePrompt: "Red pets a cat",
				inputs: {
					referenceImages: ["https://img/red.png", "https://img/style.png"],
				},
			}),
		);
	});

	it.each([
		[
			{ width: 2560, height: 1440 },
			{ width: 2048, height: 1152 },
		],
		[
			{ width: 1440, height: 2560 },
			{ width: 1152, height: 2048 },
		],
		[
			{ width: 1000, height: 1000 },
			{ width: 1600, height: 1600 },
		],
	])(
		"renders Muse at the frame nearest in shape to %o",
		async (requested, frame) => {
			mockImageInference.mockResolvedValue([
				{ imageBase64Data: "abc", cost: 0.01 },
			]);

			await new RunwareImage("test-key").generate({
				prompt: "a cat",
				model: MUSE,
				...requested,
			});

			expect(mockImageInference).toHaveBeenCalledWith(
				expect.objectContaining(frame),
			);
		},
	);

	it("asks for the format it labels the bytes with", async () => {
		mockImageInference.mockResolvedValue([
			{ imageBase64Data: "abc", cost: 0.02 },
		]);

		await new RunwareImage("test-key").generate({
			prompt: "a cat",
			model: MODEL,
			format: "webp",
		});

		expect(mockImageInference).toHaveBeenCalledWith(
			expect.objectContaining({ outputFormat: "WEBP" }),
		);
		expect(AssetBundle.upload).toHaveBeenCalledWith(
			"image",
			"runware",
			[
				expect.objectContaining({
					filename: "output.webp",
					contentType: "image/webp",
				}),
			],
			undefined,
		);
	});

	it("passes custom dimensions and model", async () => {
		mockImageInference.mockResolvedValue([
			{ imageBase64Data: "data", cost: 0.02 },
		]);

		const provider = new RunwareImage("test-key");
		await provider.generate({
			prompt: "sunset",
			model: "custom-model",
			width: 1024,
			height: 768,
		});

		expect(mockImageInference).toHaveBeenCalledWith(
			expect.objectContaining({
				model: "custom-model",
				width: 1024,
				height: 768,
			}),
		);
	});

	it("throws when no image data returned", async () => {
		mockImageInference.mockResolvedValue([{}]);

		const provider = new RunwareImage("test-key");
		await expect(
			provider.generate({ prompt: "test", model: MODEL }),
		).rejects.toThrow("No image data returned");
		expect(mockDisconnect).toHaveBeenCalled();
	});

	it("throws and disconnects when inference fails", async () => {
		mockImageInference.mockRejectedValue(new Error("API error"));

		const provider = new RunwareImage("test-key");
		await expect(
			provider.generate({ prompt: "test", model: MODEL }),
		).rejects.toThrow("API error");
		expect(mockDisconnect).toHaveBeenCalled();
	});
});
