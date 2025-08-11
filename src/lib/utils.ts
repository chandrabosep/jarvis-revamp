import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function base64ToDataUrl(
	base64Data: string,
	mimeType: string = "image/jpeg"
): string {
	// If it's already a data URL, return as is
	if (base64Data.startsWith("data:")) {
		return base64Data;
	}

	// If it starts with /9j/, it's JPEG data
	if (base64Data.startsWith("/9j/")) {
		return `data:${mimeType};base64,${base64Data}`;
	}

	// Otherwise, assume it's raw base64 data
	return `data:${mimeType};base64,${base64Data}`;
}


export function isImageData(data: string): boolean {
	return (
		data.startsWith("/9j/") || // JPEG
		data.startsWith("data:image/") || // Data URLs
		data.startsWith("iVBORw0KGgo") || // PNG
		data.startsWith("R0lGODlh")
	); // GIF
}
