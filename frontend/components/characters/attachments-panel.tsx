"use client";

import { useTranslations } from "next-intl";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
    FileUp, Trash2, ExternalLink, Loader2, Pencil, Plus,
    FileText, Image as ImageIcon, FileIcon, Link2, Lock,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    CharacterAttachmentDto,
    CharacterDetailDto,
    AddGoogleDriveLinkRequest,
    UpdateCharacterAttachmentRequest,
    charactersApi,
} from "@/utils/characters-api";

// ─── Constants ──────────────────────────────────────────────────────────────

const ACCEPTED_MIME_TYPES = [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf", "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp,.gif";
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const GOOGLE_DRIVE_HOSTS = [
    "drive.google.com", "docs.google.com",
    "sheets.google.com", "slides.google.com", "forms.google.com",
];

const DOCUMENT_STATUSES = ["Draft", "Ready to Review", "Final"] as const;
type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

// ─── Props ───────────────────────────────────────────────────────────────────

interface AttachmentsPanelProps {
    eventId: string;
    character: CharacterDetailDto;
    initialAttachments: CharacterAttachmentDto[];
    token: string;
    isOrgOrSysAdmin: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidGoogleDriveUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && GOOGLE_DRIVE_HOSTS.includes(parsed.hostname);
    } catch {
        return false;
    }
}

function fileNameWithoutExtension(name: string): string {
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(0, dot) : name;
}

function getFileCategory(mimeType: string): "Document" | "Image" | "Other" {
    if (mimeType.startsWith("image/")) return "Image";
    if (
        mimeType === "application/pdf" ||
        mimeType.startsWith("text/") ||
        mimeType.includes("word") ||
        mimeType.includes("excel") ||
        mimeType.includes("spreadsheet") ||
        mimeType === "text/uri-list"
    ) return "Document";
    return "Other";
}

function DocumentStatusBadge({ status }: { status: string }) {
    const variant =
        status === "Final" ? "default" :
        status === "Ready to Review" ? "secondary" :
        "outline";
    return <Badge variant={variant}>{status}</Badge>;
}

function SourceIcon({ sourceType }: { sourceType: string }) {
    if (sourceType === "GoogleDrive") {
        return <ExternalLink className="h-4 w-4 text-blue-500 shrink-0" />;
    }
    return <FileUp className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function AttachmentIcon({ category }: { category: string }) {
    if (category === "Image") return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (category === "Document") return <FileText className="h-5 w-5 text-amber-500" />;
    return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AttachmentsPanel({ eventId, character, initialAttachments, token }: AttachmentsPanelProps) {
    const t = useTranslations("characters");
    const router = useRouter();
    const isLocked = character.status === "Locked";

    const [attachments, setAttachments] = useState(initialAttachments);
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<CharacterAttachmentDto | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<CharacterAttachmentDto | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Add dialog ────────────────────────────────────────────────────────────

    const addUploadSchema = z.object({
        displayName: z.string().min(1, t("validation.documentNameRequired")),
        documentStatus: z.enum(DOCUMENT_STATUSES, { required_error: t("validation.documentNameRequired") }),
        file: z
            .instanceof(typeof window !== "undefined" ? File : Object as any)
            .refine((f) => f instanceof File && f.size <= MAX_FILE_BYTES, t("validation.fileTooLarge"))
            .refine((f) => f instanceof File && ACCEPTED_MIME_TYPES.includes(f.type), t("validation.fileTypeNotAllowed")),
    });
    type AddUploadValues = z.infer<typeof addUploadSchema>;

    const addLinkSchema = z.object({
        displayName: z.string().min(1, t("validation.documentNameRequired")),
        documentStatus: z.enum(DOCUMENT_STATUSES, { required_error: t("validation.documentNameRequired") }),
        url: z
            .string()
            .min(1, t("validation.documentUrlInvalid"))
            .refine(isValidGoogleDriveUrl, t("validation.documentUrlInvalid")),
    });
    type AddLinkValues = z.infer<typeof addLinkSchema>;

    const uploadForm = useForm<AddUploadValues>({
        resolver: zodResolver(addUploadSchema),
        defaultValues: { displayName: "", documentStatus: "Draft" },
    });

    const linkForm = useForm<AddLinkValues>({
        resolver: zodResolver(addLinkSchema),
        defaultValues: { displayName: "", documentStatus: "Draft", url: "" },
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const replaceFileInputRef = useRef<HTMLInputElement>(null);

    function handleAddDialogClose(open: boolean) {
        if (!open) {
            uploadForm.reset();
            linkForm.reset();
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
        setAddOpen(open);
    }

    async function onUploadSubmit(values: AddUploadValues) {
        const file = values.file as File;
        try {
            const category = getFileCategory(file.type);

            // 1. Get signed upload URL
            const { uploadUrl, storagePath } = await charactersApi.createAttachmentUploadUrl(token, eventId, character.id, {
                fileName: file.name,
                contentType: file.type,
                sizeBytes: file.size,
            });

            // 2. Upload directly to Supabase Storage
            const uploadResp = await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });
            if (!uploadResp.ok) throw new Error("Storage upload failed");

            // 3. Confirm with backend
            const created = await charactersApi.confirmAttachment(token, eventId, character.id, {
                storagePath,
                displayName: values.displayName,
                documentStatus: values.documentStatus,
            });

            setAttachments((prev) => [created, ...prev]);
            toast.success(t("notifications.attachmentAdded"));
            handleAddDialogClose(false);
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error(t("errors.loadFailed"));
        }
    }

    async function onLinkSubmit(values: AddLinkValues) {
        try {
            const body: AddGoogleDriveLinkRequest = {
                url: values.url,
                displayName: values.displayName,
                documentStatus: values.documentStatus,
            };
            const created = await charactersApi.addGoogleDriveLink(token, eventId, character.id, body);
            setAttachments((prev) => [created, ...prev]);
            toast.success(t("notifications.attachmentAdded"));
            handleAddDialogClose(false);
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error(t("errors.loadFailed"));
        }
    }

    // ── Edit dialog ───────────────────────────────────────────────────────────

    const editSchema = z.object({
        displayName: z.string().min(1, t("validation.documentNameRequired")),
        documentStatus: z.enum(DOCUMENT_STATUSES),
        newUrl: z.string().optional(),
    });
    type EditValues = z.infer<typeof editSchema>;

    const editForm = useForm<EditValues>({
        resolver: zodResolver(editSchema),
    });

    function openEdit(attachment: CharacterAttachmentDto) {
        setEditTarget(attachment);
        editForm.reset({
            displayName: attachment.displayName,
            documentStatus: attachment.documentStatus as DocumentStatus,
            newUrl: attachment.sourceType === "GoogleDrive" ? attachment.fileUrl : "",
        });
        if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
    }

    function closeEdit() {
        setEditTarget(null);
        editForm.reset();
        if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
    }

    async function onEditSubmit(values: EditValues) {
        if (!editTarget) return;

        const replaceFile = replaceFileInputRef.current?.files?.[0] ?? null;

        try {
            const updateData: UpdateCharacterAttachmentRequest = {
                displayName: values.displayName,
                documentStatus: values.documentStatus,
            };

            if (replaceFile && editTarget.sourceType === "Upload" && !isLocked) {
                // 1. Get new signed URL
                const { uploadUrl, storagePath } = await charactersApi.createAttachmentUploadUrl(token, eventId, character.id, {
                    fileName: replaceFile.name,
                    contentType: replaceFile.type,
                    sizeBytes: replaceFile.size,
                });
                // 2. Upload
                const uploadResp = await fetch(uploadUrl, {
                    method: "PUT",
                    body: replaceFile,
                    headers: { "Content-Type": replaceFile.type },
                });
                if (!uploadResp.ok) throw new Error("Storage upload failed");
                updateData.newFilePath = storagePath;
                updateData.oldFilePath = editTarget.fileUrl;
            } else if (values.newUrl && editTarget.sourceType === "GoogleDrive" && !isLocked) {
                updateData.newGoogleDriveUrl = values.newUrl;
            }

            const updated = await charactersApi.updateAttachment(token, eventId, character.id, editTarget.id, updateData);
            setAttachments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            toast.success(t("notifications.attachmentUpdated"));
            closeEdit();
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error(t("errors.loadFailed"));
        }
    }

    // ── Delete dialog ─────────────────────────────────────────────────────────

    async function confirmDelete() {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await charactersApi.deleteAttachment(token, eventId, character.id, deleteTarget.id);
            setAttachments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
            toast.success(t("notifications.attachmentDeleted"));
            setDeleteTarget(null);
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error(t("errors.loadFailed"));
        } finally {
            setIsDeleting(false);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-10">
            {/* ── Character Documents ─────────────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">{t("attachments.title")}</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {t("attachments.constraints")}
                        </p>
                    </div>
                    {!isLocked && (
                        <Button onClick={() => setAddOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t("attachments.addDocument")}
                        </Button>
                    )}
                </div>

                {isLocked && (
                    <p className="text-sm text-muted-foreground italic">
                        {t("attachments.lockedReadOnly")}
                    </p>
                )}

                {attachments.length === 0 ? (
                    <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
                        {t("attachments.emptyState")}
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("attachments.documentName")}</TableHead>
                                    <TableHead>{t("attachments.documentStatus")}</TableHead>
                                    <TableHead>{t("attachments.source")}</TableHead>
                                    <TableHead>{t("attachments.date")}</TableHead>
                                    <TableHead className="w-[80px]">{t("list.columns.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attachments.map((attachment) => (
                                    <TableRow key={attachment.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <AttachmentIcon category={attachment.category} />
                                                {attachment.sourceType === "GoogleDrive" ? (
                                                    <a
                                                        href={attachment.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-medium hover:underline text-sm"
                                                    >
                                                        {attachment.displayName}
                                                    </a>
                                                ) : (
                                                    <a
                                                        href={attachment.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-medium hover:underline text-sm"
                                                    >
                                                        {attachment.displayName}
                                                    </a>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <DocumentStatusBadge status={attachment.documentStatus} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <SourceIcon sourceType={attachment.sourceType} />
                                                {attachment.sourceType === "GoogleDrive"
                                                    ? t("attachments.sourceTypes.googleDrive")
                                                    : t("attachments.sourceTypes.upload")}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(attachment.uploadedAt), "PP")}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => openEdit(attachment)}
                                                    title={t("abilities.edit")}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                {!isLocked && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => setDeleteTarget(attachment)}
                                                        title={t("abilities.delete")}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </section>

            {/* ── Related Documents placeholder ───────────────────────────── */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-muted-foreground" />
                        {t("attachments.relatedDocuments.title")}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {t("attachments.relatedDocuments.description")}
                    </p>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("attachments.documentName")}</TableHead>
                                <TableHead>{t("attachments.documentStatus")}</TableHead>
                                <TableHead>{t("attachments.source")}</TableHead>
                                <TableHead>{t("attachments.date")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <Lock className="h-5 w-5 opacity-40" />
                                        <span className="text-sm">{t("attachments.relatedDocuments.description")}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </section>

            {/* ── Add Document dialog ─────────────────────────────────────── */}
            <Dialog open={addOpen} onOpenChange={handleAddDialogClose}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t("attachments.dialogs.addDocument.title")}</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="upload" className="mt-2">
                        <TabsList className="w-full">
                            <TabsTrigger value="upload" className="flex-1">
                                <FileUp className="mr-2 h-4 w-4" />
                                {t("attachments.uploadFile")}
                            </TabsTrigger>
                            <TabsTrigger value="link" className="flex-1">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                {t("attachments.googleDriveLink")}
                            </TabsTrigger>
                        </TabsList>

                        {/* Upload tab */}
                        <TabsContent value="upload" className="mt-4">
                            <Form {...uploadForm}>
                                <form onSubmit={uploadForm.handleSubmit(onUploadSubmit)} className="space-y-4">
                                    <FormField
                                        control={uploadForm.control}
                                        name="file"
                                        render={({ field: { onChange, value, ...fieldProps } }) => (
                                            <FormItem>
                                                <FormLabel>{t("attachments.uploadFile")}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...fieldProps}
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept={ACCEPTED_EXTENSIONS}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                onChange(file);
                                                                // Pre-fill document name from filename
                                                                const currentName = uploadForm.getValues("displayName");
                                                                if (!currentName) {
                                                                    uploadForm.setValue("displayName", fileNameWithoutExtension(file.name));
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-muted-foreground">{t("attachments.constraints")}</p>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={uploadForm.control}
                                        name="displayName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("attachments.documentName")}</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder={t("attachments.documentName")} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={uploadForm.control}
                                        name="documentStatus"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("attachments.documentStatus")}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Draft">{t("attachments.documentStatuses.draft")}</SelectItem>
                                                        <SelectItem value="Ready to Review">{t("attachments.documentStatuses.readyToReview")}</SelectItem>
                                                        <SelectItem value="Final">{t("attachments.documentStatuses.final")}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => handleAddDialogClose(false)}>
                                            {t("dialogs.common.cancel")}
                                        </Button>
                                        <Button type="submit" disabled={uploadForm.formState.isSubmitting}>
                                            {uploadForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {t("attachments.dialogs.addDocument.submit")}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </TabsContent>

                        {/* Google Drive tab */}
                        <TabsContent value="link" className="mt-4">
                            <Form {...linkForm}>
                                <form onSubmit={linkForm.handleSubmit(onLinkSubmit)} className="space-y-4">
                                    <FormField
                                        control={linkForm.control}
                                        name="url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("attachments.googleDriveUrl")}</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder={t("attachments.googleDrivePlaceholder")} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={linkForm.control}
                                        name="displayName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("attachments.documentName")}</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder={t("attachments.documentName")} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={linkForm.control}
                                        name="documentStatus"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("attachments.documentStatus")}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Draft">{t("attachments.documentStatuses.draft")}</SelectItem>
                                                        <SelectItem value="Ready to Review">{t("attachments.documentStatuses.readyToReview")}</SelectItem>
                                                        <SelectItem value="Final">{t("attachments.documentStatuses.final")}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => handleAddDialogClose(false)}>
                                            {t("dialogs.common.cancel")}
                                        </Button>
                                        <Button type="submit" disabled={linkForm.formState.isSubmitting}>
                                            {linkForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {t("attachments.dialogs.addDocument.submit")}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* ── Edit Document dialog ────────────────────────────────────── */}
            <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) closeEdit(); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("attachments.dialogs.editDocument.title")}</DialogTitle>
                    </DialogHeader>
                    {editTarget && (
                        <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 mt-2">
                                <FormField
                                    control={editForm.control}
                                    name="displayName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("attachments.documentName")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name="documentStatus"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("attachments.documentStatus")}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Draft">{t("attachments.documentStatuses.draft")}</SelectItem>
                                                    <SelectItem value="Ready to Review">{t("attachments.documentStatuses.readyToReview")}</SelectItem>
                                                    <SelectItem value="Final">{t("attachments.documentStatuses.final")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Upload new version – only for Upload source, not locked */}
                                {editTarget.sourceType === "Upload" && !isLocked && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">{t("attachments.uploadNewVersion")}</label>
                                        <Input
                                            ref={replaceFileInputRef}
                                            type="file"
                                            accept={ACCEPTED_EXTENSIONS}
                                        />
                                        <p className="text-xs text-muted-foreground">{t("attachments.constraints")}</p>
                                    </div>
                                )}

                                {/* Change URL – only for Google Drive source, not locked */}
                                {editTarget.sourceType === "GoogleDrive" && !isLocked && (
                                    <FormField
                                        control={editForm.control}
                                        name="newUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("attachments.changeUrl")}</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder={t("attachments.googleDrivePlaceholder")} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={closeEdit}>
                                        {t("dialogs.common.cancel")}
                                    </Button>
                                    <Button type="submit" disabled={editForm.formState.isSubmitting}>
                                        {editForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t("attachments.dialogs.editDocument.submit")}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Delete confirmation dialog ──────────────────────────────── */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("attachments.dialogs.deleteDocument.title")}</DialogTitle>
                        <DialogDescription>
                            {deleteTarget?.sourceType === "Upload"
                                ? t("attachments.dialogs.deleteDocument.descriptionUpload")
                                : t("attachments.dialogs.deleteDocument.descriptionLink")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                            {t("dialogs.common.cancel")}
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("attachments.dialogs.deleteDocument.submit")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
