const fs = require('fs');
const path = require('path');

const wangzhanDir = path.join(__dirname, 'wangzhan');
const baseUrl = 'https://kakobuysheetfind.org';

function getFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            getFiles(fullPath, files);
        } else if (entry.name.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    return files;
}

function fixSeo(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    let modified = false;

    // 提取产品名称（从文件名或title）
    const titleMatch = content.match(/<title>([^<]+)<\/title>/);
    const productName = titleMatch ? titleMatch[1].split('|')[0].trim() : filename.replace('.html', '').replace(/-/g, ' ');

    // 提取描述
    const descMatch = content.match(/<meta name="description" content="([^"]+)"/);
    const description = descMatch ? descMatch[1] : `${productName}. Premium quality products at unbeatable prices. Shop now on Kakobuysheetfind!`;

    // 提取图片URL用于Twitter Card
    const ogImageMatch = content.match(/<meta property="og:image" content="([^"]+)"/);
    const imageUrl = ogImageMatch ? ogImageMatch[1] : '';

    // 1. 添加 Twitter Card 标签（如果不存在）
    if (!content.includes('twitter:card')) {
        const twitterImageTag = imageUrl ? `\n    <meta name="twitter:image" content="${imageUrl}">` : '';
        const twitterTags = `
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${productName}">
    <meta name="twitter:description" content="${description.substring(0, 200)}">${twitterImageTag}`;

        content = content.replace('</head>', twitterTags + '\n</head>');
        modified = true;
    }

    // 2. 添加 Keywords 标签（如果不存在）
    if (!content.includes('name="keywords"')) {
        // 从产品名称生成关键词
        const keywords = productName.split(/[\s\-|,]+/).filter(k => k.length > 2).slice(0, 8).join(', ');
        const keywordsTag = `\n    <meta name="keywords" content="${keywords}, buy, price, discount, online shop, Kakobuysheetfind">`;

        content = content.replace('</head>', keywordsTag + '\n</head>');
        modified = true;
    }

    // 3. 添加 Author 标签（如果不存在）
    if (!content.includes('name="author"')) {
        const authorTag = `\n    <meta name="author" content="Kakobuysheetfind">`;
        content = content.replace('</head>', authorTag + '\n</head>');
        modified = true;
    }

    // 4. 添加 Robots 标签（如果不存在）
    if (!content.includes('name="robots"')) {
        const robotsTag = `\n    <meta name="robots" content="index, follow">`;
        content = content.replace('</head>', robotsTag + '\n</head>');
        modified = true;
    }

    // 5. 添加 Geo 标签（如果不存在）
    if (!content.includes('geo.region')) {
        const geoTag = `\n    <meta name="geo.region" content="US">`;
        content = content.replace('</head>', geoTag + '\n</head>');
        modified = true;
    }

    // 6. 修复 Open Graph 描述（如果是 PLACEHOLDER）
    if (content.includes('PLACEHOLDER_OG_DESCRIPTION')) {
        content = content.replace('PLACEHOLDER_OG_DESCRIPTION', description.substring(0, 200));
        modified = true;
    }

    // 7. 更新 Canonical URL（去掉 .html 后缀，添加斜杠）
    const canonicalMatch = content.match(/<link rel="canonical" href="([^"]+)"/);
    if (canonicalMatch && canonicalMatch[1].includes('.html')) {
        const newCanonical = canonicalMatch[1].replace('.html', '/');
        content = content.replace(canonicalMatch[0], `<link rel="canonical" href="${newCanonical}"`);
        modified = true;
    }

    // 8. 更新 Open Graph URL（去掉 .html 后缀，添加斜杠）
    const ogUrlMatch = content.match(/<meta property="og:url" content="([^"]+)"/);
    if (ogUrlMatch && ogUrlMatch[1].includes('.html')) {
        const newOgUrl = ogUrlMatch[1].replace('.html', '/');
        content = content.replace(ogUrlMatch[0], `<meta property="og:url" content="${newOgUrl}"`);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Fixed: ${filename}`);
        return true;
    }
    return false;
}

console.log('Starting comprehensive SEO optimization for wangzhan folder...\n');
const files = getFiles(wangzhanDir);
console.log(`Found ${files.length} HTML files\n`);

let fixedCount = 0;
for (const file of files) {
    if (fixSeo(file)) {
        fixedCount++;
    }
}

console.log(`\nSEO optimization complete!`);
console.log(`Fixed ${fixedCount} files out of ${files.length} files`);
