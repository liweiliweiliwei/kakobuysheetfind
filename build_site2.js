const fs = require('fs');
const path = require('path');

// 路径配置
const DATA_FILE = path.join(__dirname, '123.json');
const TEMPLATE_DIR = path.join(__dirname, 'template2');
const OUTPUT_DIR = path.join(__dirname, 'wangzhan2');

// SEO 配置
const SITE_DOMAIN = 'https://mulebuy-sheets.com';
const SITE_NAME = 'Mulebuy Sheets';

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
    console.log('开始生成静态网站（含元数据增强优化）...');

    // 1. 读取数据
    if (!fs.existsSync(DATA_FILE)) {
        console.error('错误: 找不到 123.json 数据文件');
        return;
    }
    const rawData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    // 2. 读取模板
    const indexTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'index.html'), 'utf-8');
    const productTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'product.html'), 'utf-8');

    // 复制静态资源
    copyFile(path.join(TEMPLATE_DIR, 'style.css'), path.join(OUTPUT_DIR, 'style.css'));
    if (fs.existsSync(path.join(TEMPLATE_DIR, 'favicon.ico'))) {
        copyFile(path.join(TEMPLATE_DIR, 'favicon.ico'), path.join(OUTPUT_DIR, 'favicon.ico'));
    }

    // 3. 构建 SLUG 映射表（用于内部链接）
    const slugMap = {};
    rawData.forEach((item, index) => {
        const slug = cleanSlug(item['SLUG']);
        slugMap[index] = slug ? `${slug}.html` : `product_${index}.html`;
    });

    // 4. 提取分类和品牌及其关系
    const categories = [...new Set(rawData.map(item => item['品类']))]
        .filter(Boolean)
        .sort((a, b) => {
            const isAOther = a.toLowerCase() === 'other';
            const isBOther = b.toLowerCase() === 'other';
            if (isAOther && !isBOther) return 1;
            if (!isAOther && isBOther) return -1;
            return a.localeCompare(b);
        });

    const brands = [...new Set(rawData.map(item => item['品牌']))]
        .filter(Boolean)
        .sort((a, b) => {
            const isAOther = a.toLowerCase() === 'other';
            const isBOther = b.toLowerCase() === 'other';
            if (isAOther && !isBOther) return 1;
            if (!isAOther && isBOther) return -1;
            return a.localeCompare(b);
        });

    // 映射品类与品牌的关系
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

    let categoryFiltersHtml = `<button class="filter-btn active" data-type="category" data-filter="all">All Categories</button>`;
    categories.forEach(cat => {
        categoryFiltersHtml += `<button class="filter-btn" data-type="category" data-filter="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
    });

    let brandFiltersHtml = `<button class="filter-btn active" data-type="brand" data-filter="all">All Brands</button>`;
    brands.forEach(brd => {
        const cats = Array.from(brandToCategories[brd] || []).join(',');
        brandFiltersHtml += `<button class="filter-btn" data-type="brand" data-filter="${escapeHtml(brd)}" data-categories="${escapeHtml(cats)}">${escapeHtml(brd)}</button>`;
    });

    let productCardsHtml = '';
    rawData.forEach((item, index) => {
        const productPage = slugMap[index];
        const formattedPrice = Number(item['美元'] || 0).toFixed(2);
        productCardsHtml += `
        <a href="/${productPage}" class="product-card" data-category="${escapeHtml(item['品类'])}" data-brand="${escapeHtml(item['品牌'])}">
            <div class="card-image-wrap">
                <img src="${escapeHtml(item['SKU图片地址'])}" alt="${escapeHtml(item['品牌'])} ${escapeHtml(item['Tittle'])} - Buy on ${SITE_NAME}" loading="lazy">
            </div>
            <div class="card-info">
                <p class="card-brand">${escapeHtml(item['品牌'])}</p>
                <h3 class="card-name">${escapeHtml(item['Tittle'])}</h3>
                <div class="card-bottom">
                    <p class="card-price">$${formattedPrice}</p>
                    <span class="view-details">View &#8594;</span>
                </div>
            </div>
        </a>`;
    });

    const indexMetaDesc = `Mulebuy Sheets is your free spreadsheet guide to the best replica fashion. Browse ${rawData.length}+ verified items from ${brands.slice(0, 6).join(', ')} and more — ${categories.slice(0, 5).join(', ')} at the lowest prices. Shop via Mulebuy, Kakobuy, Oopbuy and other trusted agents.`;
    const indexMetaKeywords = `mulebuy sheets, mulebuy spreadsheet, mulebuy-sheets.com, ${SITE_NAME}, kakobuy, replica fashion, ${categories.join(', ')}, ${brands.slice(0, 20).join(', ')}, designer replica, best replica site`;

    let finalIndexHtml = indexTemplate;
    finalIndexHtml = finalIndexHtml.replace('PLACEHOLDER_META_DESCRIPTION', escapeAttr(indexMetaDesc));
    finalIndexHtml = finalIndexHtml.replace('PLACEHOLDER_META_DESCRIPTION', escapeAttr(indexMetaDesc));
    finalIndexHtml = finalIndexHtml.replace('PLACEHOLDER_META_KEYWORDS', escapeAttr(indexMetaKeywords));

    const filterSectionRegex = /<section class="filters-section">[\s\S]*?<\/section>/;
    // 品牌行加 filter-group-brands，默认隐藏
    const newFilterSection = `<section class="filters-section"><div class="filter-group filter-group-cats">${categoryFiltersHtml}</div><div class="filter-group filter-group-brands">${brandFiltersHtml}</div></section>`;
    finalIndexHtml = finalIndexHtml.replace(filterSectionRegex, newFilterSection);

    const productGridRegex = /<section class="product-grid">[\s\S]*?<\/section>/;
    const newProductGridHtml = `<section class="product-grid">${productCardsHtml}</section>`;
    finalIndexHtml = finalIndexHtml.replace(productGridRegex, newProductGridHtml);

    // 构建描述字典用于客户端注入
    const categoryDescMap = {};
    const brandDescMap = {};
    rawData.forEach(item => {
        if (item['品类'] && item['品类英文描述']) categoryDescMap[item['品类']] = item['品类英文描述'];
        if (item['品牌'] && item['品牌英文描述']) brandDescMap[item['品牌']] = item['品牌英文描述'];
    });

    // 注入过滤脚本（包含品牌行展开逻辑）
    const filterScript = `<script>
    const categoryDescMap = ${JSON.stringify(categoryDescMap)};
    const brandDescMap = ${JSON.stringify(brandDescMap)};
    document.addEventListener('DOMContentLoaded', function() {
        const catBtns = document.querySelectorAll('.filter-btn[data-type="category"]');
        const brdBtns = document.querySelectorAll('.filter-btn[data-type="brand"]');
        const products = document.querySelectorAll('.product-card');
        const descEl = document.querySelector('.hero-description');
        const brandsRow = document.querySelector('.filter-group-brands');
        let currentCategory = 'all';
        let currentBrand = 'all';

        function updateDisplay() {
            const heroBg = document.querySelector('.hero-bg-text');
            const heroTitle = document.querySelector('.hero-title');
            heroBg.textContent = currentCategory === 'all' ? '${SITE_NAME}' : currentCategory;
            heroTitle.textContent = currentBrand === 'all' ? (currentCategory === 'all' ? '${SITE_NAME}' : currentCategory) : currentBrand;

            // 品牌行展开/收起
            if (brandsRow) {
                if (currentCategory !== 'all') {
                    brandsRow.classList.add('visible');
                } else {
                    brandsRow.classList.remove('visible');
                    // 收起时重置品牌选择
                    currentBrand = 'all';
                    brdBtns.forEach(b => b.classList.remove('active'));
                    const allBrdBtn = document.querySelector('.filter-btn[data-type="brand"][data-filter="all"]');
                    if (allBrdBtn) allBrdBtn.classList.add('active');
                }
            }

            if (descEl) {
                let descText = '';
                if (currentCategory === 'all' && currentBrand === 'all') {
                    descText = '';
                } else if (currentCategory === 'all' && currentBrand !== 'all') {
                    descText = brandDescMap[currentBrand] || '';
                } else if (currentCategory !== 'all' && currentBrand === 'all') {
                    descText = categoryDescMap[currentCategory] || '';
                } else {
                    descText = brandDescMap[currentBrand] || '';
                }
                if (descText) {
                    descEl.textContent = descText;
                    descEl.style.display = 'block';
                } else {
                    descEl.style.display = 'none';
                }
            }

            brdBtns.forEach(btn => {
                const filter = btn.getAttribute('data-filter');
                if (filter === 'all') { btn.style.display = 'block'; return; }
                const allowedCats = btn.getAttribute('data-categories').split(',');
                btn.style.display = (currentCategory === 'all' || allowedCats.includes(currentCategory)) ? 'block' : 'none';
            });

            products.forEach(card => {
                const catMatch = (currentCategory === 'all' || card.getAttribute('data-category') === currentCategory);
                const brdMatch = (currentBrand === 'all' || card.getAttribute('data-brand') === currentBrand);
                card.style.display = (catMatch && brdMatch) ? 'block' : 'none';
            });
        }

        [...catBtns, ...brdBtns].forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                (type === 'category' ? catBtns : brdBtns).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (type === 'category') currentCategory = btn.getAttribute('data-filter');
                else currentBrand = btn.getAttribute('data-filter');
                updateDisplay();
            });
        });
    });
    </script>`;
    finalIndexHtml = finalIndexHtml.replace('</body>', filterScript + '</body>');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), finalIndexHtml);

    // ==========================================
    // 6. 生成详情页
    // ==========================================
    const sitemapEntries = [{ url: `${SITE_DOMAIN}/`, priority: '1.0', changefreq: 'daily' }];

    rawData.forEach((item, index) => {
        const productPageName = slugMap[index];
        const buyUrl = `https://kakobuy.com/item/details?url=${encodeURIComponent(item['微店商品链接'])}&affcode=6phfk`;
        const formattedItemPrice = Number(item['美元'] || 0).toFixed(2);
        const canonicalUrl = `${SITE_DOMAIN}/${productPageName}`;
        
        const brand = item['品牌'] || '';
        const category = item['品类'] || '';
        const title = item['Tittle'] || '';
        const imageUrl = item['SKU图片地址'] || '';
        
        // 核心元数据增强
        const prodDesc = item['Description'] || '';
        const brandDesc = item['品牌英文描述'] || '';
        const categoryDesc = item['品类英文描述'] || '';
        const keywords = item['Keyword'] || '';
        const tags = item['TAG'] || '';

        sitemapEntries.push({ url: canonicalUrl, priority: '0.8', changefreq: 'weekly' });

        // 构建详细内容区块
        let detailsHtml = `
            <div class="product-details">
                <h4 class="detail-section-title">Product Description</h4>
                <div class="product-description-text" style="margin-bottom: 32px; line-height: 1.6; color: var(--text-muted); font-size: 0.95rem;">${escapeHtml(prodDesc)}</div>
                
                ${brandDesc ? `
                <h4 class="detail-section-title">About ${escapeHtml(brand)}</h4>
                <div class="brand-description-text" style="margin-bottom: 32px; line-height: 1.6; color: var(--text-muted); font-size: 0.9rem; font-style: italic; border-left: 2px solid var(--border-color); padding-left: 15px;">${escapeHtml(brandDesc)}</div>
                ` : ''}

                ${categoryDesc ? `
                <h4 class="detail-section-title">${escapeHtml(category)} Guide</h4>
                <div class="category-description-text" style="margin-bottom: 32px; line-height: 1.6; color: var(--text-muted); font-size: 0.85rem; opacity: 0.8;">${escapeHtml(categoryDesc)}</div>
                ` : ''}
            </div>`;

        // SEO Meta 优化
        const seoDesc = brandDesc ? `${escapeHtml(brand)} ${escapeHtml(title)}. ${brandDesc.substring(0, 150)}...` : escapeHtml(prodDesc);

        let finalProductHtml = productTemplate;
        finalProductHtml = finalProductHtml.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)} | ${escapeHtml(brand)} ${escapeHtml(category)} | ${SITE_NAME}</title>`);
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_META_DESCRIPTION', escapeAttr(seoDesc));
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_META_DESCRIPTION', escapeAttr(seoDesc));
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_META_KEYWORDS', escapeAttr(keywords));
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_CANONICAL_URL', canonicalUrl);
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_OG_TITLE', escapeAttr(`${title} - ${SITE_NAME}`));
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_OG_IMAGE', escapeAttr(imageUrl));
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_OG_URL', canonicalUrl);
        
        // JSON-LD
        const jsonLd = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": title,
            "description": prodDesc,
            "brand": { "@type": "Brand", "name": brand },
            "offers": { 
                "@type": "Offer", 
                "price": formattedItemPrice, 
                "priceCurrency": "USD", 
                "availability": "https://schema.org/InStock",
                "hasMerchantReturnPolicy": {
                    "@type": "MerchantReturnPolicy",
                    "applicableCountry": "US",
                    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                    "merchantReturnDays": 30,
                    "returnMethod": "https://schema.org/ReturnByMail",
                    "returnFees": "https://schema.org/FreeReturn"
                }
            }
        });
        finalProductHtml = finalProductHtml.replace('PLACEHOLDER_JSONLD', jsonLd);

        // 替换面包屑
        const breadcrumbHtml = `
                <nav class="breadcrumbs">
                    <a href="/index.html" class="breadcrumb-item">Home</a>
                    <span>/</span>
                    <span class="breadcrumb-item">${escapeHtml(category)}</span>
                    <span>/</span>
                    <span class="breadcrumb-current">${escapeHtml(title)}</span>
                </nav>`;
        finalProductHtml = finalProductHtml.replace(/<nav class="breadcrumbs">[\s\S]*?<\/nav>/, breadcrumbHtml);
        finalProductHtml = finalProductHtml.replace(/<div class="detail-image-box">[\s\S]*?<\/div>/, `<div class="detail-image-box"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}"></div>`);
        finalProductHtml = finalProductHtml.replace(/<p class="product-brand-tag">.*?<\/p>/, `<p class="product-brand-tag">${escapeHtml(brand)}</p>`);
        finalProductHtml = finalProductHtml.replace(/<h1 class="product-title">.*?<\/h1>/, `<h1 class="product-title">${escapeHtml(title)}</h1>`);
        finalProductHtml = finalProductHtml.replace(/<p class="product-price-large">.*?<\/p>/, `<p class="product-price-large">$${formattedItemPrice}</p>`);
        
        // 替换商品详情区域为我们构建的增强内容
        const detailSectionHtml = `
            <div class="product-details">
                ${detailsHtml}
            </div>`;
        const productDetailsRegex = /<div class="product-details">[\s\S]*?<\/div>(\s*<\/div>)?/; 
        finalProductHtml = finalProductHtml.replace(productDetailsRegex, detailSectionHtml);

        finalProductHtml = finalProductHtml.replace(/<button class="buy-now-btn">.*?<\/button>/, `<a href="${buyUrl}" target="_blank" class="buy-now-btn" style="text-decoration:none;display:flex;align-items:center;justify-content:center;">Buy On Kakobuy</a>`);

        // 替换推荐商品
        // 显示同一品类下的所有商品（排除当前商品）
        const recList = rawData.filter((p, i) => i !== index && p['品类'] === category);
        let recCardsHtml = '';
        recList.forEach(rec => {
            recCardsHtml += `
            <a href="/${slugMap[rawData.indexOf(rec)]}" class="rec-card">
                <div class="rec-image-box">
                    <img src="${escapeHtml(rec['SKU图片地址'])}" loading="lazy" alt="${escapeHtml(rec['Tittle'])}">
                </div>
                <div class="rec-info">
                    <p class="rec-brand">${escapeHtml(rec['品牌'])}</p>
                    <h3 class="rec-name">${escapeHtml(rec['Tittle'])}</h3>
                    <p class="rec-price">$${Number(rec['美元']).toFixed(2)}</p>
                </div>
            </a>`;
        });

        const newRecommendedSectionHtml = `
        <section class="recommended-section">
            <div class="container">
                <div class="recommended-header">
                    <h2 class="recommended-title">You May Also Like</h2>
                    <span class="recommended-sub">${escapeHtml(category)}</span>
                </div>
                <div class="rec-grid">
                    ${recCardsHtml}
                </div>
            </div>
        </section>`;
        
        const recommendedSectionRegex = /<section class="recommended-section">[\s\S]*?<\/section>/;
        finalProductHtml = finalProductHtml.replace(recommendedSectionRegex, newRecommendedSectionHtml);

        fs.writeFileSync(path.join(OUTPUT_DIR, productPageName), finalProductHtml);
    });

    // 生成 sitemap & robots
    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    sitemapEntries.forEach(e => sitemapXml += `<url><loc>${e.url}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`);
    sitemapXml += `</urlset>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemapXml);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_DOMAIN}/sitemap.xml`);

    console.log('🎉 包含元数据增强的网站构建已完成！');
}

buildSite();
