const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 配置文件路径
const goodsDirPath = path.join(__dirname, 'goods');
const brandFilePath = path.join(__dirname, 'branch.xlsx');
const categoryFilePath = path.join(__dirname, 'pinlei.xlsx');
const outputFilePath = path.join(__dirname, '123.json');

/**
 * 拼写纠错映射表 (归一化格式)
 * 用于处理主表中的常见拼写错误，使其能够匹配元数据表
 */
const typoCorrections = {
    // 品类纠错
    'hoodes': 'hoodies',
    
    // 品牌纠错
    'cortiez': 'corteiz',
    'superme': 'supreme',
    'hommyhilfiger': 'tommyhilfiger',
    'cel': 'celine',
    'offwhite': 'offwhite' 
};

/**
 * 规范化键值，用于提高匹配成功率
 * 去除所有非字母数字字符，并转为小写
 */
function normalizeKey(str) {
    if (!str) return '';
    let key = str.toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    
    // 应用拼写纠错
    return typoCorrections[key] || key;
}

try {
    // 检查文件/目录是否存在
    const filesToCheck = [
        { path: goodsDirPath, name: '商品文件夹' },
        { path: brandFilePath, name: '品牌表' },
        { path: categoryFilePath, name: '品类表' }
    ];

    filesToCheck.forEach(file => {
        if (!fs.existsSync(file.path)) {
            console.error(`错误: 找不到${file.name}文件: ${file.path}`);
            process.exit(1);
        }
    });

    // 1. 读取品牌元数据 (branch.xlsx)
    console.log(`正在读取品牌文件: ${brandFilePath}`);
    const brandWorkbook = XLSX.readFile(brandFilePath);
    const brandSheet = brandWorkbook.Sheets[brandWorkbook.SheetNames[0]];
    const brandData = XLSX.utils.sheet_to_json(brandSheet);

    const brandMap = new Map();
    brandData.forEach(item => {
        if (item['品牌名称']) {
            const key = normalizeKey(item['品牌名称']);
            brandMap.set(key, {
                originalName: item['品牌名称'],
                slug: item['slug'] || '',
                description: item['英文描述'] || ''
            });
        }
    });
    console.log(`成功加载 ${brandMap.size} 个品牌元数据`);

    // 2. 读取品类元数据 (pinlei.xlsx)
    console.log(`正在读取品类文件: ${categoryFilePath}`);
    const categoryWorkbook = XLSX.readFile(categoryFilePath);
    const categorySheet = categoryWorkbook.Sheets[categoryWorkbook.SheetNames[0]];
    const categoryData = XLSX.utils.sheet_to_json(categorySheet);

    const categoryMap = new Map();
    categoryData.forEach(item => {
        if (item['分类名称']) {
            const key = normalizeKey(item['分类名称']);
            categoryMap.set(key, {
                originalName: item['分类名称'],
                slug: item['slug'] || '',
                description: item['品类英文描述'] || ''
            });
        }
    });
    console.log(`成功加载 ${categoryMap.size} 个品类元数据`);

    // 3. 读取 goods 文件夹下的所有商品表
    console.log(`正在读取商品文件夹: ${goodsDirPath}`);
    let jsonData = [];
    const files = fs.readdirSync(goodsDirPath);
    // 过滤出 .xlsx 文件，且排除以 ~$ 开头的临时隐藏文件
    const xlsxFiles = files.filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
    
    if (xlsxFiles.length === 0) {
        console.warn(`警告: ${goodsDirPath} 中没有找到.xlsx商品文件`);
    }

    xlsxFiles.forEach(file => {
        const filePath = path.join(goodsDirPath, file);
        console.log(`  -> 读取商品文件: ${file}`);
        try {
            const workbook = XLSX.readFile(filePath);
            const worksheetName = workbook.SheetNames[0];
            if (worksheetName) {
                const worksheet = workbook.Sheets[worksheetName];
                const sheetData = XLSX.utils.sheet_to_json(worksheet);
                jsonData = jsonData.concat(sheetData);
            }
        } catch (err) {
            console.error(`读取文件 ${file} 时遇到错误:`, err);
        }
    });
    console.log(`成功加载所有商品文件，共计读取 ${jsonData.length} 条数据。`);

    // 4. 计算关联整合（含纠错逻辑）
    console.log(`正在执行优化后的关联逻辑...`);
    let brandMatchedCount = 0;
    let categoryMatchedCount = 0;
    const unmatchedBrands = new Set();
    const unmatchedCategories = new Set();

    const enrichedData = jsonData.map(item => {
        const result = { ...item };

        // 关联品牌
        const rawBrand = (item['品牌'] || '').toString();
        const brandKey = normalizeKey(rawBrand);
        const brandInfo = brandMap.get(brandKey);
        if (brandInfo) {
            brandMatchedCount++;
            result['品牌slug'] = brandInfo.slug;
            result['品牌英文描述'] = brandInfo.description;
        } else {
            if (rawBrand.trim()) unmatchedBrands.add(rawBrand.trim());
            result['品牌slug'] = '';
            result['品牌英文描述'] = '';
        }

        // 关联品类
        const rawCategory = (item['品类'] || '').toString();
        const categoryKey = normalizeKey(rawCategory);
        const categoryInfo = categoryMap.get(categoryKey);
        if (categoryInfo) {
            categoryMatchedCount++;
            result['品类slug'] = categoryInfo.slug;
            result['品类英文描述'] = categoryInfo.description;
        } else {
            if (rawCategory.trim()) unmatchedCategories.add(rawCategory.trim());
            result['品类slug'] = '';
            result['品类英文描述'] = '';
        }

        return result;
    });

    console.log(`数据关联完成！`);
    console.log(`- 品牌匹配成功: ${brandMatchedCount}/${enrichedData.length}`);
    console.log(`- 品类匹配成功: ${categoryMatchedCount}/${enrichedData.length}`);
    
    if (unmatchedBrands.size > 0) console.log(`未匹配品牌:`, Array.from(unmatchedBrands));
    if (unmatchedCategories.size > 0) console.log(`未匹配品类:`, Array.from(unmatchedCategories));

    // 5. 随机打乱顺序 (Fisher-Yates 洗牌算法)
    console.log(`正在随机打乱数据顺序...`);
    for (let i = enrichedData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [enrichedData[i], enrichedData[j]] = [enrichedData[j], enrichedData[i]];
    }
    console.log(`数据顺序已随机打乱！`);

    // 6. 将 JSON 写入文件
    console.log(`正在写入文件: ${outputFilePath}`);
    fs.writeFileSync(outputFilePath, JSON.stringify(enrichedData, null, 2), 'utf-8');

    console.log('🎉 优化后的转换与关联任务已完成！');
} catch (error) {
    console.error('在转换过程中发生错误:', error);
    process.exit(1);
}
