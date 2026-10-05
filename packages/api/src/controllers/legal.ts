import {
    type Request,
    type Response
} from 'express';

import fs from 'fs';
import path from 'path';

import matter from 'gray-matter';

import {
    type API$Types
} from '@Madeirense/shared';

import {
    handleControllerError
} from './utilities/handlers';

// ***************************************************************************************************************

/**
 * Terms/Privacy are plain markdown files, not a database table — see
 * `content/legal/`'s own files. Robbie's explicit design (2026-10-02):
 * one source of truth, served to both web and mobile, so neither can
 * drift out of sync with the other by having its own copy. `updated`
 * comes from the file's own frontmatter rather than its filesystem
 * mtime — mtime resets on every deploy (fresh checkout), which would
 * make the document look "just updated" after every deploy regardless
 * of whether its content actually changed.
 */
export type legalDocument = {
    content: string;
    updated: string;
};

const LEGAL_CONTENT_DIR = path.resolve(process.cwd(), 'content', 'legal');

const readLegalDocument = (slug: 'terms' | 'privacy'): legalDocument => {
    const raw = fs.readFileSync(
        path.join(LEGAL_CONTENT_DIR, `${slug}.md`),
        'utf-8'
    );

    const { content, data } = matter(raw);

    return {
        content: content.trim(),
        updated: data["updated"] ?? ''
    };
};

export const getTerms = async (
    req: Request,
    res: Response<API$Types.response<legalDocument | undefined>>
) => {
    try {
        return res.status(200).json({
            data: readLegalDocument('terms'),
            message: `Fetched terms of service`,
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getPrivacyPolicy = async (
    req: Request,
    res: Response<API$Types.response<legalDocument | undefined>>
) => {
    try {
        return res.status(200).json({
            data: readLegalDocument('privacy'),
            message: `Fetched privacy policy`,
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};
