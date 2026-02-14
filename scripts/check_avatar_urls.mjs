#!/usr/bin/env node
/**
 * Check how app_users.avatar_url values are stored (soup vs photo URLs).
 * Run: cd code/dashboard && node scripts/check_avatar_urls.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
    // 1) Total user counts
    const [
        { count: totalUsers },
        { count: totalWithAvatar }
    ] = await Promise.all([
        supabase.from('app_users').select('id', { count: 'exact', head: true }),
        supabase.from('app_users').select('id', { count: 'exact', head: true }).not('avatar_url', 'is', null)
    ]);
    console.log('\n=== app_users.avatar_url (full scan) ===\n');
    console.log('Total app_users rows:', totalUsers ?? 0);
    console.log('Users with avatar_url set:', totalWithAvatar ?? 0);
    console.log('Users with avatar_url NULL (may show as default soup in UI):', (totalUsers ?? 0) - (totalWithAvatar ?? 0));

    // 2) Fetch ALL rows (paginate; Supabase default max is 1000 per request)
    let all = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
        const { data: page, error } = await supabase
            .from('app_users')
            .select('id, avatar_url')
            .not('avatar_url', 'is', null)
            .range(from, from + pageSize - 1);
        if (error) {
            console.error('Fetch error:', error);
            break;
        }
        if (!page?.length) break;
        all = all.concat(page);
        if (page.length < pageSize) break;
        from += pageSize;
    }

    const urls = all.map((r) => r.avatar_url).filter(Boolean);

    // 3) Classify every value
    const startsWithSoup = urls.filter((u) => String(u).trim().toLowerCase().startsWith('soup://'));
    const containsSoup = urls.filter((u) => String(u).toLowerCase().includes('soup'));
    const httpOnly = urls.filter((u) => {
        const s = String(u);
        return (s.startsWith('http://') || s.startsWith('https://')) && !s.toLowerCase().includes('soup');
    });
    const httpWithSoup = urls.filter((u) => {
        const s = String(u);
        return (s.startsWith('http://') || s.startsWith('https://')) && s.toLowerCase().includes('soup');
    });
    const other = urls.filter((u) => {
        const s = String(u);
        return !s.startsWith('soup://') && !s.startsWith('http://') && !s.startsWith('https://');
    });

    console.log('\nBy prefix/pattern:');
    console.log('  soup:// (starts with) :', startsWithSoup.length);
    console.log('  http(s) (no "soup")   :', httpOnly.length);
    console.log('  http(s) containing soup:', httpWithSoup.length);
    console.log('  any url containing "soup":', containsSoup.length);
    console.log('  other (no http, no soup://):', other.length);

    if (startsWithSoup.length > 0) {
        const byValue = {};
        startsWithSoup.forEach((u) => { byValue[u] = (byValue[u] || 0) + 1; });
        console.log('\n  soup:// breakdown:', byValue);
    }
    if (httpWithSoup.length > 0) {
        console.log('\n  http URLs that contain "soup" (first 5):');
        [...new Set(httpWithSoup)].slice(0, 5).forEach((u) => console.log('   ', String(u).slice(0, 220)));
    }
    if (other.length > 0) {
        console.log('\n  other examples:', [...new Set(other)].slice(0, 10));
    }

    const nullAvatarCount = (totalUsers ?? 0) - (totalWithAvatar ?? 0);
    console.log('\n--- Summary ---');
    console.log('Stored as soup:// in DB:', startsWithSoup.length);
    console.log('Stored as http(s):', httpOnly.length);
    console.log('(NULL avatar_url):', nullAvatarCount, '→ may show as default soup in UI');

    // 4) Inspect http URL paths — real photos vs soup images might differ by path
    const pathPatterns = {};
    const pathSnippets = []; // first segment after /avatars/ or similar
    httpOnly.forEach((u) => {
        try {
            const url = new URL(u);
            const path = url.pathname;
            // e.g. /storage/v1/object/public/avatars/UUID/filename or /avatars/soup/cereal.png
            const match = path.match(/\/avatars\/([^/]+)/);
            const segment = match ? match[1] : path.slice(0, 60);
            pathPatterns[segment] = (pathPatterns[segment] || 0) + 1;
            // UUID is 8-4-4-4-12 hex
            const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
            pathSnippets.push({ segment, path: path.slice(0, 120), looksLikeUuid });
        } catch (_) {
            pathSnippets.push({ segment: 'parse-fail', path: String(u).slice(0, 80), looksLikeUuid: false });
        }
    });

    const uuidSegment = pathSnippets.filter((p) => p.looksLikeUuid);
    const nonUuidSegment = pathSnippets.filter((p) => !p.looksLikeUuid && p.segment !== 'parse-fail');
    console.log('\n--- http(s) URL path analysis ---');
    console.log('Path segment after /avatars/ (UUID = user folder = real upload):');
    console.log('  Looks like UUID (user id folder):', uuidSegment.length);
    console.log('  Not UUID (e.g. soup name or other):', nonUuidSegment.length);
    if (nonUuidSegment.length > 0) {
        const bySegment = {};
        nonUuidSegment.forEach((p) => { bySegment[p.segment] = (bySegment[p.segment] || 0) + 1; });
        console.log('  Non-UUID segment counts:', bySegment);
        console.log('  Example paths (non-UUID):');
        [...new Set(nonUuidSegment.map((p) => p.path))].slice(0, 8).forEach((path) => console.log('   ', path));
    }
    console.log('');
}

main();
