/**
 * Global configuration for Stream Types coming from the WordPress backend.
 * If the exact spelling of options changes in WordPress, update them here.
 */
export const STREAM_TYPES = {
    YOUTUBE: "youtube_live",
    EMBED: "embed_code",
    HLS: "hls",
    RTMP: "rtmp"
} as const;
