async function saveProductsToCache(
    keyword,
    products
) {
    try {
        for (const product of products) {
            await pool.query(
                `
                INSERT INTO scraped_products (
                    product_key,
                    platform,
                    name,
                    price,
                    currency,
                    image,
                    url,
                    condition_name,
                    category,
                    location,
                    search_keyword,
                    score,
                    reason
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    price = VALUES(price),
                    currency = VALUES(currency),
                    image = VALUES(image),
                    url = VALUES(url),
                    condition_name = VALUES(condition_name),
                    category = VALUES(category),
                    location = VALUES(location),
                    score = VALUES(score),
                    reason = VALUES(reason),
                    updated_at = CURRENT_TIMESTAMP
                `,
                [
                    product.product_key,
                    product.platform,
                    product.name,
                    product.price,
                    product.currency,
                    product.image,
                    product.url,
                    product.condition_name,
                    product.category,
                    product.location,
                    keyword,
                    product.score || 0,
                    product.reason || null
                ]
            );
        }

        console.log(
            `Saved ${products.length} products to MySQL cache for "${keyword}"`
        );

    } catch (error) {
        console.error(
            "MySQL cache save error:",
            error.message
        );
    }
}