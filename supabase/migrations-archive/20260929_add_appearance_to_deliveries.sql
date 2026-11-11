-- Add appearance jsonb column to deliveries table for customizable client gallery presentation
ALTER TABLE public.deliveries
ADD COLUMN IF NOT EXISTS appearance jsonb DEFAULT '{
  "cardSize": "M",
  "aspectRatioSetting": "masonry",
  "thumbnailScale": "Fill",
  "showCardInfo": true,
  "watermarkMedia": true
}'::jsonb;

-- Comment for schema documentation
COMMENT ON COLUMN public.deliveries.appearance IS 'Customizable gallery appearance settings (card size, aspect ratio/masonry, thumbnail scaling, info display, watermarking)';
