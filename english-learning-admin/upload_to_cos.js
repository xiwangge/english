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

async function uploadFilesFromDir(localDir, cosPrefix) {
    if (!fs.existsSync(localDir)) {
        console.warn(`⚠️ 目录不存在: ${localDir}`);
        return;
    }

    const files = fs.readdirSync(localDir);
    const mp3Files = files.filter(file => file.endsWith('.mp3'));

    if (mp3Files.length === 0) {
        console.log(`ℹ️ 在 ${localDir} 中未发现 .mp3 文件，跳过。`);
        return;
    }

    console.log(`\n🚀 正在从 ${localDir} 上传 ${mp3Files.length} 个文件到 ${cosPrefix}...`);

    for (const file of mp3Files) {
        const localPath = path.join(localDir, file);
        // 使用 path.posix.join 确保在不同系统上都生成斜杠 (/) 而不是反斜杠
        const cosKey = path.posix.join(cosPrefix, file);
        await uploadFile(localPath, cosKey);
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

        // 1. 上传 audio_output/*.mp3 -> mp3/
        await uploadFilesFromDir(audioOutputDir, 'mp3');

        // 2. 上传 audio_output/word/*.mp3 -> mp3/word/
        const wordDir = path.join(audioOutputDir, 'word');
        await uploadFilesFromDir(wordDir, 'mp3/word');

        const duration = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`\n✨ 所有上传任务已完成！(耗时: ${duration}s)`);
    } catch (err) {
        console.error('\n💥 上传过程中发生严重错误:', err);
        process.exit(1);
    }
}

main();
