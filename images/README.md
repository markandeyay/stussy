# Storefront image references

- `stussy-square-logo.png` — active transparent header logo, extracted from the supplied square artwork.
- `stussy-chapel-hill-logo.png` — retained as the previous Chapel Hill header logo.
- `stussy-wordmark.svg` — retained as the previous generic wordmark asset.
- `chapel-hill-tee-back.png` — local homepage carousel image supplied for the Chapel Hill T-shirt.
- Campaign, product, archive, and chapter imagery currently loads from the source site's Shopify CDN as temporary research placeholders.
- The ordered CDN references and storefront metadata are stored in `data/storefront.json`, `data/news.json`, and `data/chapters.json`.

If a remote image becomes unavailable, its media slot changes to the red missing-asset state without shifting the page layout.
