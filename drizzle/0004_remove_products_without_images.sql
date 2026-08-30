DELETE FROM products
WHERE image_url IS NULL OR TRIM(image_url) = '';
