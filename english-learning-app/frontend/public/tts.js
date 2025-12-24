// Import Google Cloud Text-to-Speech client
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');

// Import the list of texts to synthesize from texts.json
// Note: This file must exist in the same directory.
const textsToSynthesize = require('./text.json');

// Define the file path for the service account key you pasted
const CREDENTIALS_FILE = './google.json';
let ttsClient;

try {
    // 1. 手动读取您粘贴的 JSON 密钥文件内容
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));

    // ** 关键修正 **
    // 密钥中的换行符可能会被错误地复制为字面量 "\n"。
    // 我们需要将所有字面量 "\\n" 替换为实际的换行符 "\n"，以确保私钥格式正确。
    let fixedPrivateKey = credentials.private_key;

    // 检查并修复私钥格式：如果包含字面量 "\n" (JSON中的转义表示)
    if (typeof fixedPrivateKey === 'string' && fixedPrivateKey.includes('\\n')) {
        fixedPrivateKey = fixedPrivateKey.replace(/\\n/g, '\n');
    }

    // ** 新增：验证私钥是否以正确的 PEM 格式开头 **
    if (!fixedPrivateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        throw new Error("Private key does not start with the correct header. Key may be malformed.");
    }

    // 2. 使用读取到的凭证初始化 TTS 客户端
    ttsClient = new TextToSpeechClient({
        credentials: {
            client_email: credentials.client_email,
            private_key: fixedPrivateKey,
        },
    });
    console.log(`Successfully initialized TextToSpeechClient using ${CREDENTIALS_FILE}.`);
} catch (error) {
    console.error(`\n❌  凭证加载失败！请仔细检查以下几点：`);
    console.error(`1. 错误信息: ${error.message}`);
    console.error(`2. 文件路径: 确保 ${CREDENTIALS_FILE} 文件存在于您的 Node.js 运行目录下。`);
    console.error(`3. 密钥格式: 确保您粘贴到 ${CREDENTIALS_FILE} 中的是完整的 JSON 密钥，并且私钥值以 '-----BEGIN PRIVATE KEY-----' 开头。`);
    // 如果无法初始化客户端，则终止进程
    process.exit(1);
}

// Define the output directory where MP3 files will be saved
const OUTPUT_DIR = 'audio_output';

// Promisify fs.writeFile for async/await usage
const writeFile = util.promisify(fs.writeFile);

/**
 * Synthesizes a given text string into an MP3 audio file.
 * @param {string} text The text to be synthesized.
 * @param {string} filename The output filename (without extension).
 * @param {string} languageCode Language code (e.g., 'en-US', 'cmn-CN').
 * @param {string} voiceName Voice name (e.g., 'en-US-News-K').
 */
async function synthesizeSpeech(text, filename, languageCode, voiceName) {
    try {
        console.log(`\nSynthesizing: "${text}"`);

        const request = {
            input: { text: text },
            // Select the language and voice model
            voice: { languageCode: languageCode, name: voiceName },
            // Select output format: MP3 is suitable for web applications
            audioConfig: { audioEncoding: 'MP3' },
        };

        // Call the API
        const [response] = await ttsClient.synthesizeSpeech(request);

        // Write the Base64 encoded audio content to a local file
        const outputPath = `${OUTPUT_DIR}/${filename}.mp3`;

        // The audioContent is returned as a Buffer/Base64, 'binary' encoding handles it correctly
        await writeFile(outputPath, response.audioContent, 'binary');
        console.log(`✅  Success! Audio content written to file: ${outputPath}`);
    } catch (error) {
        // Log errors without stopping the batch process
        console.error(`❌  Error synthesizing "${text}":`, error.message);
    }
}

/**
 * Main function: Batch processes all texts defined in texts.json.
 */
async function main() {
    console.log('--- Starting Batch TTS Generation ---');

    // Check and create the output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
        console.log(`Created output directory: ${OUTPUT_DIR}`);
    }

    // Array to hold all asynchronous synthesis tasks
    const synthesisPromises = [];

    for (const item of textsToSynthesize) {
        const text = item.text;
        const filename = item.filename;

        // Simple heuristic to detect Chinese characters and select voice
        const isChinese = /[\u4e00-\u9fa5]/.test(text);

        let languageCode, voiceName;

        if (isChinese) {
            // Chinese (Mandarin - China) - High-quality WaveNet/Neural voice
            languageCode = 'cmn-CN';
            // cmn-CN-Wavenet-D (Male) or cmn-CN-Wavenet-C (Female)
            voiceName = 'cmn-CN-Wavenet-D';
        } else {
            // English (US) - High-quality Neural voice
            languageCode = 'en-US';
            // en-US-News-L (Male) or en-US-Studio-O (Female Studio Voice)
            voiceName = 'en-US-News-L';
        }

        // Add the synthesis task to the promises array
        // Note: Using Promise.resolve() to ensure the loop doesn't block if there's an issue with one text
        synthesisPromises.push(synthesizeSpeech(text, filename, languageCode, voiceName));
    }

    // Wait for all synthesis tasks to complete
    await Promise.all(synthesisPromises);

    console.log('\n--- Batch TTS Generation Completed ---');
}

main().catch(error => {
    // 捕获异步 main 函数中的关键错误
    console.error('A critical error occurred during processing:', error.message);
    process.exit(1);
});