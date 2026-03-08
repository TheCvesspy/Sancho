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
    title?: string;
    description?: string;
    variant?: "default" | "amber";
    initialHtml: string;
    placeholder?: string;
    isReadOnly?: boolean;
    onSave: (html: string) => Promise<void>;
}

export function EditableRichText({ title, description, variant = "default", initialHtml, placeholder, isReadOnly = false, onSave }: EditableRichTextProps) {
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

    const isAmber = variant === "amber";

    return (
        <>
            {title && (
                <div className={isAmber
                    ? "flex items-center justify-between mb-2"
                    : "flex items-center justify-between border-b pb-2 mb-4"
                }>
                    <h3 className={isAmber
                        ? "text-lg font-semibold text-amber-900 dark:text-amber-500"
                        : "text-lg font-semibold text-foreground/80"
                    }>{title}</h3>
                    {!isReadOnly && !isEditing && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                            className={isAmber
                                ? "h-8 text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-900/40"
                                : "h-8 group"
                            }
                        >
                            <Edit2 className={isAmber
                                ? "h-4 w-4 mr-1"
                                : "h-4 w-4 mr-1 text-muted-foreground group-hover:text-foreground"
                            } />
                            {t("actions.edit")}
                        </Button>
                    )}
                </div>
            )}

            {description && (
                <p className={isAmber
                    ? "text-xs text-amber-700 dark:text-amber-600 mb-4 opacity-80"
                    : "text-xs text-muted-foreground mb-4 opacity-80"
                }>{description}</p>
            )}

            {isEditing ? (
                <div className="space-y-4">
                    <RichTextEditor
                        value={value}
                        onChange={setValue}
                        disabled={isSaving}
                        {...(isAmber && { className: "border-amber-300 dark:border-amber-800" })}
                    />
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className={isAmber ? "border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40" : undefined}
                        >
                            <X className="h-4 w-4 mr-1" />
                            {t("actions.cancel")}
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className={isAmber ? "bg-amber-600 hover:bg-amber-700 text-white" : undefined}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                            {t("actions.save")}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="min-h-[100px]">
                    {initialHtml ? (
                        <div className={isAmber ? "text-amber-950 dark:text-amber-200" : undefined}>
                            <RichTextView html={initialHtml} />
                        </div>
                    ) : (
                        <p className={isAmber
                            ? "text-amber-700/60 dark:text-amber-700 italic text-sm"
                            : "text-muted-foreground italic"
                        }>{placeholder || t("noContent")}</p>
                    )}
                </div>
            )}
        </>
    );
}
