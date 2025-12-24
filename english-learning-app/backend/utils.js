import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import fetch from 'node-fetch';
import config from './config.js';

// 定义全局缓存 Map
let ipaCache = null;

/**
 * 同步加载词典文件
 * 直接读取 node_modules 中的 ipadict.txt，绕过库的 Bug
 */
function loadDictSync() {
    try {
        // 1. 定位词典文件路径
        const dictPath = path.join(process.cwd(), 'node_modules/text-to-ipa/ipadict.txt');
        
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
    
    const str1 = config.YOUDAO_APP_KEY + truncate(query) + salt + curtime + config.YOUDAO_APP_SECRET;
    const sign = crypto.createHash('sha256').update(str1).digest('hex');

    const params = new URLSearchParams({
        q: query, from: 'en', to: 'zh-CHS',
        appKey: config.YOUDAO_APP_KEY, salt: salt, sign: sign,
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
        const speakUrl = data.speakUrl || 'N/A';
        return { chinese, speakUrl };

    } catch (error) {
        console.error(`Youdao fetch failed for ${wordText}:`, error.message);
        return 'N/A';
    }
}