import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import fetch from 'node-fetch';
import config from './config.js';
import { fileURLToPath } from 'url';

// 定义全局缓存 Map
let ipaCache = null;
let cedictCache = null; // 为 CEDICT 创建缓存
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 同步加载词典文件
 * 直接读取 node_modules 中的 ipadict.txt，绕过库的 Bug
 */
function loadDictSync() {
    try {
        // 1. 定位词典文件路径
        const dictPath = path.resolve(__dirname, 'ipadict.txt');

        console.log(`[本地库] 正在读取词典文件: ${dictPath}`);

        // 2. 同步读取文件内容
        if (!fs.existsSync(dictPath)) {
            console.error('[本地库] 错误: 找不到词典文件！请确保 npm install text-to-ipa 已执行');
            ipaCache = new Map(); // 防止报错，给个空 Map
            return;
        }

        const content = fs.readFileSync(dictPath, 'utf8');

        // 3. 解析文件内容 (格式: word  ipa)
        ipaCache = new Map();
        const lines = content.split(/\r?\n/);

        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                const word = parts[0].toLowerCase();
                // 剩余部分拼接为音标 (防止音标中间有空格)
                const ipa = parts.slice(1).join(' ');
                ipaCache.set(word, ipa);
            }
        });

        console.log(`[本地库] 词典加载成功! 共加载 ${ipaCache.size} 个单词`);

    } catch (error) {
        console.error('[本地库] 加载失败:', error.message);
        ipaCache = new Map(); // 防止崩溃
    }
}

/**
 * 获取音标
 */
export async function getPhoneticLocal(word) {
    // 1. 首次调用时加载词典
    if (!ipaCache) {
        loadDictSync();
    }
    const cleanWord = word.toLowerCase().trim();
    // 2. 查表
    let phonetic = ipaCache.get(cleanWord);

    if (phonetic) {
        // 处理多音字 (如 "read" -> "rɛd, riːd")，只取第一个
        if (phonetic.includes(',')) {
            phonetic = phonetic.split(',')[0].trim();
        }
        // 只有当音标不包含 / 时才手动加上
        if (!phonetic.startsWith('/')) {
            phonetic = `/${phonetic}/`;
        }
        console.log(`[本地库] 命中: ${word} -> ${phonetic}`);
        return phonetic;
    } else {
        console.log(`[本地库] 未收录: ${word}`);
        return 'N/A';
    }
}

export async function getPhoneticFromDictAPI(wordText) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordText}`);
        if (!response.ok) return 'N/A';
        const data = await response.json();
        const entry = data[0];
        let phonetic = 'N/A';
        if (entry.phonetic) {
            phonetic = entry.phonetic;
        } else if (entry.phonetics && entry.phonetics.length > 0) {
            const ph = entry.phonetics.find(p => p.text);
            if (ph) phonetic = ph.text;
        }
        return phonetic;
    } catch (error) {
        console.error(`DictionaryAPI failed for ${wordText}:`, error.message);
        return 'N/A';
    }
}

export function truncate(q) {
    const len = q.length;
    if (len <= 20) return q;
    return q.substring(0, 10) + len + q.substring(len - 10, len);
}

export async function getChineseFromYoudao(wordText) {
    const salt = crypto.randomUUID();
    const curtime = Math.round(new Date().getTime() / 1000);
    const query = wordText;

    const str1 = process.env.YOUDAO_APP_KEY + truncate(query) + salt + curtime + config.YOUDAO_APP_SECRET;
    const sign = crypto.createHash('sha256').update(str1).digest('hex');

    const params = new URLSearchParams({
        q: query, from: 'en', to: 'zh-CHS',
        appKey: process.env.YOUDAO_APP_KEY, salt: salt, sign: sign,
        signType: 'v3', curtime: curtime,
    });

    try {
        const youdaoResponse = await fetch('https://openapi.youdao.com/api?' + params.toString(), {
            method: 'POST',
        });

        const data = await youdaoResponse.json();
        if (data.errorCode !== "0") {
            console.warn(`Youdao: ${wordText} translation failed.`);
            return 'N/A';
        }

        let chinese = 'N/A';
        if (data.translation && data.translation.length > 0) {
            chinese = data.translation.join(', ');
        } else if (data.basic && data.basic.explains) {
            chinese = data.basic.explains.join(', ');
        }
        // const speakUrl = data.speakUrl || 'N/A';
        return chinese;

    } catch (error) {
        console.error(`Youdao fetch failed for ${wordText}:`, error.message);
        return 'N/A';
    }
}

/**
 * 同步加载 CEDICT 词典文件
 */
function loadCedictSync() {
    try {
        const dictPath = path.resolve(__dirname, 'cedict_1_0_ts_utf-8_mdbg.txt');
        console.log(`[CEDICT] 正在读取词典文件: ${dictPath}`);

        if (!fs.existsSync(dictPath)) {
            console.error('[CEDICT] 错误: 找不到 cedict_1_0_ts_utf-8_mdbg.txt 文件！');
            cedictCache = new Map();
            return;
        }

        const content = fs.readFileSync(dictPath, 'utf8');
        cedictCache = new Map();
        const lines = content.split(/\r?\n/);

        lines.forEach(line => {
            if (line.startsWith('#') || line.trim() === '') {
                return; // 跳过注释和空行
            }

            const match = line.match(/^(\S+)\s(\S+)\s\[(.*?)\]\s\/(.*)\/$/);
            if (match) {
                const simplified = match[2];
                const pinyin = match[3];
                const englishTranslations = match[4].split('/');

                const chineseEntry = simplified; // 只保留简体中文

                // 遍历所有英文翻译，创建反向索引
                englishTranslations.forEach(englishWord => {
                    const key = englishWord.toLowerCase().trim();
                    if (key) {
                        if (cedictCache.has(key)) {
                            // 如果已有该英文词，则追加新的中文翻译
                            cedictCache.set(key, cedictCache.get(key) + `; ${chineseEntry}`);
                        } else {
                            cedictCache.set(key, chineseEntry);
                        }
                    }
                });
            }
        });

        console.log(`[CEDICT] 词典加载成功! 共加载 ${cedictCache.size} 个词条`);

    } catch (error) {
        console.error('[CEDICT] 加载失败:', error.message);
        cedictCache = new Map();
    }
}

/**
 * 从本地 CEDICT 词典获取中文翻译 (通过英文单词)
 */
export function getChineseFromCEDICT(wordText) {
    if (!wordText) return 'N/A';
    if (!cedictCache) {
        loadCedictSync();
    }
    const cleanWord = wordText.toLowerCase().trim();
    let chinese = cedictCache.get(cleanWord);

    if (chinese) {
        // 如果取出来的中文超过5个意思，只取前5个意思
        const meanings = chinese.split('; ');
        if (meanings.length > 5) {
            chinese = meanings.slice(0, 5).join('; ');
        }
        console.log(`[CEDICT] 命中: ${wordText} -> ${chinese}`);
        return chinese;
    } else {
        console.log(`[CEDICT] 未收录: ${wordText}`);
        return 'N/A';
    }
}