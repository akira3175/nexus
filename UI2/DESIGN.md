# Nexus UI2 — traditional menswear storefront

Nexus is a Vietnamese menswear and tailoring storefront. Its visual authority is the user-supplied Figma prototype: conventional tailoring-house composition, cream paper-like surfaces, a navy service strip, centered brand presence and restrained editorial photography. The implementation does not reuse the reference logo or its imagery.

- The page starts with a restrained 26 px navy delivery strip and a 74 px cream navigation band so the campaign photograph remains dominant.
- Desktop navigation uses a fashion-house composition: Nexus wordmark left, four primary links centered, and monoline search, wishlist, cart and account actions right.
- Primary navigation uses four standalone routes—Home, Collection, About and Contact—rather than in-page anchor scrolling; each route carries its own active state while sharing the same header and footer.
- Customer login and registration use the same cream, navy and tailoring photography as the storefront. The static prototype stores customer accounts locally and has no administration surface.
- Hero copy is centered in the reference's left field and held to two lines. The model is enlarged and cropped against the right edge, with one outlined action below the supporting sentence.
- Cream `#f6f0e2` is the main ground; navy `#394768` carries service, active and footer surfaces. Controls use fine navy borders without glow, gradients or glass effects.
- Product photography uses a consistent warm-cream studio background and fills catalogue media areas. Wishlist and quick-view controls remain separately operable.
- The desktop catalogue is a restrained four-column lookbook; cards show only the product image, name, category and price. Promotional badges, review furniture, descriptions and repeated purchase buttons do not appear in the listing. Tablet uses two columns and phone uses one.
- The homepage collection is a narrower preview without category or sorting controls and ends its heading row with a direct “Xem thêm” route. Full filtering and a dedicated product search live only on the standalone Collection page.
- The lower editorial section is a warm-cream introduction block with a real tailoring-work photograph and concise company copy. A large navy maker plaque sits centered beneath the two-column composition without obscuring either side.
- The footer is a spacious navy three-column composition with large serif headings, restrained white links, a horizontal divider and centered copyright line.
- Product detail pages use a two-column image-and-purchase layout on desktop and a single linear flow on mobile. Product name, current price, description, quantity and purchase actions lead; unsupported reviews, discounts, scarcity and gift claims are not shown.
- Shared styling lives in `boutique.css`. Homepage rules are scoped under `.home-page`; product, cart, checkout and invoice share `.menswear-page`.
- Product truth is size, fit, fabric, colour, detail and care. The interface does not show fabricated reviews, awards or provenance claims.

Validation: JavaScript syntax checked. The homepage rendered four products at 1440×1000 and 390×844 with measured scroll width equal to client width at both sizes. The mechanical detector ran in degraded regex mode because its optional HTML parser modules were unavailable.
