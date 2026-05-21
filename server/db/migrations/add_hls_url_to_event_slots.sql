-- Add HLS playback URL to event_slots.
-- Generated at approval time: https://live.studioflow.tv/hls/<stream_key>.m3u8

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS hls_url text;

NOTIFY pgrst, 'reload schema';
