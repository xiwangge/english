<template>
    <div class="split-layout" :class="{ 'dark': userStore.theme === 'dark' }">
        
        <div class="left-panel">
            <canvas ref="canvasRef" width="800" height="600"></canvas>
        </div>

        <div class="right-panel">
            <div class="leaderboard-container">
                <div class="trophy-icon-wrapper">
                    <svg class="trophy-icon" viewBox="0 0 24 24">
                        <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
                    </svg>
                </div>

                <div class="tabs">
                    <div class="tab-item" :class="{ active: activeTab === 'groups' }" @click="switchTab('groups')">群排行榜</div>
                    <div class="tab-item" :class="{ active: activeTab === 'users' }" @click="switchTab('users')">个人排行榜</div>
                    <div class="tab-item" :class="{ active: activeTab === 'group-members' }" @click="switchTab('group-members')">我的群内排行榜</div>
                </div>

                <div class="my-rank-card">
                    <div class="my-rank-info">
                        <div v-if="userStore.user.group">
                            <h3 class="group-welcome">
                                <span class="group-name">{{ userStore.user.group.name }}</span>
                            </h3>
                            <p class="group-slogan">{{ userStore.user.group.slogan }}</p>
                        </div>
                        <h3 v-else>{{ userStore.user.nickname || '游客' }}，欢迎回来！</h3>
                        <p>学分: {{ userStore.user.group ? userStore.user.group.totalCredits : userStore.user.credits || 0 }}</p>
                    </div>
                    <div class="monster-avatar">
                        <img v-if="userStore.user.group" :src="`/images/${userStore.user.group.avatar}`" alt="Group Avatar">
                        <svg v-else viewBox="0 0 100 100" width="60" height="60" fill="none">
                            <rect width="100" height="100" rx="10" fill="#5F9EA0"/>
                            <circle cx="35" cy="40" r="5" fill="white"/>
                            <circle cx="65" cy="40" r="5" fill="white"/>
                            <path d="M30 60 Q50 70 70 60" stroke="white" stroke-width="3" fill="none"/>
                            <path d="M20 80 L80 80 L80 100 L20 100 Z" fill="#E0F2F1"/>
                        </svg>
                    </div>
                </div>

                <div class="rank-list">
                    <div v-if="leaderboardData.top10.length" v-for="item in leaderboardData.top10" :key="item._id" class="rank-item">
                        <div class="rank-number" :class="`rank-${item.rank}`">{{ item.rank }}</div>
                        <div class="user-avatar">
                            <img :src="item.avatar && item.avatar.startsWith('http') ? item.avatar : `/images/${item.avatar || 'bubu.png'}`" :alt="item.nickname || item.name">
                        </div>
                        <div class="rank-info">
                            <div class="rank-name">{{ item.nickname || item.name }}</div>
                            <div class="rank-score">总学分: {{ item.totalCredits || item.credits }}</div>
                        </div>
                        <svg v-if="item.rank <= 3" class="medal-icon" :class="`rank-${item.rank}`" viewBox="0 0 24 24">
                           <path d="M17 10.43V2H7v8.43c0 .35.18.68.49.86l4.51 2.6 4.51-2.6c.31-.18.49-.51.49-.86zM12 11L9 9.26 10.14 5h3.72L15 9.26 12 11zm-2 7h4v2h-4v-2zm2.5 4h-1v2h1v-2z"/>
                        </svg>
                    </div>
                    <div v-if="!leaderboardData.top10.length" class="empty-state">
                        <p>暂无排行数据</p>
                    </div>
                </div>
            </div>

            <div class="site-footer">
                <p>© 2026 VOCALIS LTD. All Rights Reserved.</p>
                <p>本网站归属于 VOCALIS LTD 公司 | <a href="#" @click.prevent="goToAbout" class="footer-link">About Us</a> | <a href="#" @click.prevent="goToPrivacy" class="footer-link">Privacy Policy</a></p>
            </div>
            
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, inject, watch } from 'vue';
import { useRouter } from 'vue-router';
import { userStore } from '../store/user.js'; 

const router = useRouter();

function goToAbout() {
    router.push({ name: 'about' });
}

function goToPrivacy() {
    router.push({ name: 'privacy' });
}

const canvasRef = ref(null);
let animationFrameId = null;
const activeTab = ref('users'); // 默认激活个人排行榜
const leaderboardData = ref({ top10: [], me: null, myGroup: null });

// ================= 🔍 天气系统状态 =================
const weatherState = ref({
    type: 'Clear', // Clear, Rain, Snow, Clouds
    temp: 0,
    city: 'Loading...'
});

const almanacState = ref({
    lunarDate: '',
    festival: '',
    ganzhi: '',
    jieqi: ''
});
let particles = []; 

onMounted(async () => {
    // 从 App.vue 注入刷新函数
    const fetchUserInfo = inject('fetchUserInfo');
    if (fetchUserInfo) {
        fetchUserInfo();
    }
    // 注入 Header 颜色控制
    const setHeaderBgColor = inject('setHeaderBgColor');

    fetchLeaderboardData(); // 初始化时加载排行榜数据
    
    const updateHeaderColor = () => {
        if (setHeaderBgColor) {
            // 根据 theme 切换 Header 颜色
            setHeaderBgColor(userStore.theme === 'dark' ? '#1a202c' : '#fff8f5');
        }
    };

    updateHeaderColor();
    watch(() => userStore.theme, () => {
        updateHeaderColor();
    });

    const canvas = canvasRef.value;
    const ctx = canvas.getContext('2d');

    let lastTime = 0;
    const penguinTypingSpeed = 150; 
    let penguinTimer = 0;
    let penguinFrame = 0; 
    const screenSwitchSpeed = 6000;
    let screenTimer = 0;
    let showTetris = false; 
    const typingText = computed(() => [
        `HELLO ${userStore.user.nickname || 'GUEST'}，所有`,
        "的好运都给你... "
    ]);
    let typingIndex = 0;
    const typingSpeed = 200; 
    let typingTimer = 0;
    const gridWidth = 10;
    const gridHeight = 15;
    const blockSize = 12;
    const screenX = 468;
    const screenY = 205;
    const screenW = gridWidth * blockSize;
    const screenH = gridHeight * blockSize;
    let fallingPiece = null;
    let grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
    const tetrisSpeed = 500; 
    let tetrisTimer = 0;
    const colors = [null, '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'];
    const pieces = [[[1, 1, 1, 1]], [[2, 2], [2, 2]], [[0, 3, 0], [3, 3, 3]], [[4, 0, 0], [4, 4, 4]], [[0, 0, 5], [5, 5, 5]], [[0, 6, 6], [6, 6, 0]], [[7, 7, 0], [0, 7, 7]]];

    function createPiece() {
        const typeId = Math.floor(Math.random() * pieces.length);
        fallingPiece = {
            matrix: pieces[typeId],
            pos: {x: Math.floor(gridWidth / 2) - 1, y: 0},
            color: colors[typeId + 1]
        };
    }

    function collide(grid, piece) {
        for (let y = 0; y < piece.matrix.length; ++y) {
            for (let x = 0; x < piece.matrix[y].length; ++x) {
                if (piece.matrix[y][x] !== 0 && (grid[piece.pos.y + y] && grid[piece.pos.y + y][piece.pos.x + x]) !== 0) return true;
            }
        }
        return false;
    }
    function merge(grid, piece) {
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) grid[piece.pos.y + y][piece.pos.x + x] = value;
            });
        });
    }
    function gridClear() {
        outer: for (let y = grid.length - 1; y > 0; --y) {
            for (let x = 0; x < grid[y].length; ++x) {
                if (grid[y][x] === 0) continue outer;
            }
            const row = grid.splice(y, 1)[0].fill(0);
            grid.unshift(row);
            ++y;
        }
    }

    async function fetchWeather() {
        try {
            const response = await fetch('https://wttr.in/?format=j1');
            const data = await response.json();
            const condition = data.current_condition[0];
            const desc = condition.weatherDesc[0].value.toLowerCase();
            const temp = condition.temp_C;
            const area = data.nearest_area[0].areaName[0].value;
            weatherState.value.city = area;
            weatherState.value.temp = temp;
            if (desc.includes('rain') || desc.includes('drizzle')) { weatherState.value.type = 'Rain'; initParticles('Rain'); }
            else if (desc.includes('snow') || desc.includes('ice')) { weatherState.value.type = 'Snow'; initParticles('Snow'); }
            else if (desc.includes('cloud') || desc.includes('overcast') || desc.includes('mist')) { weatherState.value.type = 'Clouds'; initParticles('Snow'); }
            else { weatherState.value.type = 'Clear'; }
        } catch (e) { console.error("天气获取失败", e); }
    }
    
    async function fetchAlmanac() {
        try {
            const response = await fetch('/api/almanac');
            const data = await response.json();
            if (data) {
                almanacState.value = data;
            }
        } catch (e) {
            console.error("黄历获取失败", e);
        }
    }

    function initParticles(type) {
        particles = [];
        const count = type === 'Rain' ? 100 : 50;
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * 800, y: Math.random() * 600,
                speedY: type === 'Rain' ? (Math.random() * 10 + 10) : (Math.random() * 2 + 1),
                speedX: type === 'Snow' ? (Math.random() * 2 - 1) : 0,
                length: Math.random() * 20 + 10, size: Math.random() * 3 + 2
            });
        }
    }

    function drawWeatherBackground(ctx) {
        const isDark = userStore.theme === 'dark';
        let gradient = ctx.createLinearGradient(0, 0, 0, 600);
        if (weatherState.value.type === 'Rain' || weatherState.value.type === 'Clouds') {
            if (isDark) { gradient.addColorStop(0, "#1f2937"); gradient.addColorStop(1, "#111827"); }
            else { gradient.addColorStop(0, "#4b6cb7"); gradient.addColorStop(1, "#182848"); }
        } else if (weatherState.value.type === 'Snow') {
            if (isDark) { gradient.addColorStop(0, "#2c3e50"); gradient.addColorStop(1, "#34495e"); }
            else { gradient.addColorStop(0, "#83a4d4"); gradient.addColorStop(1, "#b6fbff"); }
        } else {
            if (isDark) { gradient.addColorStop(0, "#0f2027"); gradient.addColorStop(1, "#203a43"); }
            else { gradient.addColorStop(0, "#2980B9"); gradient.addColorStop(1, "#6DD5FA"); }
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);

        if (weatherState.value.type === 'Clear') {
            if (isDark) {
                ctx.fillStyle = "rgba(255, 255, 240, 0.9)"; ctx.beginPath(); ctx.arc(700, 100, 30, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillStyle = "rgba(255, 255, 0, 0.8)"; ctx.beginPath(); ctx.arc(700, 100, 40, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; ctx.strokeStyle = "rgba(174, 194, 224, 0.5)"; ctx.lineWidth = 1;
        particles.forEach(p => {
            p.y += p.speedY; p.x += p.speedX;
            if (p.y > 600) { p.y = -10; p.x = Math.random() * 800; }
            if (weatherState.value.type === 'Rain') { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.length); ctx.stroke(); }
            else if (weatherState.value.type === 'Snow') { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
        });
        ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "bold 16px Arial"; ctx.textAlign = "left";
        const weatherText = `${weatherState.value.city} | ${weatherState.value.temp}°C | ${weatherState.value.type}`;
        ctx.fillText(weatherText, 20, 30);

        // 绘制黄历信息
        // 绘制黄历信息
        ctx.font = "15px 'KaiTi', 'SimSun', serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        
        let line2Text = almanacState.value.lunarDate || '';
        if (almanacState.value.festival) {
            line2Text += ` | ${almanacState.value.festival}`;
        }

        let line3Text = almanacState.value.ganzhi || '';
        if (almanacState.value.jieqi) {
            line3Text += ` | ${almanacState.value.jieqi}`;
        }
        
        if (line2Text) {
            ctx.fillText(line2Text, 20, 55);
        }
        if (line3Text) {
            ctx.fillText(line3Text, 20, 77);
        }
    }

    function drawComputer(ctx) {
        const isDark = userStore.theme === 'dark';
        ctx.fillStyle = isDark ? "#8d7355" : "#cda67b"; ctx.fillRect(100, 460, 650, 20); ctx.fillRect(120, 480, 610, 80);
        ctx.fillStyle = isDark ? "#7f8c8d" : "#bdc3c7"; ctx.fillRect(500, 430, 100, 30);
        ctx.fillStyle = isDark ? "#7f8c8d" : "#95a5a6"; ctx.fillRect(520, 410, 60, 20);
        ctx.fillStyle = "#34495e"; ctx.fillRect(440, 140, 260, 270);
        ctx.fillStyle = "#2c3e50"; ctx.fillRect(450, 150, 240, 250);
        ctx.fillStyle = isDark ? "#000000" : "#ffffff"; ctx.fillRect(460, 160, 220, 230);
        ctx.fillStyle = isDark ? "#7f8c8d" : "#95a5a6"; ctx.fillRect(400, 470, 220, 40);
        ctx.fillStyle = isDark ? "#566573" : "#7f8c8d";
        for(let i=0; i<15; i++) { ctx.fillRect(410 + i*13, 475, 10, 10); ctx.fillRect(410 + i*13, 490, 10, 10); }
        ctx.fillStyle = "#34495e"; ctx.beginPath(); ctx.ellipse(700, 490, 30, 20, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = "#2c3e50"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(670, 490); ctx.quadraticCurveTo(600, 490, 580, 460); ctx.stroke();
        ctx.fillStyle = "#f1c40f"; ctx.beginPath(); ctx.moveTo(800, 260); ctx.lineTo(740, 310); ctx.lineTo(800, 360); ctx.fill();
        if (isDark) { ctx.fillStyle = "rgba(255, 255, 200, 0.1)"; ctx.beginPath(); ctx.moveTo(740, 310); ctx.lineTo(600, 460); ctx.lineTo(800, 460); ctx.fill(); }
        ctx.fillStyle = isDark ? "#95a5a6" : "#bdc3c7"; ctx.fillRect(780, 360, 20, 100); ctx.fillRect(760, 460, 60, 20);
    }

    function drawPenguin(ctx, frame) {
        const x = 200; const y = 310;
        ctx.fillStyle = "#8e44ad"; ctx.fillRect(x-50, y+150, 100, 20); ctx.fillRect(x-10, y+170, 20, 80); ctx.fillRect(x-50, y+230, 100, 20);
        ctx.fillStyle = "#6c3483"; ctx.fillRect(x-60, y+50, 20, 120);
        ctx.fillStyle = "#2c3e50"; ctx.beginPath(); ctx.ellipse(x+50, y+100, 80, 110, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = "#ecf0f1"; ctx.beginPath(); ctx.ellipse(x+70, y+110, 50, 80, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = "#2c3e50"; ctx.beginPath(); ctx.ellipse(x+50, y, 70, 70, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = "#ecf0f1"; ctx.beginPath(); ctx.ellipse(x+70, y, 50, 50, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(x+85, y-10, 8, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = "#f39c12"; ctx.beginPath(); ctx.moveTo(x+115, y); ctx.lineTo(x+150, y+10); ctx.lineTo(x+120, y+20); ctx.fill();
        ctx.fillStyle = "#f39c12"; ctx.beginPath(); ctx.ellipse(x+60, y+200, 25, 15, Math.PI/4, 0, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x+100, y+200, 25, 15, -Math.PI/4, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = "#2c3e50"; ctx.beginPath(); if (frame === 0) ctx.ellipse(x+130, y+130, 40, 15, -Math.PI/6, 0, 2 * Math.PI); else ctx.ellipse(x+130, y+140, 40, 15, Math.PI/6, 0, 2 * Math.PI); ctx.fill();
    }

    function drawScreenContent(ctx) {
        const isDark = userStore.theme === 'dark';
        ctx.save(); ctx.beginPath(); ctx.rect(460, 160, 220, 230); ctx.clip();
        if (showTetris) {
            ctx.fillStyle = isDark ? '#1a1a1a' : '#ecf0f1'; ctx.fillRect(screenX, screenY, screenW, screenH);
            if (isDark) { ctx.strokeStyle = '#333'; ctx.strokeRect(screenX, screenY, screenW, screenH); }
            grid.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { ctx.fillStyle = colors[value]; ctx.fillRect(screenX + x * blockSize, screenY + y * blockSize, blockSize - 1, blockSize - 1); } }); });
            if (fallingPiece) { ctx.fillStyle = fallingPiece.color; fallingPiece.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) ctx.fillRect(screenX + (fallingPiece.pos.x + x) * blockSize, screenY + (fallingPiece.pos.y + y) * blockSize, blockSize - 1, blockSize - 1); }); }); }
        } else {
            ctx.fillStyle = isDark ? "#A7D7A8" : "#2E4053"; ctx.font = "18px 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";
            let charsToShow = typingIndex; let textY = 210;
            for (let i = 0; i < typingText.value.length; i++) {
                const line = typingText.value[i]; if (charsToShow <= 0) break;
                const textToDraw = line.substring(0, charsToShow); ctx.fillText(textToDraw, 470, textY);
                if (charsToShow <= line.length) { if (Math.floor(Date.now() / 500) % 2 === 0) { const textWidth = ctx.measureText(textToDraw).width; ctx.fillRect(470 + textWidth + 2, textY - 15, 10, 20); } }
                charsToShow -= line.length; textY += 25;
            }
        }
        ctx.restore();
    }

    function gameLoop(timestamp) {
        const deltaTime = timestamp - lastTime; lastTime = timestamp;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawWeatherBackground(ctx);
        penguinTimer += deltaTime; if (penguinTimer > penguinTypingSpeed) { penguinFrame = (penguinFrame + 1) % 2; penguinTimer = 0; }
        screenTimer += deltaTime; if (screenTimer > screenSwitchSpeed) { showTetris = !showTetris; screenTimer = 0; if (!showTetris) typingIndex = 0; else { grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0)); createPiece(); } }
        if (showTetris) { tetrisTimer += deltaTime; if (tetrisTimer > tetrisSpeed) { if(fallingPiece) { fallingPiece.pos.y++; if (collide(grid, fallingPiece)) { fallingPiece.pos.y--; merge(grid, fallingPiece); gridClear(); createPiece(); if (collide(grid, fallingPiece)) grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0)); } } tetrisTimer = 0; } } else { typingTimer += deltaTime; if (typingTimer > typingSpeed) { const totalLength = typingText.value.reduce((acc, line) => acc + line.length, 0); typingIndex = (typingIndex + 1) % (totalLength + 1); typingTimer = 0; } }
        drawComputer(ctx); drawScreenContent(ctx); drawPenguin(ctx, penguinFrame);
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    createPiece();
    fetchWeather();
    fetchAlmanac();
    requestAnimationFrame(gameLoop);
});

async function fetchLeaderboardData() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/leaderboard/${activeTab.value}`, {
      headers: { 'Authorization': token }
    });
    if (response.ok) {
      leaderboardData.value = await response.json();
    } else {
      console.error('获取排行榜数据失败');
      leaderboardData.value = { top10: [], me: null, myGroup: null }; // 清空数据
    }
  } catch (error) {
    console.error('网络错误，获取排行榜数据失败', error);
  }
}

function switchTab(tab) {
  activeTab.value = tab;
  fetchLeaderboardData();
}

onUnmounted(() => {
    const setHeaderBgColor = inject('setHeaderBgColor');
    if (setHeaderBgColor) setHeaderBgColor('transparent');
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

/* 1. 根容器 */
.split-layout {
    display: flex;
    width: 100%;
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    /* 默认浅色背景 */
    background-color: #fff8f5;
    overflow: hidden;
    transition: background-color 0.3s ease;
    padding:40px;
}

/* 🌑 暗夜模式 - 根背景 */
.split-layout.dark {
    background-color: var(--bg-color); /* 强制深色 */
    color: var(--text-color);
}

/* 2. 左侧面板 (恢复 Flex: 1) */
.left-panel {
    flex: 1; /* 恢复 1:1 占比 */
    background-color: #fff8f5;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: hidden;
    transition: background-color 0.3s ease;
}

/* 🌑 暗夜模式 - 左侧 */
.split-layout.dark .left-panel {
    background-color: var(--bg-color); /* 强制深色 */
}

/* 3. 右侧面板 (恢复 Flex: 1 + 去除分割线) */
.right-panel {
    flex: 1; /* 恢复 1:1 占比 */
    background-color: #fff8f5; /* 浅色背景 */
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow-y: auto;
    transition: background-color 0.3s ease;
    
    /* ❌ 移除了 border-left */
    border-left: none; 
}

/* 🌑 暗夜模式 - 右侧 */
.split-layout.dark .right-panel {
    background-color: var(--bg-color); /* 强制深色，确保和左侧一致，解决不联动问题 */
    /* 确保没有 border-left */
    border-left: none; 
}

canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.leaderboard-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.trophy-icon-wrapper {
    display: flex;
    justify-content: center;
    margin: 5px 0;
}
.trophy-icon {
    width: 80px;
    height: 80px;
    color: #ff8a65;
    fill: currentColor;
}

.tabs {
    display: flex;
    border-bottom: 1px solid #eee;
    margin-bottom: 20px;
    background-color: transparent;
}
/* 🌑 暗夜模式 - Tabs */
.split-layout.dark .tabs {
    border-bottom-color: var(--border-color);
}

.tab-item {
    flex: 1;
    text-align: center;
    padding: 12px 0;
    font-size: 15px;
    color: #a1887f;
    cursor: pointer;
    font-weight: 600;
    position: relative;
    transition: color 0.3s;
}
/* 🌑 暗夜模式 - Tab item */
.split-layout.dark .tab-item {
    color: var(--text-secondary);
}

.tab-item.active {
    color: #ff8a65;
}
.split-layout.dark .tab-item.active {
    color: var(--primary-color);
}

.tab-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 3px;
    background-color: #ff8a65;
    border-radius: 3px;
}

/* 我的排名卡片 */
.my-rank-card {
    background-color: #ffffff;
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #f0f0f0;
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

/* 🌑 暗夜模式 - 卡片 */
.split-layout.dark .my-rank-card {
    background-color: var(--card-bg); /* 强制深色卡片 */
    border-color: var(--border-color);
    box-shadow: none;
}

.my-rank-info .group-welcome {
    font-size: 18px;
    font-weight: bold;
    color: #3d2e24;
    margin-bottom: 4px;
}
.my-rank-info .group-welcome .group-name {
    color: #ff8a65; /* Or your primary color */
}
.my-rank-info .group-slogan {
    font-size: 13px;
    color: #a1887f;
    margin-bottom: 8px;
}
.my-rank-info h3 {
    font-size: 16px;
    color: #3d2e24;
    margin-bottom: 6px;
    transition: color 0.3s;
}

.split-layout.dark .my-rank-info h3,
.split-layout.dark .my-rank-info .group-welcome {
    color: var(--text-primary);
}

.split-layout.dark .my-rank-info .group-slogan {
    color: var(--text-secondary);
}

.my-rank-info p {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 15px;
    transition: color 0.3s;
}

.monster-avatar {
    width: 80px;
    border-radius: 4px; 
    background-color: #dbece5;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: background-color 0.3s;
}
.split-layout.dark .monster-avatar {
    background-color: var(--border-color);
}

.monster-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 排行榜列表 */
.rank-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}
.rank-item {
    background-color: #ffffff;
    border-radius: 50px;
    padding: 10px 25px 10px 15px;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    border: 1px solid #f5f5f5;
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

/* 🌑 暗夜模式 - 列表项 */
.split-layout.dark .rank-item {
    background-color: var(--card-bg); /* 强制深色 */
    border-color: var(--border-color);
    color: var(--text-color);
}

.rank-number {
    font-size: 24px;
    font-weight: 900;
    width: 40px;
    text-align: center;
    margin-right: 10px;
}
.rank-1 { color: #ffcc80; }
.rank-2 { color: #e0e0e0; }
.rank-3 { color: #ffab91; }

.user-avatar {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background-color: #eee;
    margin-right: 15px;
    overflow: hidden;
}
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }

.empty-state {
    text-align: center;
    padding: 40px;
    color: #a1887f;
}

.split-layout.dark .empty-state {
    color: var(--text-secondary);
}

.rank-info {
    flex: 1;
}
.rank-name {
    font-size: 15px;
    font-weight: 700;
    color: #3d2e24;
    margin-bottom: 2px;
    transition: color 0.3s;
}
.split-layout.dark .rank-name {
    color: var(--text-primary);
}

.rank-score {
    font-size: 12px;
    color: #a1887f;
    transition: color 0.3s;
}
.split-layout.dark .rank-score {
    color: var(--text-secondary);
}

.medal-icon {
    width: 32px;
    height: 32px;
    fill: currentColor;
}

/* 底部备案信息样式 */
.site-footer {
    margin-top: auto;
    padding-top: 30px;
    padding-bottom: 10px;
    text-align: center;
    font-size: 12px;
    color: #a1887f; /* 设置默认文字颜色 */
    line-height: 1.6;
}

.footer-link {
    color: #f48c25;
    text-decoration: none;
    font-weight: 600;
}

.footer-link:hover {
    text-decoration: underline;
}

/* 暗夜模式适配 */
.split-layout.dark .site-footer {
    color: var(--text-secondary);
}
</style>