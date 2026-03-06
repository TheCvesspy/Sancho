"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ExternalLink, Trash2, FileText, Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentItem {
    id: string;
    displayName: string;
    url: string;
    documentStatus: "Draft" | "Ready to Review" | "Final";
    sourceType: string;
    createdAt: string;
}

export interface AddDocumentLinkData {
    url: string;
    displayName: string;
    documentStatus: "Draft" | "Ready to Review" | "Final";
}

export interface DocumentLinkTranslations {
    title: string;
    addButton: string;
    emptyState: string;
    columns: {
        name: string;
        status: string;
        source: string;
        date: string;
        actions: string;
    };
    statuses: {
        draft: string;
        readyToReview: string;
        final: string;
    };
    dialogs: {
        add: {
            title: string;
            urlLabel: string;
            urlPlaceholder: string;
            nameLabel: string;
            statusLabel: string;
            submit: string;
            cancel: string;
        };
        delete: {
            title: string;
            description: string;
            confirm: string;
            cancel: string;
        };
    };
    validationUrlInvalid: string;
    validationNameRequired: string;
    notifications: {
        added: string;
        deleted: string;
        error: string;
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GOOGLE_DRIVE_HOSTS = [
    "drive.google.com", "docs.google.com",
    "sheets.google.com", "slides.google.com", "forms.google.com",
];

function isValidGoogleDriveUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && GOOGLE_DRIVE_HOSTS.includes(parsed.hostname);
    } catch {
        return false;
    }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export function DocumentStatusBadge({ status }: { status: string }) {
    const cls =
        status === "Final"
            ? "border-green-300 bg-green-100 text-green-800"
            : status === "Ready to Review"
                ? "border-amber-300 bg-amber-100 text-amber-800"
                : "border-gray-300 bg-gray-100 text-gray-700";
    return <Badge variant="outline" className={cls}>{status}</Badge>;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DocumentLinkPanelProps {
    initialDocuments: DocumentItem[];
    isReadOnly?: boolean;
    onAdd: (data: AddDocumentLinkData) => Promise<DocumentItem>;
    onDelete: (id: string) => Promise<void>;
    translations: DocumentLinkTranslations;
}

export function DocumentLinkPanel({
    initialDocuments,
    isReadOnly = false,
    onAdd,
    onDelete,
    translations: tl,
}: DocumentLinkPanelProps) {
    const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
    const [addOpen, setAddOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Add form ──────────────────────────────────────────────────────────────

    const addSchema = z.object({
        url: z.string().min(1, tl.validationUrlInvalid).refine(isValidGoogleDriveUrl, tl.validationUrlInvalid),
        displayName: z.string().min(1, tl.validationNameRequired),
        documentStatus: z.enum(["Draft", "Ready to Review", "Final"]),
    });
    type AddValues = z.infer<typeof addSchema>;

    const addForm = useForm<AddValues>({
        resolver: zodResolver(addSchema),
        defaultValues: { url: "", displayName: "", documentStatus: "Draft" },
    });

    function handleAddClose(open: boolean) {
        if (!open) addForm.reset();
        setAddOpen(open);
    }

    async function onAddSubmit(values: AddValues) {
        try {
            const created = await onAdd(values as AddDocumentLinkData);
            setDocuments((prev) => [created, ...prev]);
            toast.success(tl.notifications.added);
            handleAddClose(false);
        } catch (err) {
            console.error(err);
            toast.error(tl.notifications.error);
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    async function confirmDelete() {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await onDelete(deleteTarget.id);
            setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
            toast.success(tl.notifications.deleted);
            setDeleteTarget(null);
        } catch (err) {
            console.error(err);
            toast.error(tl.notifications.error);
        } finally {
            setIsDeleting(false);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">{tl.title}</h2>
                {!isReadOnly && (
                    <Button onClick={() => setAddOpen(true)} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        {tl.addButton}
                    </Button>
                )}
            </div>

            {documents.length === 0 ? (
                <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
                    {tl.emptyState}
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{tl.columns.name}</TableHead>
                                <TableHead>{tl.columns.status}</TableHead>
                                <TableHead>{tl.columns.source}</TableHead>
                                <TableHead>{tl.columns.date}</TableHead>
                                {!isReadOnly && <TableHead className="w-[60px]">{tl.columns.actions}</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium hover:underline text-sm"
                                            >
                                                {doc.displayName}
                                            </a>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DocumentStatusBadge status={doc.documentStatus} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                                            Google Drive
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(doc.createdAt), "PP")}
                                    </TableCell>
                                    {!isReadOnly && (
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => setDeleteTarget(doc)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* ── Add dialog ───────────────────────────────────────────── */}
            <Dialog open={addOpen} onOpenChange={handleAddClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{tl.dialogs.add.title}</DialogTitle>
                    </DialogHeader>
                    <Form {...addForm}>
                        <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 mt-2">
                            <FormField
                                control={addForm.control}
                                name="url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tl.dialogs.add.urlLabel}</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder={tl.dialogs.add.urlPlaceholder} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={addForm.control}
                                name="displayName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tl.dialogs.add.nameLabel}</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder={tl.dialogs.add.nameLabel} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={addForm.control}
                                name="documentStatus"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tl.dialogs.add.statusLabel}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Draft">{tl.statuses.draft}</SelectItem>
                                                <SelectItem value="Ready to Review">{tl.statuses.readyToReview}</SelectItem>
                                                <SelectItem value="Final">{tl.statuses.final}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => handleAddClose(false)}>
                                    {tl.dialogs.add.cancel}
                                </Button>
                                <Button type="submit" disabled={addForm.formState.isSubmitting}>
                                    {addForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {tl.dialogs.add.submit}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* ── Delete confirm dialog ────────────────────────────────── */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{tl.dialogs.delete.title}</DialogTitle>
                        <DialogDescription>{tl.dialogs.delete.description}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                            {tl.dialogs.delete.cancel}
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {tl.dialogs.delete.confirm}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
