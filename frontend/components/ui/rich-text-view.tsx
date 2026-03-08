"use client";

import DOMPurify from "isomorphic-dompurify";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface RichTextViewProps {
    html: string;
    className?: string;
}

export function RichTextView({ html, className }: RichTextViewProps) {
    const sanitizedHtml = useMemo(() => {
        if (!html) return "";
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'br', 'span', 'div'],
            ALLOWED_ATTR: ['style', 'class'],
            FORBID_TAGS: ['script', 'style_tag'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
        });
    }, [html]);

    if (!html) return null;

    return (
        <div
            className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
}
