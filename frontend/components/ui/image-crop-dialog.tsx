"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useTranslations } from "next-intl";
import { Loader2, ZoomIn } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getCroppedImage } from "@/utils/image-resize";

interface ImageCropDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageSrc: string;
    onCropComplete: (blob: Blob) => void;
    aspectRatio?: number;
    cropShape?: "round" | "rect";
    mimeType?: string;
}

export function ImageCropDialog({
    open,
    onOpenChange,
    imageSrc,
    onCropComplete,
    aspectRatio = 1,
    cropShape = "round",
    mimeType = "image/jpeg",
}: ImageCropDialogProps) {
    const t = useTranslations("common.imageCrop");

    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleApply = async () => {
        if (!croppedAreaPixels) return;

        try {
            setIsProcessing(true);
            const blob = await getCroppedImage(imageSrc, croppedAreaPixels, mimeType);
            onCropComplete(blob);
        } catch {
            console.error("Failed to crop image");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenChange = (value: boolean) => {
        if (!isProcessing) {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);
            onOpenChange(value);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>

                <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-md bg-muted">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        cropShape={cropShape}
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={handleCropComplete}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground shrink-0">{t("zoom")}</span>
                    <Slider
                        min={1}
                        max={3}
                        step={0.01}
                        value={[zoom]}
                        onValueChange={([v]) => setZoom(v)}
                        className="flex-1"
                    />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isProcessing}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={isProcessing || !croppedAreaPixels}
                    >
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("apply")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
