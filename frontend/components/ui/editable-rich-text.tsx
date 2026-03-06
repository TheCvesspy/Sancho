"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { RichTextView } from "@/components/ui/rich-text-view";
import { Edit2, Check, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

const RichTextEditor = dynamic(
    () => import("@/components/ui/rich-text-editor").then(m => ({ default: m.RichTextEditor })),
    { ssr: false, loading: () => <div className="h-32 rounded-md border bg-muted animate-pulse" /> }
);

interface EditableRichTextProps {
    initialHtml: string;
    placeholder?: string;
    isReadOnly?: boolean;
    onSave: (html: string) => Promise<void>;
}

export function EditableRichText({ initialHtml, placeholder, isReadOnly = false, onSave }: EditableRichTextProps) {
    const t = useTranslations("common");
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialHtml);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await onSave(value);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save rich text", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setValue(initialHtml);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="space-y-4">
                <RichTextEditor value={value} onChange={setValue} disabled={isSaving} />
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                        Save
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="group relative">
            {!isReadOnly && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                    </Button>
                </div>
            )}
            <div className="min-h-[100px] p-4 bg-muted/20 rounded-md">
                {initialHtml ? (
                    <RichTextView html={initialHtml} />
                ) : (
                    <p className="text-muted-foreground italic">{placeholder || "No description provided."}</p>
                )}
            </div>
        </div>
    );
}
