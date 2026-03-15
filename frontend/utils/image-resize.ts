const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Resizes an image file if it exceeds the maximum byte size.
 * Uses the Canvas API to scale dimensions and reduce quality iteratively.
 * Returns the original file unchanged if it's already within the limit.
 */
export async function resizeImageIfNeeded(
    file: File,
    maxBytes: number = DEFAULT_MAX_BYTES
): Promise<File> {
    if (file.size <= maxBytes) return file;

    const img = await loadImage(file);
    const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";

    // Start with a scale factor based on size ratio, then iterate quality
    let scaleFactor = Math.sqrt(maxBytes / file.size) * 0.95; // slight extra margin
    const qualities = [0.85, 0.7, 0.5, 0.3];

    for (const quality of qualities) {
        const width = Math.round(img.width * scaleFactor);
        const height = Math.round(img.height * scaleFactor);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get canvas context");
        ctx.drawImage(img, 0, 0, width, height);

        const blob = await canvasToBlob(canvas, mimeType, quality);
        if (blob.size <= maxBytes) {
            return new File([blob], file.name, { type: mimeType });
        }

        // Shrink further for next iteration
        scaleFactor *= 0.8;
    }

    // Final fallback: aggressive downscale with lowest quality
    const width = Math.round(img.width * 0.3);
    const height = Math.round(img.height * 0.3);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, mimeType, 0.3);
    return new File([blob], file.name, { type: mimeType });
}

export interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Crops an image to the specified pixel area.
 * Returns a Blob of the cropped region.
 */
export async function getCroppedImage(
    imageSrc: string,
    cropAreaPixels: CropArea,
    mimeType: string = "image/jpeg"
): Promise<Blob> {
    const img = await loadImageFromUrl(imageSrc);

    const canvas = document.createElement("canvas");
    canvas.width = cropAreaPixels.width;
    canvas.height = cropAreaPixels.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(
        img,
        cropAreaPixels.x,
        cropAreaPixels.y,
        cropAreaPixels.width,
        cropAreaPixels.height,
        0,
        0,
        cropAreaPixels.width,
        cropAreaPixels.height
    );

    return canvasToBlob(canvas, mimeType, 0.92);
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image"));
        };
        img.src = url;
    });
}

function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = src;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
            type,
            quality
        );
    });
}
