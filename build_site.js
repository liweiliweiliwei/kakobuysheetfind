const fs = require('fs');
const path = require('path');

// 路径配置
const DATA_FILE = path.join(__dirname, '123.json');
const TEMPLATE_DIR = path.join(__dirname, 'template');
const OUTPUT_DIR = path.join(__dirname, 'wangzhan');

// SEO 配置
const SITE_DOMAIN = 'https://kakobuysheetfind.org';
const SITE_NAME = 'Kakobuysheetfind';

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// 辅助函数：复制文件
function copyFile(src, dest) {
    fs.copyFileSync(src, dest);
}

// 辅助函数：生成安全的 HTML 字符串
function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 辅助函数：清理 SLUG（移除空格，转小写）
function cleanSlug(slug) {
    if (!slug) return '';
    return slug.toString().trim().toLowerCase().replace(/\s+/g, '-');
}

// 辅助函数：为 JSON-LD 转义字符串中的双引号
function escapeJsonLd(text) {
    if (!text) return '';
    return text.toString().replace(/"/g, '\\"').replace(/\n/g, ' ');
}

// 辅助函数：为 meta 属性转义引号
function escapeAttr(text) {
    if (!text) return '';
    return text.toString().replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function buildSite() {
    console.log('开始生成静态网站（含 SEO 优化）...');

    // 1. 读取数据
    if (!fs.existsSync(DATA_FILE)) {
        console.error('错误: 找不到 123.json 数据文件');
        return;
    }
    const rawData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    // 2. 读取模板
    const indexTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'index.html'), 'utf-8');
    const productTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'product.html'), 'utf-8');

    // 复制 CSS
    copyFile(path.join(TEMPLATE_DIR, 'style.css'), path.join(OUTPUT_DIR, 'style.css'));

    // 3. 构建 SLUG 映射表（用于内部链接）
    const slugMap = {};
    rawData.forEach((item, index) => {
        const slug = cleanSlug(item['SLUG']);
        slugMap[index] = slug ? `${slug}.html` : `product_${index}.html`;
    });

    // 4. 提取分类和品牌及其关系
    const categories = [...new Set(rawData.map(item => item['品类']))].filter(Boolean);
    const brands = [...new Set(rawData.map(item => item['品牌']))].filter(Boolean);

    // 映射品类与品牌的关系：每个品牌属于哪些品类
    const brandToCategories = {};
    rawData.forEach(item => {
        const brd = item['品牌'];
        const cat = item['品类'];
        if (brd && cat) {
            if (!brandToCategories[brd]) brandToCategories[brd] = new Set();
            brandToCategories[brd].add(cat);
        }
    });

    // ==========================================
    // 5. 生成首页
    // ==========================================

    // a. 生成分类过滤器
    let categoryFiltersHtml = `<button class="filter-btn active" data-type="category" data-filter="all">All Categories</button>`;
    categories.forEach(cat => {
        categoryFiltersHtml += `<button class="filter-btn" data-type="category" data-filter="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
    });

    // b. 生成品牌过滤器
    let brandFiltersHtml = `<button class="filter-btn active" data-type="brand" data-filter="all">All Brands</button>`;
    brands.forEach(brd => {
        const cats = Array.from(brandToCategories[brd] || []).join(',');
        brandFiltersHtml += `<button class="filter-btn" data-type="brand" data-filter="${escapeHtml(brd)}" data-categories="${escapeHtml(cats)}">${escapeHtml(brd)}</button>`;
    });

    // c. 生成商品网格（使用 SLUG 链接）
    let productCardsHtml = '';
    rawData.forEach((item, index) => {
        const productPage = slugMap[index];
        const formattedPrice = Number(item['美元'] || 0).toFixed(2);
        productCardsHtml += `
        <a href="${productPage}" class="product-card" data-category="${escapeHtml(item['品类'])}" data-brand="${escapeHtml(item['品牌'])}">
            <div class="card-image-wrap">
                <img src="${escapeHtml(item['SKU图片地址'])}" alt="${escapeHtml(item['品牌'])} ${escapeHtml(item['Tittle'])} - Buy on ${SITE_NAME}" loading="lazy">
            </div>
            <div class="card-info">
                <p class="card-brand">${escapeHtml(item['品牌'])}</p>
                <h3 class="card-name">${escapeHtml(item['Tittle'])}</h3>
                <div class="card-bottom">
                    <p class="card-price">$${formattedPrice}</p>
                    <span class="view-details">View Details</span>
                </div>
            </div>
        </a>`;
    });

    // d. 首页 SEO meta 数据
    const indexMetaDesc = `Shop ${rawData.length}+ premium designer items from ${brands.slice(0, 8).join(', ')} and more. Best deals on ${categories.join(', ')} at ${SITE_NAME}. Verified quality, global shipping.`;
    const indexMetaKeywords = `${SITE_NAME}, kakobuy, kakobuy spreadsheet, kakobuysheetfind, kakobuysheetfind2026, ${categories.join(', ')}, ${brands.slice(0, 15).join(', ')}, best replica, designer fashion deals`;

    // 替换首页模板中的内容
    let finalIndexHtml = indexTemplate;

    // 替换首页 meta 标签
    finalIndexHtml = finalIndexHtml.replace('PLACEHOLDER_META_DESCRIPTION', escapeAttr(indexMetaDesc));
    finalIndexHtml = finalIndexHtml.replace('PLACEHOLDER_META_DESCRIPTION', escapeAttr(indexMetaDesc)); // OG 也要替
    finalIndexHtml = finalIndexHtml.replace('PLACEHOLDER_META_KEYWORDS', escapeAttr(indexMetaKeywords));

    // 替换过滤器区域
    const filterSectionRegex = /<section class="filters-section">[\s\S]*?<\/section>/;
    const newFilterSection = `
            <section class="filters-section">
                <div class="filter-group">
                    ${categoryFiltersHtml}
                </div>
                <div class="filter-group">
                    ${brandFiltersHtml}
                </div>
            </section>`;
    finalIndexHtml = finalIndexHtml.replace(filterSectionRegex, newFilterSection);

    // 替换商品网格
    const productGridRegex = /<section class="product-grid">[\s\S]*?<\/section>/;
    const newProductGridHtml = `<section class="product-grid">${productCardsHtml}</section>`;
    finalIndexHtml = finalIndexHtml.replace(productGridRegex, newProductGridHtml);

    // 注入客户端过滤脚本
    const filterScript = `
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const catBtns = document.querySelectorAll('.filter-btn[data-type="category"]');
        const brdBtns = document.querySelectorAll('.filter-btn[data-type="brand"]');
        const products = document.querySelectorAll('.product-card');

        let currentCategory = 'all';
        let currentBrand = 'all';

        function updateDisplay() {
            // 更新 Hero Section 文本
            const heroBg = document.querySelector('.hero-bg-text');
            const heroTitle = document.querySelector('.hero-title');
            
            if (currentCategory === 'all') {
                heroBg.textContent = '${SITE_NAME}';
            } else {
                heroBg.textContent = currentCategory;
            }

            if (currentBrand === 'all') {
                heroTitle.textContent = currentCategory === 'all' ? 'Premium Drop' : currentCategory;
            } else {
                heroTitle.textContent = currentBrand;
            }

            // 筛选品牌按钮
            brdBtns.forEach(btn => {
                const filter = btn.getAttribute('data-filter');
                if (filter === 'all') {
                    btn.style.display = 'block';
                    return;
                }
                const allowedCats = btn.getAttribute('data-categories').split(',');
                if (currentCategory === 'all' || allowedCats.includes(currentCategory)) {
                    btn.style.display = 'block';
                } else {
                    btn.style.display = 'none';
                    if (currentBrand === filter) {
                        currentBrand = 'all';
                        brdBtns.forEach(b => b.classList.remove('active'));
                        document.querySelector('.filter-btn[data-type="brand"][data-filter="all"]').classList.add('active');
                    }
                }
            });

            // 筛选商品
            products.forEach(card => {
                const cat = card.getAttribute('data-category');
                const brd = card.getAttribute('data-brand');
                
                const catMatch = (currentCategory === 'all' || cat === currentCategory);
                const brdMatch = (currentBrand === 'all' || brd === currentBrand);

                if (catMatch && brdMatch) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        catBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                catBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCategory = btn.getAttribute('data-filter');
                updateDisplay();
            });
        });

        brdBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                brdBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentBrand = btn.getAttribute('data-filter');
                updateDisplay();
            });
        });
    });
    </script>
    `;

    finalIndexHtml = finalIndexHtml.replace('</body>', filterScript + '</body>');

    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), finalIndexHtml);
    console.log('✅ 首页 index.html 生成完成（含 SEO meta 标签）');

    // ==========================================
    // 6. 生成详情页
    // ==========================================
    const sitemapEntries = [];
    sitemapEntries.push({ url: `${SITE_DOMAIN}/`, priority: '1.0', changefreq: 'daily' });

    rawData.forEach((item, index) => {
        const productPageName = slugMap[index];
        const buyUrl = `https://kakobuy.com/item/details?url=${encodeURIComponent(item['微店商品链接'])}`;
        const formattedItemPrice = Number(item['美元'] || 0).toFixed(2);
        const canonicalUrl = `${SITE_DOMAIN}/${productPageName}`;
        const description = item['Description'] || '';
        const keywords = item['Keyword'] || '';
        const tags = item['TAG'] || '';
        const brand = item['品牌'] || '';
        const category = item['品类'] || '';
        const title = item['Tittle'] || '';
        const imageUrl = item['SKU图片地址'] || '';

        // 添加到 sitemap
        sitemapEntries.push({ url: canonicalUrl, priority: '0.8', changefreq: 'weekly' });

        // 推荐商品逻辑：显示所有商品（排除当前商品）
        const recommendations = rawData.filter((p, i) => i !== index);

        let recHtml = '';
        recommendations.forEach((rec) => {
            const originalIndex = rawData.indexOf(rec);
            const formattedRecPrice = Number(rec['美元'] || 0).toFixed(2);
            const recPageName = slugMap[originalIndex];
            recHtml += `
            <a href="${recPageName}" class="rec-card">
                <div class="rec-image-box">
                    <img src="${escapeHtml(rec['SKU图片地址'])}" alt="${escapeHtml(rec['品牌'])} ${escapeHtml(rec['Tittle'])}" loading="lazy">
                </div>
                <p class="rec-brand">${escapeHtml(rec['品牌'])}</p>
                <h3 class="rec-name">${escapeHtml(rec['Tittle'])}</h3>
                <p class="rec-price">$${formattedRecPrice}</p>
            </a>`;
        });

        // 生成 TAG 标签 HTML
        let tagsHtml = '';
        if (tags) {
            const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
            if (tagList.length > 0) {
                tagsHtml = `<div class="product-tags" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;">`;
                tagList.forEach(tag => {
                    tagsHtml += `<span style="display:inline-block;padding:4px 12px;background:#f3f4f6;border-radius:9999px;font-size:12px;color:#6b7280;font-weight:500;">${escapeHtml(tag)}</span>`;
                });
                tagsHtml += `</div>`;
            }
        }

        // 生成 JSON-LD 结构化数据（Product Schema）
        const jsonLd = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": title,
            "description": description,
            "image": imageUrl,
            "brand": {
                "@type": "Brand",
                "name": brand
            },
            "category": category,
            "offers": {
                "@type": "Offer",
                "url": canonicalUrl,
                "priceCurrency": "USD",
                "price": formattedItemPrice,
                "availability": "https://schema.org/InStock",
                "seller": {
                    "@type": "Organization",
                    "name": SITE_NAME
                }
            }
        });

        let finalProductHtml = productTemplate;

        // 替换标题
        finalProductHtml = finalProductHtml.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)} | ${SITE_NAME} - Buy ${escapeHtml(brand)} ${escapeHtml(category)}</title>`);

        // 替换 SEO meta 占位符
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_META_DESCRIPTION', escapeAttr(description));
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_META_KEYWORDS', escapeAttr(keywords));
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_CANONICAL_URL', canonicalUrl);

        // 替换 Open Graph 占位符
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_OG_TITLE', escapeAttr(`${title} | ${SITE_NAME}`));
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_OG_DESCRIPTION', escapeAttr(description));
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_OG_IMAGE', escapeAttr(imageUrl));
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_OG_URL', canonicalUrl);

        // 替换 JSON-LD 占位符
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_JSONLD', jsonLd);

        // 替换面包屑
        const breadcrumbHtml = `
                <a href="index.html" class="breadcrumb-item">Home</a>
                <span>/</span>
                <span class="breadcrumb-item">${escapeHtml(category)}</span>
                <span>/</span>
                <span class="breadcrumb-current">${escapeHtml(title)}</span>`;
        finalProductHtml = finalProductHtml.replace(/<nav class="breadcrumbs">[\s\S]*?<\/nav>/, `<nav class="breadcrumbs">${breadcrumbHtml}</nav>`);

        // 替换主要内容
        finalProductHtml = finalProductHtml.replace(/<div class="detail-image-box">[\s\S]*?<\/div>/, `
                <div class="detail-image-box">
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(brand)} ${escapeHtml(title)} - ${escapeHtml(category)} on ${SITE_NAME}">
                </div>`);
        
        finalProductHtml = finalProductHtml.replace(/<p class="product-brand-tag">.*?<\/p>/, `<p class="product-brand-tag">${escapeHtml(brand)}</p>`);
        finalProductHtml = finalProductHtml.replace(/<h1 class="product-title">.*?<\/h1>/, `<h1 class="product-title">${escapeHtml(title)}</h1>`);
        finalProductHtml = finalProductHtml.replace(/<p class="product-price-large">.*?<\/p>/, `<p class="product-price-large">$${formattedItemPrice}</p>${tagsHtml}`);
        
        // 替换描述 (Description)
        const descriptionHtml = `<div class="product-description-text" style="margin-top: 20px; line-height: 1.6; color: var(--text-muted); font-size: 0.95rem;">${escapeHtml(description)}</div>`;
        const productDetailsRegex = /<div class="product-details">[\s\S]*?<\/ul>[\s\S]*?<\/div>/;
        finalProductHtml = finalProductHtml.replace(productDetailsRegex, `
                    <div class="product-details">
                        <h4 class="detail-section-title">Product Details</h4>
                        ${descriptionHtml}
                    </div>`);

        // 替换按钮链接
        finalProductHtml = finalProductHtml.replace(/<button class="buy-now-btn">.*?<\/button>/, `<a href="${buyUrl}" target="_blank" class="buy-now-btn" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">Buy on ${SITE_NAME}</a>`);

        // 替换推荐商品
        const recommendedSectionRegex = /<section class="recommended-section">[\s\S]*?<\/section>/;
        const newRecommendedSectionHtml = `
        <section class="recommended-section">
            <div class="container">
                <h2 class="recommended-title">Recommended Products</h2>
                <div class="rec-grid">
                    ${recHtml}
                </div>
            </div>
        </section>`;
        finalProductHtml = finalProductHtml.replace(recommendedSectionRegex, newRecommendedSectionHtml);

        fs.writeFileSync(path.join(OUTPUT_DIR, productPageName), finalProductHtml);
    });

    console.log(`✅ 详情页生成完成，共生成 ${rawData.length} 个页面（使用 SLUG 文件名）`);

    // ==========================================
    // 7. 生成 sitemap.xml
    // ==========================================
    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
    sitemapEntries.forEach(entry => {
        sitemapXml += `  <url>
    <loc>${entry.url}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>
`;
    });
    sitemapXml += `</urlset>`;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemapXml);
    console.log(`✅ sitemap.xml 生成完成，共 ${sitemapEntries.length} 个 URL`);

    // ==========================================
    // 8. 生成 robots.txt
    // ==========================================
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_DOMAIN}/sitemap.xml
`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), robotsTxt);
    console.log('✅ robots.txt 生成完成');

    console.log('🎉 所有任务已完成！页面存放在 wangzhan 文件夹中。');
}

buildSite();
