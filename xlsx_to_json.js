const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 配置文件路径
const inputFilePath = path.join(__dirname, '123.xlsx');
const outputFilePath = path.join(__dirname, '123.json');

try {
    // 检查文件是否存在
    if (!fs.existsSync(inputFilePath)) {
        console.error(`错误: 找不到文件 ${inputFilePath}`);
        process.exit(1);
    }

    // 读取工作簿
    console.log(`正在读取文件: ${inputFilePath}`);
    const workbook = XLSX.readFile(inputFilePath);

    // 获取第一个工作表的名称
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // 将工作表转换为 JSON 对象
    console.log(`正在转换工作表: ${firstSheetName}`);
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // 将 JSON 写入文件
    console.log(`正在写入文件: ${outputFilePath}`);
    fs.writeFileSync(outputFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');

    console.log('转换完成！');
} catch (error) {
    console.error('在转换过程中发生错误:', error);
    process.exit(1);
}
