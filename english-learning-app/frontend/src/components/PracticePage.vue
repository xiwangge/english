<template>
  <div class="practice-container" :class="{ 'dark-mode': userStore.theme === 'dark', 'zen-mode': isZenMode, 'mobile-layout': isMobile, 'handwriting-mode': isWritingMode }">
    
    <header class="practice-header">
        <div class="header-left">
            <span class="menu-icon">☰</span>
            <span id="lesson-title">con</span>
        </div>
        <div class="header-right">
            <div class="display-toggles">
                <label>
                    <input type="checkbox" id="toggle-chinese" checked>
                    显示中文
                </label>
                <label>
                    <input type="checkbox" id="toggle-phonetic" checked>
                    显示音标
                </label>
                <label>
                    <input type="checkbox" id="toggle-threeTimes">
                    单词拼写三遍
                </label>

                <label>
                    <input type="checkbox" v-model="useIPA">
                    国际音标
                </label>
            </div>


            <button class="zen-btn" @click="toggleZenMode" :title="isZenMode ? '退出沉浸' : '进入沉浸模式'">
                <svg v-if="!isZenMode" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>
                </svg>
                <span class="btn-text">{{ isZenMode ? '退出' : '专注' }}</span>
            </button>

            <!-- 【新增】发音老师快速切换 -->
            <div class="teacher-quick-switch" @click.stop="isTeacherMenuOpen = !isTeacherMenuOpen">
                <div class="current-teacher-avatar" :style="{ backgroundImage: `url('${userStore.user.preferredTeacher?.avatar || '/images/ai.png'}')` }"></div>
                <div v-if="isTeacherMenuOpen" class="teacher-dropdown-menu">
                    <div class="menu-item" @click.stop="quickUpdateTeacher(null)">
                        <img src="/images/ai.png" class="mini-avatar">
                        <span>Sydney</span>
                    </div>
                    <div v-for="teacher in teachers" :key="teacher._id" 
                         class="menu-item" @click.stop="quickUpdateTeacher(teacher)">
                        <img :src="teacher.avatar || '/images/ai.png'" class="mini-avatar">
                        <span>{{ teacher.name }}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="progress-bar-top-container">
            <div class="progress-bar-fill" id="lesson-progress" :style="{ width: progressPercentage + '%' }"></div>
        </div>
    </header>

    <main class="practice-main">
        <div class="nav-arrow" id="prev-sentence">‹</div>
        
        <div class="content-wrapper">
            <div class="sentence-display">
                <h1 id="chinese-text">它是我的的手提包</h1>
                <audio id="audioPlayer" controls hidden></audio>
            </div>

            <!-- 【重构】将音标和输入框合并，以解决换行对齐问题 -->
            <div class="word-input-container" id="word-input-area">
                <template v-if="currentItem && !isAnswerShown">
                    <!-- 句子模式 -->
                    <template v-if="currentItem.type === 'sentence'">
                        <div
                            v-for="(word, index) in currentWords"
                            :key="`sentence-word-${index}`"
                            class="word-group"
                            :style="{ 'min-width': (word.text ? word.text.length : 0) + 'ch' }"
                        >
                            <div class="phonetic-word" v-show="isPhoneticVisible">
                                {{ word.phonetic === 'N/A' ? '😊' : formatPhonetic((word.phonetic || '').replace(/\//g, '')) || '&nbsp;' }}
                            </div>
                            <input
                                v-if="isWritingMode && index === currentWordIndex"
                                class="word-placeholder active"
                                :style="{ 'min-width': (word.text ? word.text.length : 0) + 'ch' }"
                                :value="userInputs[activeItemIndex] && userInputs[activeItemIndex][index]"
                                @input="handleHiddenInput"
                                @keydown="handleKeyDown"
                                :ref="el => { if (el) writingInputEl = el }"
                                autocomplete="off" 
                                autocorrect="off" 
                                autocapitalize="none" 
                                spellcheck="false"
                            >
                            <span
                                v-else
                                class="word-placeholder"
                                :class="{ active: index === currentWordIndex, wrong: isWordWrong(index) }"
                                @click="setActiveWord(index)"
                            >{{ userInputs[activeItemIndex] && userInputs[activeItemIndex][index] }}</span>
                        </div>
                    </template>
                    <!-- 单词模式 -->
                    <template v-else-if="currentItem.type === 'word'">
                        <div class="word-mode-container">
                            <div class="phonetic-word" v-show="isPhoneticVisible">
                                <template v-if="currentItem.phonetic !== 'N/A' && phoneticSyllables.length > 0">
                                    <div class="phonetic-segments-wrapper practice-mode">
                                        <span class="phonetic-bracket">[</span>
                                        <div class="phonetic-segments">
                                            <span v-for="(pPart, index) in phoneticSyllables" 
                                                  :key="`phonetic-seg-practice-${index}`"
                                                  class="phonetic-tag candy-syllable"
                                                  :class="`candy-color-${index % 7}`">
                                                {{ formatPhonetic(pPart) }}
                                            </span>
                                        </div>
                                        <span class="phonetic-bracket">]</span>
                                    </div>
                                </template>
                                <template v-else>
                                    {{ currentItem.phonetic === 'N/A' ? '😊' : formatPhonetic(currentItem.phonetic) || '&nbsp;' }}
                                </template>
                            </div>
                            <div class="word-placeholders-wrapper">
                            <template v-for="(word, index) in currentWords" :key="`word-instance-${index}`">
                                <input
                                    v-if="isWritingMode && index === currentWordIndex"
                                    class="word-placeholder active"
                                    :style="{ 'min-width': (word.text ? word.text.length : 0) + 'ch' }"
                                    :value="userInputs[activeItemIndex] && userInputs[activeItemIndex][index]"
                                    @input="handleHiddenInput"
                                    @keydown="handleKeyDown"
                                    :ref="el => { writingInputEl = el }"
                                    autocomplete="off" 
                                    autocorrect="off" 
                                    autocapitalize="none" 
                                    spellcheck="false"
                                >
                                <span
                                    v-else
                                    class="word-placeholder"
                                    :style="{ 'min-width': (word.text ? word.text.length : 0) + 'ch' }"
                                    :class="{ active: index === currentWordIndex, wrong: isWordWrong(index) }"
                                    @click="setActiveWord(index)"
                                >{{ userInputs[activeItemIndex] && userInputs[activeItemIndex][index] }}</span>
                            </template>
                            </div>
                        </div>
                    </template>
                </template>
                <!-- 正确答案显示区域 -->
               <div v-if="isAnswerShown" class="correct-answer-display">
                   <!-- 句子模式 -->
                   <template v-if="currentItem.type === 'sentence' && wordAnalyses.length">
                       <div class="word-with-pos" v-for="(analysis, index) in wordAnalyses" :key="`analysis-${index}`">
                           <span class="word">{{ analysis.text }}</span>
                           <span class="phonetic">{{ analysis.phonetic }}</span>
                           <span class="pos" :class="getPosClass(analysis.pos)">{{ analysis.pos }}</span>
                       </div>
                   </template>
                   
                   <!-- 单词模式 -->
                   <template v-else-if="currentItem.type === 'word'">
                        <div class="word-interactive-container">
                           <div v-if="loadingSyllables" class="loading">正在分析音节...</div>
                           <template v-else>
                               <!-- 单词主体：呈现为完整单词，但内部由可变色的音节组成 -->
                               <div class="word-full-display">
                                   <span v-for="(part, index) in syllables" 
                                         :key="`syllable-text-${index}`" 
                                         class="syllable-text"
                                         :class="{ 'highlight': activeSyllableIndex === index }">
                                       {{ part }}
                                   </span>
                               </div>
                               <!-- 音标整体容器：外层一个 [ ]，内层是可点击的切片 -->
                               <div class="phonetic-segments-wrapper">
                                   <span class="phonetic-bracket">[</span>
                                   <div class="phonetic-segments">
                                       <span v-for="(pPart, index) in phoneticSyllables" 
                                             :key="`phonetic-seg-${index}`"
                                             class="phonetic-tag"
                                             :class="{ 'active': activeSyllableIndex === index }"
                                             @mouseenter="activeSyllableIndex = index"
                                             @mouseleave="activeSyllableIndex = -1">
                                           {{ formatPhonetic(pPart) }}
                                       </span>
                                   </div>
                                   <span class="phonetic-bracket">]</span>
                               </div>
                           </template>
                           <!-- 词性 -->
                           <span v-if="wordAnalyses.length" class="pos" :class="getPosClass(wordAnalyses[0].pos)">{{ wordAnalyses[0].pos }}</span>
                        </div>
                   </template>

                   <!-- 其他或降级情况 -->
                    <template v-else-if="!wordAnalyses.length">
                         <div class="word-with-pos">
                            <span class="word">{{ currentItem && currentItem.text }}</span>
                            <span class="phonetic">{{ currentItem && (currentItem.phonetic === 'N/A' ? '😊' : formatPhonetic(currentItem.phonetic.replace(/\//g, ''))) }}</span>
                        </div>
                    </template>
               </div>
            </div>
        </div>
        
        <div class="nav-arrow" id="next-sentence">›</div>
    </main>

    <footer class="practice-footer" v-if="!isMobile">
        <div class="hotkey-group">
            <kbd>空格/→</kbd> <span>跳格</span>
        </div>
        <div class="hotkey-group">
            <kbd>Shift</kbd><kbd>F</kbd><span>播放</span>
        </div>
        <div class="hotkey-group">
            <kbd>Enter</kbd> <span>提交</span>
        </div>
        <div class="hotkey-group">
            <kbd>↑</kbd> <kbd>↓</kbd> <span>显示/隐藏答案</span>
        </div>
    </footer>

    <!-- 📱 移动端操作栏 -->
    <footer class="mobile-action-bar" v-if="isMobile">
        <button class="mobile-btn" @click="playCurrentAudio">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            <span>重播</span>
        </button>
        <button class="mobile-btn" :class="{ 'active': isWritingMode }" @click="isWritingMode = !isWritingMode">
            <svg v-if="!isWritingMode" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            <span>{{ isWritingMode ? '手写' : '点选' }}</span>
        </button>
        <button class="mobile-btn" @click="toggleAnswerDisplay">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            <span>提示</span>
        </button>
        <button class="mobile-btn" @click="handleUndo" :style="{ opacity: clickedStack.length ? 1 : 0.3 }">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"/></svg>
            <span>退格</span>
        </button>
        <button class="mobile-btn primary" @click="checkCurrentItem" v-if="!isAnswerShown">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <span>提交</span>
        </button>
        <button class="mobile-btn success" @click="moveToNextItem" v-else>
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M5.88 4.12L13.76 12l-7.88 7.88L8 22l10-10L8 2z"/></svg>
            <span>下一题</span>
        </button>
    </footer>

    <!-- 📱 移动端字符/单词方块选择区 -->
    <div class="scrambled-container" v-if="isMobile && !isWritingMode && !isAnswerShown">
        <div 
            v-for="opt in scrambledOptions" 
            :key="opt.id" 
            class="option-tile"
            :class="[opt.colorClass, { 'used': opt.used }]"
            @click="handleOptionClick(opt)"
        >
            {{ opt.label }}
        </div>
    </div>
</div>

<input 
  type="text" 
  id="hidden-input" 
  ref="hiddenInput"
  :inputmode="(isMobile && !isWritingMode) ? 'none' : 'text'"
  autocomplete="off" 
  autocorrect="off" 
  autocapitalize="none" 
  spellcheck="false" 
  dir="ltr"
>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed, nextTick, watch, inject } from 'vue';
import { useRoute } from 'vue-router';
import nlp from 'compromise';
import speechPlugin from 'compromise-speech';
import { userStore } from '../store/user.js';

// =================【新增代码开始】=================

// 1. 沉浸模式状态
const isZenMode = ref(false);

// 2. 输入模式状态 (打散词块 vs 直接输入)
const isWritingMode = ref(localStorage.getItem('practice_writing_mode') === 'true');

watch(isWritingMode, (newVal) => {
    localStorage.setItem('practice_writing_mode', newVal);
    if (newVal) {
        nextTick(() => focusHiddenInput());
    }
});

const setHeaderBgColor = inject('setHeaderBgColor');
    const updateHeaderColor = () => {
        if (setHeaderBgColor) {
            // 根据 theme 切换 Header 颜色
            setHeaderBgColor(userStore.theme === 'dark' ? '#1a202c' : '#fff8f5');
        }
    };
    
// 4. 切换沉浸模式
function toggleZenMode() {
    isZenMode.value = !isZenMode.value;
    updateHeaderColor(); // 切换时立即更新 Header 颜色
}

const route = useRoute();
const { bookId } = route.query;
const token = localStorage.getItem('token');

// --- DOM Element Refs ---
const titleEl = ref(null);
const progressEl = ref(null);
const chineseEl = ref(null);
const hiddenInput = ref(null);
const toggleChinese = ref(null);
const togglePhonetic = ref(null);
const toggleThreeTimes = ref(null);
const contentWrapper = ref(null);
const audioPlayer = ref(null);

// --- Reactive State ---
const practiceQueue = ref([]);
const currentItemIndex = ref(0); // 作为“学习进度”索引
const activeItemIndex = ref(0); // 作为用户当前正在“查看或操作”的索引
const currentWordIndex = ref(0);
const userInputs = ref([]);
const isAnswerShown = ref(false);
const isPhoneticVisible = ref(true); // 新增状态，控制音标可见性
const useIPA = ref(false); // 新增状态，控制是否使用国际音标，默认关闭
const isTransitioning = ref(false);
const currentUnitId = ref(null);
const currentBookId = ref(bookId);
const wrongWords = ref(new Set());
const currentUnitName = ref(null);
const wordAnalyses = ref([]); // 新增：存储单词和其词性
const bookCredits = ref(0);
const syllables = ref([]); // 新增：存储音节
const phoneticSyllables = ref([]); // 新增：存储音标音节
const activeSyllableIndex = ref(-1); // 新增：当前高亮的音节索引
const loadingSyllables = ref(false); // 新增：控制音节加载状态
const isTeacherMenuOpen = ref(false);
const writingInputEl = ref(null); // 处理手写模式下的输入框聚焦
const teachers = ref([]);
const fetchUserInfo = inject('fetchUserInfo');

// --- 📱 移动端/平板适配逻辑 ---
const isMobile = ref(false);

function checkIsMobile() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isIPad = /iPad|Macintosh/i.test(navigator.userAgent) && isTouchDevice;

    isMobile.value = 
        /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        isIPad ||
        window.innerWidth <= 1100; // 只要屏幕宽度小于 1100，就进入移动/平板模式
}

checkIsMobile();
window.addEventListener('resize', checkIsMobile);

const scrambledOptions = ref([]); // 存放打乱的字母或单词方块
const touchStatus = ref({ startX: 0, startY: 0 });
const clickedStack = ref([]); // 📥 撤销栈

// 生成打乱的选项
function generateOptions() {
    const item = currentItem.value;
    if (!item || !isMobile.value) return;

    clickedStack.value = []; // 切换题目重置栈

    const colorClasses = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5', 'color-6'];

    if (item.type === 'word') {
        // 单词：拆分为字母
        const letters = item.text.split('');
        scrambledOptions.value = letters.map((char, index) => ({
            id: `char-${index}`,
            label: char,
            used: false,
            colorClass: colorClasses[Math.floor(Math.random() * colorClasses.length)]
        })).sort(() => Math.random() - 0.5);
    } else if (item.type === 'sentence') {
        // 句子：拆分为单词
        scrambledOptions.value = item.words.map((word, index) => ({
            id: `word-${index}`,
            label: word.text,
            used: false,
            colorClass: colorClasses[Math.floor(Math.random() * colorClasses.length)]
        })).sort(() => Math.random() - 0.5);
    }
}

// 处理方块点击
function handleOptionClick(option) {
    if (option.used || isAnswerShown.value) return;

    const currentInputs = userInputs.value[activeItemIndex.value] || [];
    
    if (currentItem.value.type === 'word') {
        // 单词模式：逐个字符填入
        const targetWord = currentItem.value.text;
        const currentProgress = currentInputs[0] || '';
        
        // 自动检查拼写顺序 (Guided Mode)
        if (option.label === targetWord[currentProgress.length]) {
            currentInputs[0] = currentProgress + option.label;
            option.used = true;
            clickedStack.value.push(option); // 入栈
            userInputs.value[activeItemIndex.value] = [...currentInputs];
            
            // 拼写完成自动检查
            if (currentInputs[0].length === targetWord.length) {
                checkCurrentItem();
            }
        } else {
            // 选错了
            triggerShake();
        }
    } else {
        // 句子模式：填入当前激活的单词槽
        currentInputs[currentWordIndex.value] = option.label;
        option.used = true;
        clickedStack.value.push(option); // 入栈
        userInputs.value[activeItemIndex.value] = [...currentInputs];
        
        // 自动跳转到下一个单词槽
        if (currentWordIndex.value < currentWords.value.length - 1) {
            currentWordIndex.value++;
        } else {
            checkCurrentItem();
        }
    }
}

// 🔙 撤销上一步
function handleUndo() {
    if (clickedStack.value.length === 0 || isAnswerShown.value) return;

    const lastOption = clickedStack.value.pop();
    lastOption.used = false;

    const currentInputs = userInputs.value[activeItemIndex.value] || [];

    if (currentItem.value.type === 'word') {
        const text = currentInputs[0] || '';
        currentInputs[0] = text.substring(0, text.length - 1);
    } else {
        // 句子模式：退回上一个槽位
        if (currentWordIndex.value > 0) {
            // 如果当前槽位是空的且不是第一个（说明刚填完上一个自动跳过来的）
            if (!currentInputs[currentWordIndex.value]) {
                currentWordIndex.value--;
            }
            currentInputs[currentWordIndex.value] = null;
        } else if (currentInputs[0]) {
            // 第一个槽位有东西
            currentInputs[0] = null;
        }
    }
    userInputs.value[activeItemIndex.value] = [...currentInputs];
}

function triggerShake() {
    contentWrapper.value?.classList.add('shake');
    setTimeout(() => contentWrapper.value?.classList.remove('shake'), 500);
}

// 监听切换或数据加载，重新生成选项
watch([activeItemIndex, isMobile, practiceQueue], () => {
    generateOptions();
});

// --- 进度持久化逻辑 ---
const saveProgress = () => {
    if (!currentBookId.value || !currentUnitId.value) return;
    const key = `practice_progress_${currentBookId.value}_${currentUnitId.value}`;
    localStorage.setItem(key, JSON.stringify({
        currentItemIndex: currentItemIndex.value,
        activeItemIndex: activeItemIndex.value,
        userInputs: userInputs.value
    }));
};

const loadSavedProgress = () => {
    if (!currentBookId.value || !currentUnitId.value) return false;
    const key = `practice_progress_${currentBookId.value}_${currentUnitId.value}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (typeof data.currentItemIndex === 'number' && practiceQueue.value.length > 0) {
                currentItemIndex.value = Math.min(data.currentItemIndex, practiceQueue.value.length - 1);
                activeItemIndex.value = Math.min(data.activeItemIndex ?? data.currentItemIndex, practiceQueue.value.length - 1);
                
                if (data.userInputs && data.userInputs.length === practiceQueue.value.length) {
                    userInputs.value = data.userInputs;
                } else {
                    userInputs.value = new Array(practiceQueue.value.length).fill(null);
                }
                return true;
            }
        } catch (e) {
            console.error('恢复进度失败:', e);
        }
    }
    return false;
};

const clearSavedProgress = () => {
    if (!currentBookId.value || !currentUnitId.value) return;
    const key = `practice_progress_${currentBookId.value}_${currentUnitId.value}`;
    localStorage.removeItem(key);
};

// 监听进度变化并保存
watch([currentItemIndex, activeItemIndex, userInputs], () => {
    saveProgress();
}, { deep: true });

// --- Computed Properties ---
const currentItem = computed(() => practiceQueue.value[activeItemIndex.value]);
const currentWords = computed(() => {
    const item = currentItem.value;
    if (!item) return [];
    if (item.type === 'word') {
        // 【修正】确保单词练习也返回一个包含对象的数组，以便模板统一处理
        const wordObject = { text: item.text, phonetic: item.phonetic };
        return toggleThreeTimes.value?.checked ? [wordObject, wordObject, wordObject] : [wordObject];
    } else if (item.type === 'sentence') {
        // s.words 已经是完整的 Word 对象数组
        return item.words || [];
    }
    return [];
});

const isWordWrong = (index) => {
    return wrongWords.value.has(index);
};

function getPosClass(pos) {
    switch (pos) {
        case '名词':
        case '缩写':
            return 'pos-noun';
        case '动词': return 'pos-verb';
        case '形容词': return 'pos-adjective';
        case '副词': return 'pos-adverb';
        case '介词': return 'pos-preposition';
        case '代词': return 'pos-pronoun';
        default: return 'pos-other';
    }
}

// --- Methods ---
// --- 词性翻译 ---
const posTranslations = {
    Noun: '名词',
    Verb: '动词',
    Adjective: '形容词',
    Adverb: '副词',
    Preposition: '介词',
    Conjunction: '连词',
    Pronoun: '代词',
    Determiner: '限定词',
    Article: '冠词',
    Interjection: '感叹词',
    Value: '数值',
    Acronym: '缩写',
    // 可以根据需要添加更多翻译
};

function translatePos(tag) {
    // compromise 会给出最具体的 tag，我们需要找到最匹配的通用分类
    if (tag.includes('Acronym')) return posTranslations.Acronym;
    if (tag.includes('Noun')) return posTranslations.Noun;
    if (tag.includes('Verb')) return posTranslations.Verb;
    if (tag.includes('Adjective')) return posTranslations.Adjective;
    if (tag.includes('Adverb')) return posTranslations.Adverb;
    if (tag.includes('Preposition')) return posTranslations.Preposition;
    if (tag.includes('Conjunction')) return posTranslations.Conjunction;
    if (tag.includes('Pronoun')) return posTranslations.Pronoun;
    if (tag.includes('Determiner')) return posTranslations.Determiner;
    if (tag.includes('Article')) return posTranslations.Article;
    if (tag.includes('Interjection')) return posTranslations.Interjection;
    if (tag.includes('Value')) return posTranslations.Value;
    return tag; // 如果没有匹配，返回原始标签
}

// --- 通俗音标格式化逻辑 ---
const formatPhonetic = (text) => {
    if (!text || useIPA.value) return text;
    
    let result = text;

    // 1. 处理最基础的 IPA 专用符号替换
    const basicMap = {
        'ɹ': 'r',
        'ɚ': 'ər',
        'ɝ': 'ər',
        'ɡ': 'g'
    };
    for (const [key, val] of Object.entries(basicMap)) {
        result = result.split(key).join(val);
    }

    // 2. 智能处理 'j' (避免破坏 dʒ)
    // 如果 j 在元音后面，通常是双元音 (如 aj -> ai)
    result = result.replace(/([aeiouɑɔʊʌɛæɪ])j/g, '$1i');
    
    // 如果 j 在元音前面且不在 d 后面，通常是半元音 (如 nju -> nyu, jɪ -> yi)
    // 这里使用 (^|[^d]) 来匹配字符串开头或非 d 字符
    result = result.replace(/(^|[^d])j([aeiouɑɔʊʌɛæɪ])/g, '$1y$2');
    
    return result;
};


function analyzeSentence(text) {
    if (!text) return;

    try {
        const originalWords = currentItem.value.type === 'word'
            ? [{ text: currentItem.value.text, phonetic: currentItem.value.phonetic }]
            : [...(currentItem.value.words || [])];

        // --- 方案二：智能处理缩写词 ---
        const contractionMap = {
            "what's": ["what", "is"], "it's": ["it", "is"], "don't": ["do", "not"], "doesn't": ["does", "not"],
            "didn't": ["did", "not"], "can't": ["can", "not"], "won't": ["will", "not"], "isn't": ["is", "not"],
            "aren't": ["are", "not"], "wasn't": ["was", "not"], "weren't": ["were", "not"], "haven't": ["have", "not"],
            "hasn't": ["has", "not"], "hadn't": ["had", "not"], "i'm": ["i", "am"], "you're": ["you", "are"],
            "we're": ["we", "are"], "they're": ["they", "are"], "he's": ["he", "is"], "she's": ["she", "is"]
        };

        // 1. 构建用于 compromise 分析的文本，并记录原始单词与分析后单词的映射关系
        let textForNlp = '';
        const mapping = []; // { originalIndex: 0, nlpTermCount: 2 }
        
        originalWords.forEach((word, index) => {
            const wordText = word.text.toLowerCase();
            if (contractionMap[wordText]) {
                const expandedWords = contractionMap[wordText];
                textForNlp += expandedWords.join(' ') + ' ';
                mapping.push({ originalIndex: index, nlpTermCount: expandedWords.length });
            } else {
                textForNlp += word.text + ' ';
                mapping.push({ originalIndex: index, nlpTermCount: 1 });
            }
        });

        // 2. 执行 NLP 分析
        const doc = nlp(textForNlp.trim());
        const allTerms = doc.document.flat();
        const finalAnalyses = [];
        let termIndex = 0;

        // 3. 重组分析结果
        for (const mapInfo of mapping) {
            const originalWord = originalWords[mapInfo.originalIndex];
            let combinedPos = [];

            for (let i = 0; i < mapInfo.nlpTermCount; i++) {
                const term = allTerms[termIndex];
                if (term) {
                    const posTag = term.tags.values().next().value || 'N/A';
                    const translatedPos = translatePos(posTag);
                    // 避免重复添加 "not" 的词性，因为它通常是副词，意义不大
                    if (translatedPos !== '副词' || mapInfo.nlpTermCount === 1) {
                         combinedPos.push(translatedPos);
                    }
                }
                termIndex++;
            }
            
            finalAnalyses.push({
                text: originalWord.text,
                pos: combinedPos.join(' / ') || 'N/A',
                phonetic: originalWord.phonetic === 'N/A' ? '😊' : (originalWord.phonetic || '').replace(/\//g, '')
            });
        }
        
        wordAnalyses.value = finalAnalyses;

    } catch (error) {
        console.error('NLP Analysis failed:', error);
        // 出错时回退到无词性分析的模式，保证程序健壮性
        wordAnalyses.value = (currentItem.value.words || []).map(word => ({
            text: word.text,
            pos: 'N/A',
            phonetic: word.phonetic === 'N/A' ? '😊' : (word.phonetic || '').replace(/\//g, '')
        }));
    }
}


function setActiveWord(index) {
    if (isTransitioning.value) return;
    currentWordIndex.value = index;
    isAnswerShown.value = false;
    focusHiddenInput();
}

async function playSpeech(word) {
    const text = word.trim();
    if (!text) return;
    const apiUrl = `http://43.173.248.180:4000/api/tts?text=${encodeURIComponent(text)}&lang=en`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.value.src = audioUrl;
        audioPlayer.value.play();
    } catch (error) {
        console.error('Error fetching audio:', error);
        if (phoneticEl.value) phoneticEl.value.textContent = `播放失败: ${error.message}`;
        throw error;
    }
}

function setAndPlayAudio(url) {
    if (url) {
        if (audioPlayer.value.src !== url) {
            audioPlayer.value.src = url;
        }
        audioPlayer.value.currentTime = 0; // 从头开始播放
        audioPlayer.value.play().catch(error => console.error('音频播放失败:', error));
    } else {
        console.warn('播放失败：无效的音频URL。');
    }
}

async function playCurrentAudio() {
    const item = currentItem.value;
    if (!item || !item.text) return;
    try {
        let finalUrl = item.speakUrl;
        const teacher = userStore.user.preferredTeacher;
        
        if (teacher && teacher.pathDir && finalUrl && finalUrl.includes('assets.xuebubu.com/mp3/')) {
            // 将 https://assets.xuebubu.com/mp3/xxx.mp3 转换为 https://assets.xuebubu.com/mp3/teacher_dir/xxx.mp3
            finalUrl = finalUrl.replace('assets.xuebubu.com/mp3/', `assets.xuebubu.com/mp3/${teacher.pathDir}/`);
        }

        setAndPlayAudio(finalUrl);
    } catch (error) {
        console.error('播放失败:', error);
    }
}

async function loadNextUnit() {
    if (!currentBookId.value || !token) {
        if(chineseEl.value) chineseEl.value.textContent = '错误：缺少 BookId 或用户 Token';
        return;
    }
    try {
        const response = await fetch(`/api/userBook/getNextUnit?bookId=${currentBookId.value}`, { headers: { 'Authorization': token } });
        if (!response.ok) throw new Error(`获取单元失败: ${response.status}`);
        const unit = await response.json();
        currentUnitName.value = unit.unitName;
        bookCredits.value = unit.bookCredits || 0;
        
        if (unit.message === '课程已全部完成') {
            if(chineseEl.value) chineseEl.value.textContent = '🎉 恭喜您！已完成本书所有课程！';
            practiceQueue.value = [];
            return;
        }
        if (!unit.nextUnit || (!unit.words && !unit.sentences)) throw new Error('API 返回数据结构不完整');

        currentUnitId.value = unit.nextUnit.unitId;
        buildPracticeQueue(unit.words || [], unit.sentences || []);

        if (practiceQueue.value.length === 0) {
            await markUnitAsComplete();
            return;
        }

        if (!loadSavedProgress()) {
            resetStateForNewUnit();
        }
        await nextTick();
        renderUI();
        playCurrentAudio();
    } catch (error) {
        console.error('加载数据失败:', error);
        if(chineseEl.value) chineseEl.value.textContent = `加载失败: ${error.message}`;
    }
}

async function fetchTeachers() {
    try {
        const response = await fetch('/api/teachers', {
            headers: { 'Authorization': token }
        });
        if (response.ok) {
            teachers.value = await response.json();
        }
    } catch (error) {
        console.error('获取老师列表失败:', error);
    }
}

async function quickUpdateTeacher(teacher) {
    try {
        const response = await fetch('/api/user/preferred-teacher', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ teacherId: teacher ? teacher._id : null })
        });
        if (response.ok) {
            isTeacherMenuOpen.value = false;
            if (fetchUserInfo) await fetchUserInfo();
            // 切换后立即重播当前单词
            setTimeout(() => {
                playCurrentAudio();
            }, 100);
        }
    } catch (error) {
        console.error('切换老师失败:', error);
    }
}

function buildPracticeQueue(words, sentences) {
    const newQueue = [];
    words.forEach(w => newQueue.push({ type: 'word', ...w }));
    sentences.forEach(s => {
        // 【修正】直接使用从 API 获取的、已经 populate 好的 s.words 数组
        // 不再需要手动分割 s.text
        newQueue.push({ type: 'sentence', ...s });
    });
    practiceQueue.value = newQueue;
}

function resetStateForNewUnit() {
    currentItemIndex.value = 0;
    activeItemIndex.value = 0;
    currentWordIndex.value = 0;
    isAnswerShown.value = false;
    isTransitioning.value = false;
    userInputs.value = new Array(practiceQueue.value.length).fill(null);
}

async function markUnitAsComplete() {
    if (!currentUnitId.value || !currentBookId.value) return;
    try {
        const creditsPerUnit = bookCredits.value;
        const response = await fetch('/api/userBook/completeUnit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({
                bookId: currentBookId.value,
                unitId: currentUnitId.value,
                creditsEarned: creditsPerUnit
            })
        });
        if (response.ok) {
            userStore.user.credits = (userStore.user.credits || 0) + creditsPerUnit;
            userStore.user.golds = (userStore.user.golds || 0) + creditsPerUnit;
        }
    } catch (error) {
        console.error('标记完成失败:', error);
    } finally {
        clearSavedProgress();
        loadNextUnit();
    }
}

function renderUI() {
    const item = currentItem.value;
    if (!item) return;

    // 进度条和标题应反映真实学习进度
    if (titleEl.value) titleEl.value.textContent = `${currentUnitName.value} (${currentItemIndex.value + 1}/${practiceQueue.value.length})`;
    if (progressEl.value) progressEl.value.style.width = `${(currentItemIndex.value + 1) / practiceQueue.value.length * 100}%`;
    if (chineseEl.value) chineseEl.value.textContent = item.chinese || '';
    
    updateVisibility();

    if (!userInputs.value[activeItemIndex.value]) {
         userInputs.value[activeItemIndex.value] = new Array(currentWords.value.length).fill('');
    }
    focusHiddenInput();
}

function moveToNextItem() {
    if (!isAnswerShown.value || !isTransitioning.value) return;
    isTransitioning.value = false;
    // 只有当用户在当前学习进度上完成时，才推进两个索引
    if (activeItemIndex.value === currentItemIndex.value) {
        currentItemIndex.value++;
        activeItemIndex.value++;
    } else {
        // 如果用户是在“回顾”旧题目并完成，则只更新当前查看的索引到下一个
        activeItemIndex.value++;
    }
    currentWordIndex.value = 0;
    isAnswerShown.value = false;
    wordAnalyses.value = []; // 切换时清空词性分析
    
    if (currentItemIndex.value >= practiceQueue.value.length) {
        markUnitAsComplete();
    } else {
        renderUI();
        playCurrentAudio();
    }
}

function checkCurrentItem() {
    if (isTransitioning.value || isAnswerShown.value) return;

    wrongWords.value.clear(); // Clear previous errors
    
    // 归一化函数：处理大小写、空格以及中英文/弯直撇号
    const normalizeText = (str) => {
        return (str || '')
            .trim()
            .toLowerCase()
            .replace(/[\u2018\u2019]/g, "'") // 弯撇号归一化为直撇号
            .replace(/[\u201c\u201d]/g, '"'); // 弯引号归一化为直引号
    };

    const userAnswers = userInputs.value[activeItemIndex.value] || [];
    const correctAnswers = currentWords.value;

    let allCorrect = true;
    const item = currentItem.value;
    const expectedAnswer = (item.text || '').trim().toLowerCase();

    if (item.type === 'word') {
        // 单词模式：所有输入都必须与 item.text 匹配
        const normalizedExpected = normalizeText(item.text);
        for (let i = 0; i < currentWords.value.length; i++) {
            if (normalizeText(userAnswers[i]) !== normalizedExpected) {
                allCorrect = false;
                wrongWords.value.add(i);
            }
        }
    } else {
        // 句子模式：逐个单词比对
        for (let i = 0; i < correctAnswers.length; i++) {
            if (normalizeText(userAnswers[i]) !== normalizeText(correctAnswers[i]?.text)) {
                allCorrect = false;
                wrongWords.value.add(i);
            }
        }
    }

    if (allCorrect) {
        isTransitioning.value = true;
        isAnswerShown.value = true;
        // 无论句子还是单词，都进行分析
        analyzeSentence(currentItem.value.text);
        playCurrentAudio();
        
        // 使用 nextTick 确保在UI更新（显示答案）后，再准备切换到下一项
        // 这里的 setTimeout 只是为了让用户看到答案，然后自动跳转
        const delay = currentItem.value.type === 'word' ? 1500 : 5000;
        setTimeout(() => {
            if (isAnswerShown.value) { // 确保用户没有手动隐藏答案
                moveToNextItem();
            }
        }, delay);

    } else {
        const firstWrongIndex = Math.min(...wrongWords.value);
        if (firstWrongIndex !== Infinity) {
            currentWordIndex.value = firstWrongIndex;
        }
        contentWrapper.value?.classList.add('shake');
        setTimeout(() => contentWrapper.value?.classList.remove('shake'), 500);
        focusHiddenInput();
    }
}

function toggleAnswerDisplay() {
    if (isTransitioning.value) return;
    isAnswerShown.value = !isAnswerShown.value;
    if (isAnswerShown.value && (currentItem.value.type === 'sentence' || currentItem.value.type === 'word')) {
        // 确保只分析一次
        if (wordAnalyses.value.length === 0) {
            analyzeSentence(currentItem.value.text);
        }
    } else {
        wordAnalyses.value = []; // 隐藏答案时也清空词性分析
    }
    renderUI();
}

function focusHiddenInput() {
    const doFocus = () => {
        const inputEl = (isWritingMode.value && writingInputEl.value) ? writingInputEl.value : hiddenInput.value;
        if (!inputEl) return;

        const targetValue = isAnswerShown.value ? '' : (userInputs.value[activeItemIndex.value]?.[currentWordIndex.value] || '');
        
        if (document.activeElement === inputEl) {
            if (inputEl.value === targetValue) {
                return;
            }
        }

        inputEl.focus();
        if (isAnswerShown.value) {
            inputEl.value = '';
        } else {
            inputEl.value = targetValue;
            inputEl.select();
        }
    };

    if (isWritingMode.value) {
        nextTick(doFocus);
    } else {
        doFocus();
    }
}

function updateVisibility() {
    // 更新中文可见性
    if (chineseEl.value) {
        chineseEl.value.style.display = (isAnswerShown.value || toggleChinese.value?.checked) ? 'block' : 'none';
    }
    // 更新音标可见性 (通过响应式变量)
    isPhoneticVisible.value = isAnswerShown.value || togglePhonetic.value?.checked;
}

function nextWord() {
    if (isTransitioning.value || isAnswerShown.value) return;
    
    const item = currentItem.value;
    if (item.type === 'word' && toggleThreeTimes.value?.checked) {
        // 归一化比对
        const normalizeText = (str) => (str || '').trim().toLowerCase().replace(/[\u2018\u2019]/g, "'");
        if (normalizeText(userInputs.value[activeItemIndex.value]?.[currentWordIndex.value]) !== normalizeText(item.text)) {
            contentWrapper.value?.classList.add('shake');
            setTimeout(() => contentWrapper.value?.classList.remove('shake'), 500);
            focusHiddenInput();
            return;
        }
    }
    
    if (currentWordIndex.value < currentWords.value.length - 1) {
        currentWordIndex.value++;
        // renderUI() 会在 nextTick 中被 focusHiddenInput 间接调用，这里不再需要
        // 使用 nextTick 确保 DOM 更新后再聚焦
        nextTick(() => {
            focusHiddenInput();
        });
    } else {
        // In sentence mode, the last word should also trigger a check, not just move.
        if (currentItem.value.type === 'sentence') {
            checkCurrentItem();
        }
    }
}

function prevWord() {
    if (currentWordIndex.value > 0) {
        currentWordIndex.value--;
        renderUI();
    }
}

function handleHiddenInput(e) {
    if (isTransitioning.value || isAnswerShown.value) return;

    // 【关键改动】当用户开始输入时，将学习进度同步到当前活动项
    // 这意味着用户决定开始做这一题，即使他是跳过来的
    if (activeItemIndex.value > currentItemIndex.value) {
        currentItemIndex.value = activeItemIndex.value;
    }

    const inputs = userInputs.value[activeItemIndex.value] || [];
    inputs[currentWordIndex.value] = e.target.value;
    userInputs.value[activeItemIndex.value] = [...inputs]; // Ensure reactivity
}

function handleKeyDown(e) {
    if (isTransitioning.value && isAnswerShown.value) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            moveToNextItem();
        }
        return;
    }
    if (isTransitioning.value) {
         e.preventDefault();
         return;
    }
    
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        toggleAnswerDisplay();
    } else if (e.key === 'F' && e.shiftKey) {
        e.preventDefault();
        playCurrentAudio();
    } else if (isAnswerShown.value) {
        if (e.key === 'Enter') toggleAnswerDisplay();
    } else {
        switch (e.key) {
            case ' ':
                if (currentItem.value.type === 'sentence' || currentItem.value.type === 'word') {
                    e.preventDefault();
                    nextWord();
                }
                break;
            case 'Enter': e.preventDefault(); checkCurrentItem(); break;
            case 'Backspace':
                if (hiddenInput.value.value === '' && currentWordIndex.value > 0) {
                    e.preventDefault();
                    prevWord();
                }
                break;
        }
    }
}

// --- Lifecycle Hook ---
onMounted(() => {
    fetchTeachers();
    // 注入 Header 颜色控制
    updateHeaderColor();

    // Assign refs to DOM elements
    titleEl.value = document.getElementById('lesson-title');
    progressEl.value = document.getElementById('lesson-progress');
    chineseEl.value = document.getElementById('chinese-text');
    hiddenInput.value = document.getElementById('hidden-input');
    toggleChinese.value = document.getElementById('toggle-chinese');
    togglePhonetic.value = document.getElementById('toggle-phonetic');
    toggleThreeTimes.value = document.getElementById('toggle-threeTimes');
    contentWrapper.value = document.querySelector('.content-wrapper');
    audioPlayer.value = document.getElementById('audioPlayer');
    
    // Add event listeners
    hiddenInput.value.addEventListener('input', handleHiddenInput);
    hiddenInput.value.addEventListener('keydown', handleKeyDown);
    document.getElementById('prev-sentence').addEventListener('click', () => {
        if (activeItemIndex.value > 0) {
            activeItemIndex.value--;
            currentWordIndex.value = 0;
            isAnswerShown.value = false; // 切换时总是隐藏答案
            wordAnalyses.value = []; // 切换时清空词性分析
            renderUI();
            playCurrentAudio();
            // 不再强制聚焦，让用户决定是否输入
        }
    });
    document.getElementById('next-sentence').addEventListener('click', () => {
         if (activeItemIndex.value < practiceQueue.value.length - 1) {
            activeItemIndex.value++;
            currentWordIndex.value = 0;
            isAnswerShown.value = false; // 切换时总是隐藏答案
            wordAnalyses.value = []; // 切换时清空词性分析
            renderUI();
            playCurrentAudio();
            // 不再强制聚焦，让用户决定是否输入
        }
    });
    toggleChinese.value.addEventListener('change', updateVisibility);
    togglePhonetic.value.addEventListener('change', updateVisibility);
    toggleThreeTimes.value.addEventListener('change', () => {
        // 【修复】仅当答案未显示时，切换此选项才重置当前单词的状态
        // 从而防止在显示答案时切换导致UI卡死
        if (!isAnswerShown.value) {
            if (userInputs.value[activeItemIndex.value]) {
                userInputs.value[activeItemIndex.value] = null;
            }
            currentWordIndex.value = 0;
            renderUI();
        }
    });
    document.body.addEventListener('click', (e) => {
        if (!e.target.closest('.word-placeholder, .nav-arrow, input, label')) {
            focusHiddenInput();
        }
    });

    loadNextUnit();
});

onUnmounted(() => {
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('resize', checkIsMobile);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    if (setHeaderBgColor) {
        setHeaderBgColor('transparent'); // Reset on component leave
    }
});

// --- 音节拆分逻辑 ---
const splitWord = async (item) => {
  if (!item || !item.text) {
    syllables.value = [];
    phoneticSyllables.value = [];
    return;
  }
  loadingSyllables.value = true;
  activeSyllableIndex.value = -1; // 重置高亮

  try {
    const text = item.text;
    const rawPhonetic = (item.phonetic || '').replace(/\//g, '');
    
    // 1. 拆分单词文本音节
    nlp.extend(speechPlugin);
    const cleanedText = text.replace(/[^a-zA-Z]/g, '').toLowerCase();
    let doc = nlp(cleanedText);
    let result = doc.syllables();
    
    if (result && result.length > 0 && result[0] && Array.isArray(result[0])) {
      syllables.value = result[0];
    } else {
      syllables.value = [cleanedText];
    }

    // 2. 智能拆分音标音节
    let pParts = [];
    if (rawPhonetic.includes('.')) {
        // 如果有显式的点号分隔
        pParts = rawPhonetic.split('.');
    } else if (rawPhonetic.includes('ˈ') || rawPhonetic.includes('ˌ')) {
        // 尝试按重音符号拆分 (保留符号在后一块，或者根据用户习惯处理)
        // 这里的正则 (?=[ˈˌ]) 表示在符号前切分
        pParts = rawPhonetic.split(/(?=[ˈˌ])/);
    }

    // 如果拆出的数量和单词音节不一致，采用比例切分法（兜底）
    if (pParts.length !== syllables.value.length && syllables.value.length > 1) {
        const totalP = rawPhonetic.length;
        const totalW = text.length;
        const newPParts = [];
        let charCursor = 0;
        
        for (let i = 0; i < syllables.value.length; i++) {
            if (i === syllables.value.length - 1) {
                newPParts.push(rawPhonetic.substring(charCursor));
            } else {
                // 按单词字符比例估算音标长度
                const ratio = syllables.value[i].length / totalW;
                let takeLen = Math.round(ratio * totalP);
                if (takeLen < 1) takeLen = 1;
                newPParts.push(rawPhonetic.substring(charCursor, charCursor + takeLen));
                charCursor += takeLen;
            }
        }
        pParts = newPParts;
    }

    if (pParts.length === 0) pParts = [rawPhonetic];
    phoneticSyllables.value = pParts;
    
  } catch (e) {
    console.error("音节拆分失败:", e);
    syllables.value = [item.text];
    phoneticSyllables.value = [(item.phonetic || '').replace(/\//g, '')];
  } finally {
    loadingSyllables.value = false;
  }
};

// --- Watchers ---
watch(currentItem, (newItem) => {
  // 单词模式下始终加载音节拆分，无论是否显示答案
  if (newItem && newItem.type === 'word') {
    splitWord(newItem);
  } else {
    syllables.value = [];
    phoneticSyllables.value = [];
  }
}, { immediate: true });

// 监听答案显示状态，确保显示答案时才加载音节
watch(isAnswerShown, (isShown) => {
    if (isShown && currentItem.value && currentItem.value.type === 'word') {
        const currentText = currentItem.value.text;
        if (syllables.value.join('') !== currentText) {
            splitWord(currentItem.value);
        }
    } else {
        activeSyllableIndex.value = -1;
    }
})

// 5. 监听变化
watch(() => userStore.theme, () => {
        updateHeaderColor();
    });
watch(isZenMode, updateHeaderColor); // 模式变了，Header 也要变


</script>

<style scoped>
@import '../assets/style.css';
@import '../assets/practice.css';

.practice-container {
    /* --- 核心变量定义 --- */
    --bg-color: #fff8f5;   /* 白天背景：米色 */
    --text-color: #333;
    --border-color: #e6e0db;
    --primary-color: #f48c25;
    --primary-light: rgba(244, 140, 37, 0.1);
    
    /* 输入状态颜色 */
    --input-line-color: #d1d5db;
    --input-line-active: #f48c25;
    --correct-color: #10b981;    /* 绿色 */
    --error-color: #ef4444;      /* 红色 */
    --nav-arrow-color: #ddd;

    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: background-color 0.3s ease, color 0.3s ease;
    overflow: hidden;
}

/* Header 透明化 */
.practice-header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 40px;
    height: 60px;
    background-color: transparent; /* 透出背景 */
    z-index: 50;
    box-sizing: border-box; 
}

/* Main 区域 */
.practice-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 20px;
    overflow-y: auto;
    overflow-x: hidden;
}

/* =========================================
   2. 输入区域样式 (Word Input)
   ========================================= */
.word-input-container { 
    display: flex; 
    flex-wrap: wrap; 
    justify-content: center; 
    align-items: flex-end; 
    gap: 20px; 
    min-height: 120px; 
    padding: 0 20px;
}

.word-group { 
    display: inline-flex; 
    flex-direction: column; 
    align-items: center; 
    position: relative;
}

/* 输入框占位符：下划线风格 */
.word-placeholder {
    font-family: "Menlo", "Monaco", "Courier New", monospace;
    font-size: 2rem; 
    letter-spacing: 2px; 
    font-weight: 600;
    
    background-color: transparent !important;
    border-bottom: 3px solid var(--input-line-color); 
    
    padding: 5px 10px;
    min-width: 60px;
    text-align: center; 
    color: var(--text-color); 
    
    transition: all 0.3s;
    border-radius: 2px 2px 0 0;
    cursor: text;
    outline: none;
    -webkit-appearance: none;
    border-left: none;
    border-right: none;
    border-top: none;
}

input.word-placeholder {
    background-color: transparent !important;
    padding: 5px 10px;
}

.word-placeholder.active { 
    border-bottom-color: var(--input-line-active); 
    transform: translateY(-2px);
}

.word-placeholder.wrong { 
    color: var(--error-color); 
    border-bottom-color: var(--error-color); 
}

/* =========================================
   3. 答案显示区域 (Correct Answer) - ✅ 找回的部分
   ========================================= */
.correct-answer-display {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-end;
    gap: 25px; /* 单词之间的间距 */
    margin-top: 20px;
    width: 100%;
}

/* 单个单词卡片容器 */
.word-with-pos {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-width: 60px;
}

/* 单词文本 */
.word-with-pos .word {
    font-family: "Menlo", "Monaco", "Courier New", monospace;
    font-size: 2rem;
    font-weight: bold;
    color: var(--correct-color); /* 绿色 */
    letter-spacing: 2px;
    padding: 5px 10px;
}

/* 音标 */
.word-with-pos .phonetic {
    font-size: 0.9em;
    color: #6c757d;
    margin-top: 4px;
    font-family: sans-serif;
}

/* 词性标记 (通用样式) */
.pos {
    display: inline-block;
    font-size: 0.75rem;
    padding: 3px 10px;
    border-radius: 12px;
    color: #ffffff !important; /* 强制保持白色 */
    margin-top: 10px;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    text-shadow: none;
    line-height: 1.2;
}

/* 词性颜色分类 */
.pos-noun { background-color: #60aaf9 !important; }
.pos-verb { background-color: #ef4444 !important; }
.pos-adjective { background-color: #fbbf24 !important; color: #333 !important; }
.pos-adverb { background-color: #f97316 !important; }
.pos-preposition { background-color: #10b981 !important; }
.pos-pronoun { background-color: #8b5cf6 !important; }
.pos-other { background-color: #6b7280 !important; }

/* =========================================
   4. 互动单词显示 (Word Interactive)
   ========================================= */
.word-interactive-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.word-full-display {
    font-family: "Menlo", "Monaco", "Courier New", monospace;
    font-size: 3rem;
    font-weight: 800;
    letter-spacing: -1px;
    display: flex;
    align-items: center;
}

.syllable-text {
    color: var(--correct-color);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: inline-block;
}

/* 喜庆的颜色呼应：高亮时变为亮橙/红渐变色感 */
.syllable-text.highlight {
    color: #ff4d4d;
    transform: scale(1.1);
    text-shadow: 0 0 15px rgba(255, 77, 77, 0.3);
}

.phonetic-segments-wrapper {
    display: flex;
    align-items: center;
    gap: 2px;
    background: rgba(0,0,0,0.04);
    padding: 2px 12px;
    border-radius: 12px;
    transition: all 0.3s;
}

.dark-mode .phonetic-segments-wrapper {
    background: rgba(255,255,255,0.06);
}

.phonetic-bracket {
    font-size: 1.4rem;
    color: #9ca3af;
    font-weight: 300;
}

.phonetic-segments {
    display: flex;
    gap: 4px; /* 音节之间的微小间距 */
}

.phonetic-tag {
    font-family: "Lucida Sans Unicode", "Arial Unicode MS", sans-serif;
    font-size: 1.3rem;
    color: #6c757d;
    cursor: pointer;
    padding: 6px 4px;
    border-radius: 6px;
    transition: all 0.2s ease;
    user-select: none;
    min-width: 10px;
    text-align: center;
}

/* 🍬 糖果色音节 */
.candy-syllable {
    font-weight: 700;
    text-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.candy-color-0 { color: #FF616D !important; } /* 珊瑚红 */
.candy-color-1 { color: #38CC77 !important; } /* 薄荷绿 */
.candy-color-2 { color: #3A86FF !important; } /* 皇家蓝 */
.candy-color-3 { color: #FFB302 !important; } /* 亮橙黄 */
.candy-color-4 { color: #8338EC !important; } /* 魅惑紫 */
.candy-color-5 { color: #FB5607 !important; } /* 烈焰橘 */
.candy-color-6 { color: #00B4D8 !important; } /* 天空蓝 */

.phonetic-segments-wrapper.practice-mode {
    justify-content: center;
    margin-bottom: 15px;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(0, 0, 0, 0.05);
    padding: 10px 24px;
    border-radius: 20px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    backdrop-filter: blur(5px);
}

.dark-mode .phonetic-segments-wrapper.practice-mode {
    background: rgba(45, 55, 72, 0.4);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.phonetic-segments-wrapper.practice-mode .phonetic-tag {
    font-size: 1.6rem;
    padding: 2px 6px;
}

.phonetic-tag:hover, .phonetic-tag.active {
    color: #ff4d4d;
    background-color: rgba(255, 77, 77, 0.08);
    transform: translateY(-1px);
}

.dark-mode .phonetic-tag {
    color: #a0aec0;
}

.loading {
    font-size: 0.9rem;
    color: #999;
    font-style: italic;
}

/* =========================================
   5. 暗夜模式适配 (Dark Mode)
   ========================================= */
.practice-container.dark-mode {
    --bg-color: #1a202c;     
    --text-color: #e2e8f0;
    --border-color: #2d3748;
    --input-line-color: #4b5563;
}

.practice-container.dark-mode .word-with-pos .phonetic {
    color: #a0aec0;
}

.practice-container.dark-mode .syllable-box {
    background-color: rgba(16, 185, 129, 0.2);
    border-color: rgba(104, 211, 145, 0.3);
    color: #68d391;
}

/* =========================================
   6. 其他辅助样式 (Header, Footer, Zen)
   ========================================= */
.header-left { display: flex; align-items: center; gap: 15px; font-size: 1.1em; font-weight: 600; }
.header-right { display: flex; align-items: center; gap: 20px; }
.display-toggles { display: flex; gap: 15px; font-size: 0.9em; color: #666; }
.practice-container.dark-mode .display-toggles { color: #a0aec0; }
.display-toggles label { display: flex; align-items: center; gap: 5px; cursor: pointer; }

/* 进度条 */
.progress-bar-top-container { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: transparent; }
.progress-bar-fill { height: 100%; background-color: var(--primary-color); width: 0%; transition: width 0.3s ease; }

/* 导航箭头 */
.nav-arrow { font-size: 3.5rem; color: var(--nav-arrow-color); cursor: pointer; padding: 0 30px; user-select: none; transition: all 0.2s; opacity: 0.6; }
.practice-container.dark-mode .nav-arrow { color: #4a5568; }
.nav-arrow:hover { color: var(--primary-color); opacity: 1; transform: scale(1.1); }

/* 句子标题 */
.sentence-display h1 { font-size: 2.2rem; margin: 0; font-weight: 500; text-align: center; color: var(--text-color); line-height: 1.4; opacity: 0.9; }
.phonetic-word { font-size: 1.2rem; color: #666; margin-bottom: 8px; }
.practice-container.dark-mode .phonetic-word { color: #a0aec0; }

.word-mode-container {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.word-mode-container .phonetic-word {
    margin-bottom: 12px;
    opacity: 1;
}

/* Footer */
.practice-footer {
    flex: 0 0 auto;
    padding: 20px 0;
    text-align: center;
    background-color: transparent;
}
.hotkey-group { display: inline-block; margin: 0 10px; color: #9ca3af; font-size: 0.85rem; }
.hotkey-group kbd {
    background: transparent;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 2px 6px;
    font-family: monospace;
    color: #666;
}
.practice-container.dark-mode .hotkey-group { color: #6b7280; }
.practice-container.dark-mode .hotkey-group kbd { border-color: #4b5563; color: #e2e8f0; background: #2d3748; }

/* =========================================
   专注模式按钮修复 (Zen Button Fix)
   ========================================= */
.zen-btn {
    /* 布局与防挤压 */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;       /* 关键：禁止被 Flex 容器挤压 */
    white-space: nowrap;  /* 关键：禁止文字换行 */
    
    /* 尺寸与间距 */
    height: 36px;         /* 固定高度，防止忽大忽小 */
    padding: 0 16px;      /* 左右内边距 */
    gap: 8px;             /* 图标和文字的间距 */
    margin-left: 15px;
    
    /* 外观 */
    background-color: transparent;
    border: 1px solid var(--border-color);
    border-radius: 18px;  /* 圆角胶囊形 */
    
    /* 文字 */
    font-size: 14px;
    color: var(--text-color);
    
    /* 交互 */
    cursor: pointer;
    transition: all 0.2s ease;
    opacity: 0.8;
}

/* 鼠标悬停 */
.zen-btn:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
    background-color: var(--primary-light);
    opacity: 1;
    transform: translateY(-1px); /* 轻微上浮 */
}

/* 修复内部图标变形 */
.zen-btn svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0; /* 图标禁止缩放 */
    display: block;
}

/* 修复内部文字垂直对齐 */
.zen-btn .btn-text {
    line-height: 1;
    display: inline-block;
}

.practice-container.zen-mode {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: 9999; background-color: var(--bg-color); padding: 0;
}
.practice-container.zen-mode .practice-header { background-color: transparent; border-bottom: none; }

/* 隐藏元素 */
/* 隐藏元素且保持光标稳定性 (Fixed for iPad) */
#hidden-input { 
    position: fixed; 
    left: -100px;
    top: 50%;
    width: 1px;
    height: 1px;
    opacity: 0; 
    pointer-events: none;
    z-index: -1;
    font-size: 16px; /* 防止 iOS 自动放大 */
}

/* 错误抖动 */
.shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
@keyframes shake {
    40%, 60% { transform: translate3d(4px, 0, 0); }
}

/* =========================================
   📱 移动端/平板适配 (Mobile & Tablet Specific Styles)
   ========================================= */
/* 使用 .mobile-layout 类来适配 iPad Pro 等大屏移动设备 */
.mobile-layout {
    padding: 5px;
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.mobile-layout .practice-header {
    padding: 10px;
}

.mobile-layout .display-toggles, 
.mobile-layout .hotkey-group, 
.mobile-layout .nav-arrow {
    display: none !important;
}

.mobile-layout .sentence-display h1 {
    font-size: 1.5rem;
    padding: 0 10px;
}

.mobile-layout .word-placeholder {
    font-size: 1.25rem;
    min-width: 40px !important;
    margin: 2px;
}

/* 底部操作栏 */
.mobile-layout .mobile-action-bar {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(0,0,0,0.05);
    display: flex;
    justify-content: space-around;
    padding: 12px 0;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    z-index: 100;
}

.mobile-layout.dark-mode .mobile-action-bar {
    background: rgba(26, 32, 44, 0.8);
    border-top-color: rgba(255,255,255,0.1);
}

.mobile-layout .mobile-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: var(--text-color);
    opacity: 0.7;
    font-size: 0.75rem;
    cursor: pointer;
}

.mobile-layout .mobile-btn.primary { opacity: 1; color: var(--primary-color); font-weight: bold; }
.mobile-layout .mobile-btn.success { opacity: 1; color: #10b981; font-weight: bold; }
.mobile-layout .mobile-btn.active { opacity: 1; color: var(--primary-color); font-weight: bold; }

/* 选项方块区 */
.mobile-layout .scrambled-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    padding: 15px;
    background: rgba(0,0,0,0.02);
    border-radius: 12px;
    margin: 10px;
    margin-bottom: 80px; /* 为底部操作栏留位 */
}

.mobile-layout.dark-mode .scrambled-container {
    background: rgba(255,255,255,0.03);
}

.mobile-layout .option-tile {
    padding: 10px 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.08);
    color: var(--text-color);
    font-weight: 600;
    font-size: 1.1rem;
    transition: all 0.2s;
    border: 1px solid #efefef;
    user-select: none;
    cursor: pointer;
}

/* iPad Pro 等大屏幕移动设备下，进一步放大方块 */
@media screen and (min-width: 1000px) {
    .mobile-layout .option-tile {
        padding: 15px 24px;
        font-size: 1.5rem;
        border-radius: 12px;
    }
}

.mobile-layout.dark-mode .option-tile {
    background: #2d3748;
    border-color: #4a5568;
}

.mobile-layout .option-tile:active {
    transform: scale(0.9);
    opacity: 0.7;
}

/* 缤纷色彩方案 (Colorful Schemes) */
.mobile-layout .color-1 { background: #E0F2FE; color: #0369A1; border-color: #BAE6FD !important; }
.mobile-layout .color-2 { background: #DCFCE7; color: #15803D; border-color: #BBF7D0 !important; }
.mobile-layout .color-3 { background: #F3E8FF; color: #7E22CE; border-color: #E9D5FF !important; }
.mobile-layout .color-4 { background: #FFEDD5; color: #C2410C; border-color: #FED7AA !important; }
.mobile-layout .color-5 { background: #FCE7F3; color: #BE185D; border-color: #FBCFE8 !important; }
.mobile-layout .color-6 { background: #FEF9C3; color: #A16207; border-color: #FEF08A !important; }

.mobile-layout.dark-mode .color-1 { background: rgba(3, 105, 161, 0.2); color: #7DD3FC; border-color: rgba(125, 211, 252, 0.3) !important; }
.mobile-layout.dark-mode .color-2 { background: rgba(21, 128, 61, 0.2); color: #86EFAC; border-color: rgba(134, 239, 172, 0.3) !important; }
.mobile-layout.dark-mode .color-3 { background: rgba(126, 34, 206, 0.2); color: #D8B4FE; border-color: rgba(216, 180, 254, 0.3) !important; }
.mobile-layout.dark-mode .color-4 { background: rgba(194, 65, 12, 0.2); color: #FDBA74; border-color: rgba(253, 186, 116, 0.3) !important; }
.mobile-layout.dark-mode .color-5 { background: rgba(190, 24, 93, 0.2); color: #F9A8D4; border-color: rgba(249, 168, 212, 0.3) !important; }
.mobile-layout.dark-mode .color-6 { background: rgba(161, 98, 7, 0.2); color: #FDE047; border-color: rgba(253, 224, 71, 0.3) !important; }

.mobile-layout .option-tile.used {
    opacity: 0.2;
    pointer-events: none;
    transform: scale(0.9);
    filter: grayscale(100%);
}

/* 兜底：如果只是屏幕窄，但不是移动设备（无 touch），也应用部分响应式样式 */
@media (max-width: 1100px) {
    .sentence-display h1 {
        font-size: 1.8rem;
    }
    .word-placeholder {
        font-size: 1.5rem;
    }
    .display-toggles, .hotkey-group, .nav-arrow {
        display: none !important;
    }
}

/* --- 在原有样式的最后添加新样式 --- */
.teacher-quick-switch {
    position: relative;
    cursor: pointer;
    margin-left: 10px;
    z-index: 1001;
}

.current-teacher-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-size: cover;
    background-position: center;
    border: 2px solid var(--primary-color);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.2s;
}

.current-teacher-avatar:hover {
    transform: scale(1.1);
}

.teacher-dropdown-menu {
    position: absolute;
    top: 40px;
    right: 0;
    background: var(--bg-card-light);
    border: 1px solid var(--border-light);
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    width: 140px;
    overflow: hidden;
    animation: fadeIn 0.2s ease-out;
}

.dark-mode .teacher-dropdown-menu {
    background: var(--bg-card-dark);
    border-color: var(--border-dark);
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    transition: background 0.2s;
    font-size: 14px;
    color: var(--text-color);
}

.menu-item:hover {
    background: var(--primary-light);
}

.mini-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>