import { KLIPY_SEARCH_MAX_QUERY_LENGTH } from '../constants.js';
const KLIPY_BASE = 'https://api.klipy.com/api/v1';
const GIF_SIZE_ORDER = ['sm', 'md', 'xs', 'hd'];
const PREVIEW_SIZE_ORDER = ['xs', 'sm', 'md', 'hd'];
function getApiKey() {
    const key = process.env.KLIPY_API_KEY;
    if (!key || key === 'paste-your-klipy-api-key-here') {
        throw new Error('KLIPY_API_KEY is not configured');
    }
    return key;
}
function readMediaFile(entry) {
    if (!entry || typeof entry !== 'object')
        return null;
    const file = entry;
    const url = typeof file.url === 'string' ? file.url : null;
    if (!url)
        return null;
    return {
        url,
        width: Number(file.width) || 0,
        height: Number(file.height) || 0,
    };
}
function pickFromKlipyFile(fileRoot) {
    let gif = null;
    let preview = null;
    for (const size of GIF_SIZE_ORDER) {
        const sizeEntry = fileRoot[size];
        if (!sizeEntry || typeof sizeEntry !== 'object')
            continue;
        const formats = sizeEntry;
        if (!gif) {
            gif = readMediaFile(formats.gif) ?? readMediaFile(formats.mp4);
        }
    }
    for (const size of PREVIEW_SIZE_ORDER) {
        const sizeEntry = fileRoot[size];
        if (!sizeEntry || typeof sizeEntry !== 'object')
            continue;
        const formats = sizeEntry;
        if (!preview) {
            preview =
                readMediaFile(formats.webp) ??
                    readMediaFile(formats.jpg) ??
                    readMediaFile(formats.gif);
        }
    }
    if (!gif)
        return null;
    return {
        gifUrl: gif.url,
        previewUrl: preview?.url ?? gif.url,
        width: gif.width,
        height: gif.height,
    };
}
function pickFromLegacyFiles(files) {
    let gif = null;
    let preview = null;
    for (const key of ['gif', 'mediumgif', 'tinygif', 'nanogif', 'webp', 'mp4']) {
        const media = readMediaFile(files[key]);
        if (!media)
            continue;
        if (!gif && ['gif', 'mediumgif', 'mp4'].includes(key))
            gif = media;
        if (!preview && ['tinygif', 'nanogif', 'webp', 'gif'].includes(key))
            preview = media;
    }
    if (!gif)
        gif = readMediaFile(files.gif);
    if (!gif)
        return null;
    return {
        gifUrl: gif.url,
        previewUrl: preview?.url ?? gif.url,
        width: gif.width,
        height: gif.height,
    };
}
function mapGifItem(raw) {
    const itemType = String(raw.type ?? 'gif').toLowerCase();
    if (itemType !== 'gif')
        return null;
    const id = String(raw.id ?? '');
    if (!id)
        return null;
    const fileRoot = raw.file;
    const legacyFiles = raw.files;
    const media = fileRoot
        ? pickFromKlipyFile(fileRoot)
        : legacyFiles
            ? pickFromLegacyFiles(legacyFiles)
            : null;
    if (!media)
        return null;
    const blurPreview = typeof raw.blur_preview === 'string' && raw.blur_preview.length > 0
        ? raw.blur_preview
        : null;
    return {
        id,
        slug: String(raw.slug ?? id),
        title: String(raw.title ?? raw.content_description ?? ''),
        previewUrl: media.previewUrl ?? blurPreview ?? media.gifUrl,
        gifUrl: media.gifUrl,
        width: media.width,
        height: media.height,
    };
}
function extractGifList(payload) {
    if (Array.isArray(payload.data)) {
        return payload.data;
    }
    if (Array.isArray(payload.results)) {
        return payload.results;
    }
    if (Array.isArray(payload)) {
        return payload;
    }
    return [];
}
function parseListResponse(data) {
    const root = data;
    const payload = root.data ?? root;
    const list = extractGifList(payload);
    const items = list
        .map((item) => mapGifItem(item))
        .filter((item) => item !== null);
    return {
        items,
        page: Number(payload.current_page ?? payload.page ?? 1),
        perPage: Number(payload.per_page ?? items.length),
        hasNext: Boolean(payload.has_next ?? payload.hasNext ?? false),
    };
}
function parseSingleResponse(data) {
    const root = data;
    const payload = root.data;
    if (!payload || typeof payload !== 'object')
        return null;
    const record = payload;
    if (Array.isArray(record.data) && record.data[0]) {
        return mapGifItem(record.data[0]);
    }
    if (record.id || record.file || record.files) {
        return mapGifItem(record);
    }
    return null;
}
async function klipyFetch(path, params) {
    const apiKey = getApiKey();
    const search = new URLSearchParams(params);
    const query = search.toString();
    const url = query ? `${KLIPY_BASE}/${apiKey}${path}?${query}` : `${KLIPY_BASE}/${apiKey}${path}`;
    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
        throw new Error(`Klipy API error (${response.status})`);
    }
    return response.json();
}
export async function searchKlipyGifs(options) {
    const params = {
        per_page: String(Math.max(8, options.perPage ?? 20)),
        page: String(options.page ?? 1),
        rating: 'g',
        locale: 'us_US',
    };
    if (options.query?.trim()) {
        params.q = options.query.trim().slice(0, KLIPY_SEARCH_MAX_QUERY_LENGTH);
        const data = await klipyFetch('/gifs/search', params);
        return parseListResponse(data);
    }
    const data = await klipyFetch('/gifs/trending', params);
    return parseListResponse(data);
}
export async function getKlipyGifById(externalId) {
    try {
        const data = await klipyFetch(`/gifs/${encodeURIComponent(externalId)}`, {});
        return parseSingleResponse(data);
    }
    catch {
        return null;
    }
}
export function isKlipyConfigured() {
    const key = process.env.KLIPY_API_KEY;
    return Boolean(key && key !== 'paste-your-klipy-api-key-here');
}
