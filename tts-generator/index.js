// Import Google Cloud Text-to-Speech client
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');

// Import the list of texts to synthesize from texts.json
// Note: This file must exist in the same directory.
// const textsToSynthesize = require('./text.json');
const express = require('express');

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
    console.error(`\n❌ 凭证加载失败！请仔细检查以下几点：`);
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
        console.log(`✅ Success! Audio content written to file: ${outputPath}`);
    } catch (error) {
        // Log errors without stopping the batch process
        console.error(`❌ Error synthesizing "${text}":`, error.message);
    }
}

const app = express();
const port = 3000;

app.use(express.json());

// Check and create the output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
    console.log(`Created output directory: ${OUTPUT_DIR}`);
}

app.post('/synthesize/word', async (req, res) => {
    const { word } = req.body;
    if (!word) {
        return res.status(400).send({ error: 'Missing parameter: word' });
    }

    try {
        await synthesizeSpeech(word, 'word/' + word, 'en-US', 'en-US-News-L');
        res.status(200).send({ message: `Successfully synthesized word: ${word}` });
    } catch (error) {
        res.status(500).send({ error: `Failed to synthesize word: ${word}`, details: error.message });
    }
});

app.post('/synthesize/sentence', async (req, res) => {
    const { sentence, filename } = req.body;
    if (!sentence || !filename) {
        return res.status(400).send({ error: 'Missing parameters: sentence or filename' });
    }

    const isChinese = /[\u4e00-\u9fa5]/.test(sentence);
    let languageCode, voiceName;
        
    if (isChinese) {
        languageCode = 'cmn-CN';
        voiceName = 'cmn-CN-Wavenet-D';
    } else {
        languageCode = 'en-US';
        voiceName = 'en-US-News-L';
    }

    try {
        await synthesizeSpeech(sentence, filename, languageCode, voiceName);
        res.status(200).send({ message: `Successfully synthesized sentence to file: ${filename}.mp3` });
    } catch (error) {
        res.status(500).send({ error: `Failed to synthesize sentence`, details: error.message });
    }
});


app.listen(port, () => {
    console.log(`TTS generator server listening at http://localhost:${port}`);
});