import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 腾讯云 COS 上传脚本
 * 用法: source ../env.sh && node upload_to_cos.js
 */

// 初始化 COS
const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
});

const Bucket = process.env.COS_BUCKET;
const Region = process.env.COS_REGION;

async function uploadFile(localPath, cosKey) {
    return new Promise((resolve, reject) => {
        cos.putObject({
            Bucket,
            Region,
            Key: cosKey,
            Body: fs.createReadStream(localPath),
            ContentLength: fs.statSync(localPath).size,
            Headers: {
                'Content-Type': 'audio/mpeg'
            }
        }, (err, data) => {
            if (err) {
                console.error(`❌ 上传失败: ${localPath} -> ${cosKey}`);
                console.error(err);
                reject(err);
            } else {
                console.log(`✅ 上传成功: ${localPath} -> ${cosKey}`);
                resolve(data);
            }
        });
    });
}

async function uploadFilesFromDir(currentDir, baseDir, cosPrefix) {
    if (!fs.existsSync(currentDir)) {
        console.warn(`⚠️ 目录不存在: ${currentDir}`);
        return;
    }

    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(currentDir, item.name);

        if (item.isDirectory()) {
            // 递归遍历子目录
            await uploadFilesFromDir(fullPath, baseDir, cosPrefix);
        } else if (item.isFile() && item.name.endsWith('.mp3')) {
            // 计算相对于 baseDir 的路径，并转换为 POSIX 风格的 COS Key
            const relativePath = path.relative(baseDir, fullPath);
            const cosKey = path.posix.join(cosPrefix, relativePath);

            await uploadFile(fullPath, cosKey);
        }
    }
}

async function main() {
    // 检查环境变量
    if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY || !Bucket || !Region) {
        console.error('\n❌ 错误: 缺失腾讯云 COS 必要的环境变量。');
        console.error('请确保已设置: COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION');
        console.log('\n提示: 你可以在项目根目录下运行 "source ../env.sh" 来加载环境变量。');
        process.exit(1);
    }

    const start = Date.now();

    try {
        const audioOutputDir = path.join(__dirname, 'audio_output');

        console.log(`\n🚀 开始递归上传 ${audioOutputDir} 下的所有 .mp3 文件...`);

        // 统一从 audio_output 根目录开始递归上传到 mp3/ 前缀下
        await uploadFilesFromDir(audioOutputDir, audioOutputDir, 'mp3');

        const duration = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`\n✨ 所有上传任务已完成！(耗时: ${duration}s)`);
    } catch (err) {
        console.error('\n💥 上传过程中发生严重错误:', err);
        process.exit(1);
    }
}

main();
