# Storefront image references

- `stussy-chapel-hill-logo.png` — active transparent header logo, extracted from the supplied Chapel Hill artwork.
- `stussy-wordmark.svg` — retained as the previous generic wordmark asset.
- Campaign, product, archive, and chapter imagery currently loads from the source site's Shopify CDN as temporary research placeholders.
- The ordered CDN references and storefront metadata are stored in `data/storefront.json`, `data/news.json`, and `data/chapters.json`.

If a remote image becomes unavailable, its media slot changes to the red missing-asset state without shifting the page layout.
