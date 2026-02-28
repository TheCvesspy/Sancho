"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInviteToken, revokeInviteToken } from "@/app/[locale]/(app)/identity/actions";
import { Loader2, Plus, RefreshCcw, Trash2, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export interface InviteToken {
    id: string;
    emailHint: string | null;
    expiresAt: string;
    usedAt: string | null;
    usedBy: string | null;
    revokedAt: string | null;
    createdAt: string;
    createdByEmail: string;
}

export function InviteTokenManager({ tokens }: { tokens: InviteToken[] }) {
    const [isCreating, setIsCreating] = useState(false);
    const [emailHint, setEmailHint] = useState("");
    const [validityHours, setValidityHours] = useState(24);
    const [newToken, setNewToken] = useState<{ rawToken: string, id: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            const result = await createInviteToken(emailHint || undefined, validityHours);
            setNewToken(result);
            toast.success("Invite token generated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to create token");
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm("Are you sure you want to revoke this token?")) return;
        try {
            await revokeInviteToken(id);
            toast.success("Token revoked");
        } catch (error) {
            console.error(error);
            toast.error("Failed to revoke token");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getStatus = (token: InviteToken) => {
        if (token.usedAt) return <Badge variant="secondary">Used</Badge>;
        if (token.revokedAt) return <Badge variant="destructive">Revoked</Badge>;
        if (new Date(token.expiresAt) < new Date()) return <Badge variant="outline">Expired</Badge>;
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Invite Tokens</h2>
                <Dialog onOpenChange={(open) => { if (!open) { setNewToken(null); setEmailHint(""); setValidityHours(24); } }}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Token
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Invite Token</DialogTitle>
                            <DialogDescription>
                                Generated tokens are valid for a limited time and can only be used once.
                            </DialogDescription>
                        </DialogHeader>

                        {!newToken ? (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email-hint">Email Hint (Optional)</Label>
                                    <Input
                                        id="email-hint"
                                        placeholder="user@example.com"
                                        value={emailHint}
                                        onChange={(e) => setEmailHint(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="validity">Validity (Hours)</Label>
                                    <Input
                                        id="validity"
                                        type="number"
                                        value={validityHours}
                                        onChange={(e) => setValidityHours(parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 py-4">
                                <Alert className="bg-primary/5 border-primary/20">
                                    <AlertDescription className="text-sm font-medium">
                                        Copy this token now. It will not be shown again!
                                    </AlertDescription>
                                </Alert>
                                <div className="flex items-center space-x-2">
                                    <Input readOnly value={newToken.rawToken} className="font-mono bg-muted" />
                                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(newToken.rawToken)}>
                                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {!newToken ? (
                                <Button onClick={handleCreate} disabled={isCreating}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Generate Token
                                </Button>
                            ) : (
                                <DialogTrigger asChild>
                                    <Button>Done</Button>
                                </DialogTrigger>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email Hint</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead>Created By</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tokens.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    No tokens found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tokens.map((token) => (
                                <TableRow key={token.id}>
                                    <TableCell className="font-medium">{token.emailHint || "—"}</TableCell>
                                    <TableCell>{getStatus(token)}</TableCell>
                                    <TableCell className="text-xs">
                                        {format(new Date(token.expiresAt), "MMM d, HH:mm")}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {token.createdByEmail}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!token.usedAt && !token.revokedAt && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRevoke(token.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// Add CSS for Alert if not already defined (using simplified inline version to ensure it works)
function Alert({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`p-3 rounded-md border flex items-start space-x-3 ${className}`}>
            {children}
        </div>
    );
}
function AlertDescription({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={className}>{children}</div>;
}
