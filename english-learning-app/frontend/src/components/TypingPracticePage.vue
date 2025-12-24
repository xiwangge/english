<template>
  <div class="typing-container" :class="{ 'hard-mode-active': currentMode === 'hard', 'dark-mode': userStore.theme === 'dark' }">

    <div v-if="currentMode === 'hard'" class="fog-container">
      <div class="fog-cloud cloud-1"></div>
      <div class="fog-cloud cloud-2"></div>
      <div class="fog-cloud cloud-3"></div>
    </div>

    <div class="header-panel">
      <div class="controls">
        <button 
          :class="{ active: currentMode === 'basic' }" 
          @click="setMode('basic')"
        >
          基础练习
        </button>
        <button 
          :class="{ active: currentMode === 'random' }" 
          @click="setMode('random')"
        >
          随机字母
        </button>
        <button 
          class="hard-mode-btn"
          :class="{ active: currentMode === 'hard', 'pulse': currentMode === 'hard' && isPlaying }" 
          @click="setMode('hard')"
        >
          🎵 困难模式 (歌曲同步)
        </button>
      </div>

      <div v-if="currentMode === 'hard'" class="score-board">
        <div class="song-selector">
          <label>选择歌曲：</label>
          <select v-model="selectedSong" @change="handleSongChange">
            <option v-for="song in songList" :key="song.id" :value="song">
              {{ song.title }}
            </option>
          </select>

          <button 
            class="mini-control-btn"
            :class="{ 'playing': isPlaying }"
            @click="togglePlay($event)"
          >
            {{ isPlaying ? '⏸ 暂停' : '▶ 开始挑战' }}
          </button>
        </div>

        <div class="progress-bar" :class="{ 'night-mode': currentMode === 'hard' }">
          <div 
            class="time-fill" 
            :style="{ width: timeProgress + '%' }">
            <div 
              class="score-fill"
              :style="{ width: accuracy + '%' }">
              </div>

            <div 
              v-if="currentMode === 'hard'" 
              class="spotlight-wrapper"
              :class="[`state-${lightState}`]" >
                <div class="spotlight-head"></div> 
                <div class="beam beam-1"></div>      
                <div class="beam beam-2"></div>      
                <div class="beam beam-3"></div>      
                <div class="beam beam-4"></div>
                </div>

          </div>
        </div>

        <div class="stats">
          <span>完成度: {{ accuracy }}%</span>
          <span>连击: {{ combo }}</span>
        </div>

        <audio 
            ref="audioPlayer" 
            class="audio-hidden"
            :src="songUrl" 
            @timeupdate="handleTimeUpdate"
            @ended="handleSongEnd"
            @loadedmetadata="handleLoadedMetadata"  style="display: none;" >
        </audio>
      </div>
    </div>

    <div class="display-area-wrapper">
      <div v-if="currentMode === 'hard'" class="lyrics-preview">
        {{ nextLyricPreview }}
      </div>
      
      <div class="display-area" :class="{ 'shake': isMissed }">
        
        <template v-if="currentMode !== 'hard'">
          <div 
            v-for="(char, index) in displayedLetters" 
            :key="currentIndex + index"
            class="letter-box"
            :class="{ current: index === 0 }"
          >
            {{ char }}
          </div>
        </template>

        <template v-else>
          <div v-if="targetString.length > 0 && currentIndex < targetString.length" class="karaoke-line">
            <span 
              v-for="(char, index) in targetString" 
              :key="index"
              class="karaoke-char"
              :class="{
                'done': index < currentIndex,   /* 已经打完的字 */
                'active': index === currentIndex /* 当前正在打的字 */
              }"
            >
              {{ char === ' ' ? '&nbsp;' : char }}
            </span>
          </div>

          <div v-else-if="isPlaying" class="waiting-icon">
             ( 🎵 间奏 / 等待下一句... )
          </div>
        </template>

      </div>
    </div>

    <div class="keyboard-wrapper">
      <div class="keyboard">
        <div 
          v-for="(row, rIndex) in keyboardRows" 
          :key="rIndex" 
          class="row"
        >
          <div 
            v-for="keyConfig in row" 
            :key="keyConfig.code || keyConfig.label"
            class="key"
            :class="getKeyClasses(keyConfig)"
          >
            {{ keyConfig.label }}
          </div>
        </div>
      </div>

      <div class="hands-overlay">
        <div class="hand hand-left" :class="{ 'move-up': activeHand === 'left' }">
           <svg viewBox="0 0 200 250">
            <path :class="['finger', { active: activeFinger === 'l-pinky' }]" d="M10,120 Q10,60 30,60 Q50,60 50,120 L50,180 L10,180 Z" />
            <path :class="['finger', { active: activeFinger === 'l-ring' }]" d="M55,110 Q55,40 75,40 Q95,40 95,110 L95,180 L55,180 Z" />
            <path :class="['finger', { active: activeFinger === 'l-middle' }]" d="M100,100 Q100,20 120,20 Q140,20 140,100 L140,180 L100,180 Z" />
            <path :class="['finger', { active: activeFinger === 'l-index' }]" d="M145,110 Q145,40 165,40 Q185,40 185,110 L185,180 L145,180 Z" />
            <path :class="['finger', { active: activeFinger === 'l-thumb' }]" d="M190,180 Q220,160 210,200 Q180,230 160,220 L140,200 Z" transform="translate(-20, 0)" />
            <path class="palm" d="M10,180 L185,180 Q180,250 100,250 Q20,250 10,180 Z" />
          </svg>
        </div>
        <div class="hand hand-right" :class="{ 'move-up': activeHand === 'right' }">
          <svg viewBox="0 0 200 250">
            <path :class="['finger', { active: activeFinger === 'r-index' }]" d="M15,110 Q15,40 35,40 Q55,40 55,110 L55,180 L15,180 Z" />
            <path :class="['finger', { active: activeFinger === 'r-middle' }]" d="M60,100 Q60,20 80,20 Q100,20 100,100 L100,180 L60,180 Z" />
            <path :class="['finger', { active: activeFinger === 'r-ring' }]" d="M105,110 Q105,40 125,40 Q145,40 145,110 L145,180 L105,180 Z" />
            <path :class="['finger', { active: activeFinger === 'r-pinky' }]" d="M150,120 Q150,60 170,60 Q190,60 190,120 L190,180 L150,180 Z" />
            <path :class="['finger', { active: activeFinger === 'r-thumb' }]" d="M10,180 Q-20,160 -10,200 Q20,230 40,220 L60,200 Z" transform="translate(20, 0)" />
            <path class="palm" d="M15,180 L190,180 Q180,250 100,250 Q20,250 15,180 Z" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue';
// 1. 引入 userStore 以支持全局主题切换
import { userStore } from '../store/user.js';

// --- 状态 ---
const currentMode = ref('basic');
const targetString = ref([]);
const currentIndex = ref(0);
const pressedKeys = ref(new Set());
const displayLength = 8;

const songDuration = ref(0); 
const currentTime = ref(0);  

// 灯光状态：'off'(关), 'scattered'(四散旋转), 'merged'(合并)
const lightState = ref('off');
const currentLightCues = ref([]);

// --- 困难模式新增状态 ---
const audioPlayer = ref(null);
const isPlaying = ref(false);
const isMissed = ref(false); 
const currentLyricLineIndex = ref(-1);
const score = ref(0);
const totalCharsPassed = ref(0); 
const combo = ref(0);

// 2. 注入 Header 颜色控制 (移动到 setup 顶层)
const setHeaderBgColor = inject('setHeaderBgColor');

const updateHeaderColor = () => {
    if (setHeaderBgColor) {
        if (currentMode.value === 'hard') {
            // 困难模式强制深色背景
            setHeaderBgColor('#141e30');
        } else {
            // 基础/随机模式跟随全局主题
            setHeaderBgColor(userStore.theme === 'dark' ? '#1a202c' : '#ffffff');
        }
    }
};

// 定义歌曲列表 (包含 歌名, 路径, 歌词文本)
const songList = [
  {
    id: 1,
    title: "My Heart Will Go On",
    src: "/mp3/My Heart Will Go On.mp3",
    lightCues: [
      { time: 19.7, action: 'scattered' }, 
      { time: 29.7, action: 'off' }
    ],
    lrc: `[00:19.729]Every night in my dreams\n[00:24.290]I see you\n[00:26.709]I feel you\n[00:29.419]That is how I know you go on\n[00:41.379]Far across the distance\n[00:43.156]And spaces between us.\n[00:48.766]You have come to show you go on\n[00:58.495]Near far,\n[01:02.726]wherever you are\n[01:07.289]I believe that the heart does go on\n[01:18.170]Once more,\n[01:22.188]you open the door,\n[01:27.789]And you're here in my heart.\n[01:32.060]And my heart will go on and on\n[01:41.700]Love can touch us one time.\n[01:49.722]And last for a life**me\n[01:57.587]And never let go till we're gone,\n[02:06.906]Love was when I loved you\n[02:11.390]One true time I hold to.\n[02:16.789]In my life we'll always go on.\n[02:26.990]Near far,\n[02:30.990]wherever you are\n[02:34.729]I believe that the heart does go on\n[02:45.527]Once more,\n[02:49.759]you open the door,\n[02:54.270]And you're here in my heart,\n[02:59.299]And my heart will go on and on\n[03:09.700]You're here,\n[03:25.390]You're here,\n[03:30.090]there's nothing I fear.\n[03:32.979]And I know that my heart will go on\n[03:44.990]we'll stay forever this way.\n[03:52.990]You are safe in my heart,\n[03:57.589]and my heart will go on and on\n`
  },
  {
    id: 2,
    title: "Yesterday Once More",
    src: "/mp3/Yesterday Once More.mp3",
    lightCues: [
      { time: 2.8, action: 'scattered' },
      { time: 12.8, action: 'off' } 
    ],
    lrc: `[00:02.879]When I was young I'd listen to the radio\n[00:08.918]Waiting for my favorite songs\n[00:14.559]When they played I'd sing along\n[00:19.259]It made me smile\n[00:23.909]Those were such happy times and not so long ago\n[00:32.298]how I wondered where they'd gone\n[00:37.890]But they're back again just like a long lost friend\n[00:43.979]all the songs I loved so well\n[00:49.239]Every shalalala every wo'wo\n[00:55.829]Still shines\n[01:01.679]Every shing-a-ling-a-ling\n[01:04.249]That they're starting to sing\n[01:06.990]So fine\n[01:13.119]When they get to the part\n[01:15.669]Where he's breaking her heart\n[01:19.900]It can really make me cry\n[01:24.200]Just like before\n[01:29.289]It's yesterday once more\n[01:38.890](shoobie do lang lang)\n[01:42.178]Looking back on how it was in years gone by\n[01:47.828]And the good times that I had\n[01:54.190]Makes today seem rather sad\n[01:58.349]So much has changed\n[02:07.390]It was songs of love that I would sing to then\n[02:11.228]and I'd memorize each word\n[02:16.168]Those old melodies still sound so good to me\n[02:23.198]As they melt the years away\n[02:29.390]Every shalalala every wo'wo still shines\n[02:39.998]Every shing-a-ling-a-ling\n[02:42.327]That they're starting to sing\n[02:45.648]So fine\n[02:51.577]All my best memories come back clearly to me\n[02:56.868]Some can even make me cry\n[03:01.879]Just like before\n[03:07.698]It's yesterday once more\n[03:10.659](shoobie do lang lang)\n[03:14.898]Every shalalala every wo'wo still shines\n[03:26.238]Every shing-a-ling-a-ling\n[03:29.398]That they're starting to sing\n[03:31.668]So fine\n[03:36.898]Every shalalala every wo'wo still shines.\n`
  },
  {
    id: 3,
    title: "Perfect",
    src: "/mp3/Perfect.mp3",
    lightCues: [
      { time: 2.8, action: 'scattered' },
      { time: 12.8, action: 'off' }
    ],
    lrc: `[00:02.83]I found a love for me\n[00:07.97]Darling, just dive right in and follow my lead\n[00:17.84]Well, I found a girl, beautiful and sweet\n[00:25.62]Oh, I never knew you were the someone waiting for me\n[00:32.33]'Cause we were just kids when we fell in love\n[00:36.53]Not knowing what it was\n[00:40.33]I will not give you up this time\n[00:47.86]darling, just kiss me slow, your heart is all I own\n[00:55.35]And in your eyes you're holding mine\n[01:02.40]Baby, I'm dancing in the dark with you between my arms\n[01:13.09]Barefoot on the grass, listening to our favourite song\n[01:20.62]When you said you looked a mess, I whispered underneath my breath\n[01:27.85]But you heard it, darling, you look perfect tonight\n[01:35.57]\n[01:41.54]Well I found a woman, stronger than anyone I know\n[01:47.89]She shares my dreams, I hope that someday I'll share her home\n[01:55.95]I found a love, to carry more than just my secrets\n[02:03.76]To carry love, to carry children of our own\n[02:10.98]We are still kids, but we're so in love\n[02:15.17]Fighting against all odds\n[02:18.85]I know we'll be alright this time\n[02:26.41]Darling, just hold my hand\n[02:30.26]Be my girl, I'll be your man\n[02:33.99]I see my future in your eyes\n[02:40.63]Baby, I'm dancing in the dark, with you between my arms\n[02:51.45]Barefoot on the grass, listening to our favourite song\n[02:59.05]When I saw you in that dress, looking so beautiful\n[03:05.97]I don't deserve this, darling you look perfect tonight\n[03:16.72]\n[03:19.92]Baby, I'm dancing in the dark, with you between my arms\n[03:36.85]Barefoot on the grass, listening to our favourite song\n[03:44.62]I have faith in what I see\n[03:47.93]Now I know I have met an angel in person\n[03:54.46]And she looks perfect, I don't deserve this\n[04:02.28]You look perfect tonight\n[04:07.32]\n`
  },
  {
    id: 4,
    title: "Blinded By The Night",
    src: "/mp3/Blinded By The Night.mp3",
    lightCues: [
      { time: 2.8, action: 'scattered' },
      { time: 12.8, action: 'off' }
    ],
    lrc: `[00:23.580]An uncertain spring\n[00:27.020]Changed it all\n[00:28.120]You can count my rings\n[00:31.900]After I fall\n[00:34.100]And still not know a thing about me\n[00:43.560]Years from now we'll recall\n[00:46.220]The madness of it all\n[00:48.320]Or maybe nothing at all\n[00:51.000]As they say\n[00:53.020]\"Night falls\"\n[00:57.890]Around me\n[01:03.120]Late spinning nights\n[01:06.340]Staring deep into my bright disco eyes\n[01:11.990]Each one reflecting their own dusk\n[01:16.540]While our eyes adjust\n[01:23.430]Every star so unaware how dark\n[01:27.330]Their surroundings are\n[01:31.110]I wasn't looking for the light\n[01:37.870]No, I was blinded by the night\n[02:04.080]We'll go home to some bar\n[02:07.000]Cause home's too far\n[02:09.170]Is it too late to find out\n[02:11.030]Who we really are?\n[02:17.670]As we slip away with time\n[02:24.940]I see it clearly now\n[02:26.970]How my glass is full\n[02:29.170]There ain't no living without\n[02:32.440]With my life so dull\n[02:37.020](Or so I thought\n[02:41.540]On an empty night)\n[02:44.730]Every star so unaware of dark\n[02:49.330]Their surroundings are\n[02:51.320]I wasn't looking for the light\n[02:58.450]No, I was blinded by the night\n`
  },
  {
    id: 5,
    title: "Supergirl",
    src: "/mp3/Supergirl.mp3",
    lightCues: [
      { time: 2.8, action: 'scattered' },
      { time: 12.8, action: 'off' } 
    ],
    lrc: `[00:02.70]You can tell by the way\n[00:06.03]She walks that she's my girl\n[00:10.61]You can tell by the way\n[00:13.86]She talks, she rules the world\n[00:18.49]You can see in her eyes\n[00:21.53]That no one is her chain\n[00:26.67]She's my girl, my supergirl\n[00:34.39]And then she'd say, "It's okay\n[00:38.18]I got lost on the way\n[00:41.76]But I'm a supergirl\n[00:45.14]And supergirls don't cry"\n[00:50.07]And then she'd say, "It's alright\n[00:53.71]I got home late last night\n[00:57.20]But I'm a supergirl\n[01:00.83]And supergirls just fly"\n[01:16.30](And supergirls don't cry")\n[01:21.82]And then she'd say, "It's alright\n[01:25.76]I got home late last night\n[01:29.00]But I'm a supergirl\n[01:32.49]And supergirls just fly"\n[01:37.49]And then she'd say\n[01:40.37]That nothing can go wrong\n[01:45.40]When you're in love\n[01:49.28]What can go wrong?\n[01:53.17]Then she'd laugh\n[01:56.06]The night time into day\n[02:01.04]Pushing her fear further along\n[02:08.81]And then she'd say, "It's okay\n[02:12.73]I got lost on the way\n[02:15.83]But I'm a supergirl\n[02:19.56](And supergirls don't cry")\n[02:24.43]And then she'd shout down the line\n[02:28.36]Tell me she's got no more time\n[02:31.70]'Cause she's a supergirl\n[02:35.57]And supergirls don't hide\n[02:40.35]And then she'd scream in my face\n[02:44.03]Tell me to leave, leave this place\n[02:47.72]'Cause she's a supergirl\n[02:51.15]And supergirls just fly\n[02:55.65]Yes, she's a supergirl, a supergirl\n[03:03.97]She's sewing seeds, she's burning trees\n[03:07.90]She's sewing seeds, she's burning trees\n[03:11.43]she's a supergirl, a supergirl\n[03:19.60]A supergirl, my supergirl\n[03:26.92]\n`
  },
  {
    id: 6,
    title: "Sound Of Silence",
    src: "/mp3/Sound Of Silence.mp3",
    lightCues: [
      { time: 2.8, action: 'scattered' },
      { time: 12.8, action: 'off' } 
    ],
    lrc: `[00:59.500]Hello darkness, my old friend\n[01:03.900]I've come to talk with you again\n[01:09.030]Because a vision softly creeping\n[01:14.700]Left its seeds while I was sleeping\n[01:19.600]And the vision that was planted in my brain\n[01:27.500]Still remains\n[01:29.900]Within the sound of silence\n[01:36.100]In restless dreams I walked alone\n[01:41.600]Narrow streets of cobblestone\n[01:46.800]'Neath the halo of a street lamp\n[01:51.800]I turned my collar to the cold and damp\n[01:56.900]When my eyes were stabbed by the flash of a neon light\n[02:04.000]That split the night\n[02:06.700]And touched the sound of silence\n[02:15.000]\n[02:49.900]And in the naked light I saw\n[02:55.700]Ten thousand people, maybe more\n[03:00.200]People talking without speaking\n[03:05.700]People hearing without listening\n[03:11.050]People writing songs that voices never share\n[03:18.050]And no one dare\n[03:20.950]Disturb the sound of silence\n[03:26.900]\n[03:27.000]"Fools" said I, "You do not know\n[03:31.980]Silence like a cancer grows\n[03:37.850]Hear my words that I might teach you\n[03:42.700]Take my arms that I might reach to you"\n[03:47.700]But my words like silent raindrops fell\n[03:57.900]And echoed in the wells of silence\n[04:04.000]\n[04:04.500]Hmmm..Hmmm..Hmmm..Hmmm..\n[04:10.000]Hmmm..Hmmm..Hmmm..\n[04:14.000]Hmmm..Hmmm..Hmmm..Hmmm..Hmm..Hmm..Hmm..\n[04:21.300]Hmmm..Hmmm..Hmmm..\n[04:28.000]Hmmm..Hmmm..Hmmm..Hmmm..\n[04:34.900]Within the sound of silence\n[04:43.000]\n`
  },
  {
    id: 7,
    title: "Alone",
    src: "/mp3/Alone.mp3",
    lightCues: [
      { time: 2.8, action: 'scattered' },
      { time: 12.8, action: 'off' }
    ],
    lrc: `[00:02.42]Lost in your mind\n[00:08.97]I wanna know\n[00:11.73]Am I losing my mind\n[00:18.76]Never let me go\n[00:20.05]\n[00:20.87]If this night is not forever\n[00:24.28]At least we are together\n[00:26.73]I know I'm not alone\n[00:29.28]I know I'm not alone\n[00:31.55]\n[00:32.06]Anywhere, whenever\n[00:34.23]Apart but still together\n[00:36.69]I know I'm not alone\n[00:39.15]I know I'm not alone\n[00:49.12]I know I'm not alone\n[00:58.98]I know I'm not alone\n[01:01.95]\n[01:04.27]Unconscious mind\n[01:10.85]I'm wide awake\n[01:13.42]Wanna feel one last time\n[01:20.57]Take my pain away\n[01:22.10]\n[01:32.57]If this night is not forever\n[01:36.04]At least we are together\n[01:38.55]I know I'm not alone\n[01:40.96]I know I'm not alone\n[01:43.04]\n[01:43.78]Anywhere, whenever\n[01:45.94]Apart but still together\n[01:48.42]I know I'm not alone\n[01:50.85]I know I'm not alone\n[02:00.89]I know I'm not alone\n[02:10.68]I know I'm not alone\n[02:13.78]\n[02:15.00]I'm not alone, I'm not alone\n[02:19.95]I'm not alone, I know I'm not alone\n[02:24.95]I'm not alone, I'm not alone\n[02:29.82]I'm not alone, I know I'm not alone\n`
  }
];

const parseLrc = (lrc) => {
  const lines = lrc.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  lines.forEach(line => {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3]);
      const text = match[4].trim();
      
      if (text) {
         result.push({
            start: minutes * 60 + seconds + milliseconds / 1000,
            text: text 
         });
      }
    }
  });
  
  return result.sort((a, b) => a.start - b.start);
};

const selectedSong = ref(songList[0]);
const songLyrics = ref([]); 
const songUrl = ref(selectedSong.value.src);

songLyrics.value = parseLrc(selectedSong.value.lrc);
currentLightCues.value = (selectedSong.value.lightCues || []).sort((a, b) => a.time - b.time);
lightState.value = 'off';

const handleSongChange = () => {
  songUrl.value = selectedSong.value.src;
  songLyrics.value = parseLrc(selectedSong.value.lrc);
  
  currentIndex.value = 0;
  score.value = 0;
  totalCharsPassed.value = 0;
  combo.value = 0;
  currentLyricLineIndex.value = -1;
  targetString.value = [];

  songDuration.value = 0;
  currentTime.value = 0;
  
  currentLightCues.value = (selectedSong.value.lightCues || []).sort((a, b) => a.time - b.time);

  lightState.value = 'off';
  
  isPlaying.value = false; 
  if(audioPlayer.value) {
    audioPlayer.value.pause();
    audioPlayer.value.load(); 
  }
};

const keyboardRows = [
  [ { label: '`', code: 'Backquote' }, { label: '1', code: 'Digit1' }, { label: '2', code: 'Digit2' }, { label: '3', code: 'Digit3' }, { label: '4', code: 'Digit4' }, { label: '5', code: 'Digit5' }, { label: '6', code: 'Digit6' }, { label: '7', code: 'Digit7' }, { label: '8', code: 'Digit8' }, { label: '9', code: 'Digit9' }, { label: '0', code: 'Digit0' }, { label: '-', code: 'Minus' }, { label: '=', code: 'Equal' }, { label: 'delete', code: 'Backspace', type: 'wide' } ],
  [ { label: 'tab', code: 'Tab', type: 'wide' }, { label: 'Q', code: 'KeyQ' }, { label: 'W', code: 'KeyW' }, { label: 'E', code: 'KeyE' }, { label: 'R', code: 'KeyR' }, { label: 'T', code: 'KeyT' }, { label: 'Y', code: 'KeyY' }, { label: 'U', code: 'KeyU' }, { label: 'I', code: 'KeyI' }, { label: 'O', code: 'KeyO' }, { label: 'P', code: 'KeyP' }, { label: '[', code: 'BracketLeft' }, { label: ']', code: 'BracketRight' }, { label: '|', code: 'Backslash' } ],
  [ { label: 'caps', code: 'CapsLock', type: 'wide' }, { label: 'A', code: 'KeyA' }, { label: 'S', code: 'KeyS' }, { label: 'D', code: 'KeyD' }, { label: 'F', code: 'KeyF' }, { label: 'G', code: 'KeyG' }, { label: 'H', code: 'KeyH' }, { label: 'J', code: 'KeyJ' }, { label: 'K', code: 'KeyK' }, { label: 'L', code: 'KeyL' }, { label: ';', code: 'Semicolon' }, { label: "'", code: 'Quote' }, { label: 'enter', code: 'Enter', type: 'wide' } ],
  [ { label: 'shift', code: 'ShiftLeft', type: 'wide' }, { label: 'Z', code: 'KeyZ' }, { label: 'X', code: 'KeyX' }, { label: 'C', code: 'KeyC' }, { label: 'V', code: 'KeyV' }, { label: 'B', code: 'KeyB' }, { label: 'N', code: 'KeyN' }, { label: 'M', code: 'KeyM' }, { label: ',', code: 'Comma' }, { label: '.', code: 'Period' }, { label: '/', code: 'Slash' }, { label: 'shift', code: 'ShiftRight', type: 'wide' } ],
  [ { label: 'ctrl', code: 'ControlLeft', type: 'wide' }, { label: 'alt', code: 'AltLeft', type: 'wide' }, { label: 'cmd', code: 'MetaLeft', type: 'wide' }, { label: '', code: 'Space', type: 'space' }, { label: 'cmd', code: 'MetaRight', type: 'wide' }, { label: 'alt', code: 'AltRight', type: 'wide' }, { label: 'ctrl', code: 'ControlRight', type: 'wide' } ]
];

const fingerMap = {
  'l-pinky': ['`', '1', 'q', 'a', 'z', 'Shift', 'Tab', 'CapsLock'],
  'l-ring': ['2', 'w', 's', 'x'],
  'l-middle': ['3', 'e', 'd', 'c'],
  'l-index': ['4', '5', 'r', 't', 'f', 'g', 'v', 'b'],
  'l-thumb': [' '],
  'r-thumb': [' '],
  'r-index': ['6', '7', 'y', 'u', 'h', 'j', 'n', 'm'],
  'r-middle': ['8', 'i', 'k', ','],
  'r-ring': ['9', 'o', 'l', '.'],
  'r-pinky': ['0', '-', '=', 'p', '[', ']', '\\', ';', "'", '/', 'Enter', 'Backspace', 'Shift']
};
const keyToFinger = {};
for (const [finger, keys] of Object.entries(fingerMap)) {
  keys.forEach(k => { keyToFinger[k.toLowerCase()] = finger; keyToFinger[k.toUpperCase()] = finger; });
}

// --- 计算属性 ---
const timeProgress = computed(() => {
  if (songDuration.value === 0) return 0;
  return ((currentTime.value / songDuration.value) * 100).toFixed(1);
});

const displayedLetters = computed(() => {
  return targetString.value.slice(currentIndex.value, currentIndex.value + displayLength);
});

const currentTargetChar = computed(() => {
  return targetString.value[currentIndex.value];
});

const currentTargetKey = computed(() => {
  if (!currentTargetChar.value) return '';
  return currentTargetChar.value.toLowerCase();
});

const activeFinger = computed(() => {
  return keyToFinger[currentTargetKey.value] || '';
});

const activeHand = computed(() => {
  if (activeFinger.value.startsWith('l-')) return 'left';
  if (activeFinger.value.startsWith('r-')) return 'right';
  return '';
});

const accuracy = computed(() => {
  if (totalCharsPassed.value === 0) return 0;
  return Math.round((score.value / totalCharsPassed.value) * 100);
});

const nextLyricPreview = computed(() => {
  if (currentLyricLineIndex.value + 1 < songLyrics.value.length) {
    return songLyrics.value[currentLyricLineIndex.value + 1].text;
  }
  return 'End';
});

// --- 方法 ---

const getKeyClasses = (keyConfig) => {
  const classes = {
    wide: keyConfig.type === 'wide',
    space: keyConfig.type === 'space',
    pressed: false,
    highlight: false
  };

  if (pressedKeys.value.has(keyConfig.code) || pressedKeys.value.has(keyConfig.label.toLowerCase())) {
    classes.pressed = true;
  }

  const target = currentTargetKey.value;
  if (target) {
    if (keyConfig.label.toLowerCase() === target) classes.highlight = true;
    if (target === ' ' && keyConfig.code === 'Space') classes.highlight = true;
  }
  
  return classes;
};

const setMode = (mode) => {
  currentMode.value = mode;
  currentIndex.value = 0;
  score.value = 0;
  totalCharsPassed.value = 0;
  combo.value = 0;
  currentLyricLineIndex.value = -1;
  document.activeElement?.blur();

  if (mode === 'hard') {
    startHardMode();
  } else {
    stopHardMode();
    generateText();
  }
};

const generateText = () => {
  targetString.value = [];
  if (currentMode.value === 'basic') {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    for(let i=0; i<5; i++) targetString.value.push(...alphabet.split(''));
  } else if (currentMode.value === 'random') {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    for(let i=0; i<100; i++) {
      targetString.value.push(chars.charAt(Math.floor(Math.random() * chars.length)));
    }
  }
};

// --- 困难模式逻辑 ---

const startHardMode = () => {
  targetString.value = []; 
  if (audioPlayer.value) {
    audioPlayer.value.currentTime = 0;
    audioPlayer.value.play().catch(e => console.error("Auto-play blocked:", e));
    isPlaying.value = true;
  }
};

const stopHardMode = () => {
  if (audioPlayer.value) {
    audioPlayer.value.pause();
    isPlaying.value = false;
  }
};

const handleSongEnd = () => {
  isPlaying.value = false;
  alert(`挑战结束！\n最终完成度: ${accuracy.value}%`);
};

const handleLoadedMetadata = (e) => {
  songDuration.value = e.target.duration;
  console.log("歌曲总时长:", songDuration.value);
};

const handleTimeUpdate = (e) => {
  if (currentMode.value !== 'hard') return;
  const now = e.target.currentTime;
  currentTime.value = now;

  const activeCue = [...currentLightCues.value].reverse().find(cue => cue.time <= now);

  if (activeCue && activeCue.action !== lightState.value) {
    lightState.value = activeCue.action;
    console.log(`👉 灯光切换为: ${lightState.value} (在 ${now.toFixed(1)}s 触发，设定时间: ${activeCue.time}s)`);
  }

  const nextLineIndex = songLyrics.value.findIndex(l => l.start > currentTime.value); 

  let activeLineIdx = (nextLineIndex === -1) ? songLyrics.value.length - 1 : nextLineIndex - 1;
  
  if (activeLineIdx !== currentLyricLineIndex.value && activeLineIdx >= 0) {
    
    if (currentLyricLineIndex.value !== -1) {
      const remainingChars = targetString.value.length - currentIndex.value;
      if (remainingChars > 0) {
        triggerMiss(remainingChars);
      }
    }

    currentLyricLineIndex.value = activeLineIdx;
    
    const newText = songLyrics.value[activeLineIdx].text;
    
    totalCharsPassed.value += newText.length;
    
    targetString.value = newText.split('');
    currentIndex.value = 0; 
  }
};

const triggerMiss = (count = 1) => {
  isMissed.value = true;
  combo.value = 0; 
  setTimeout(() => isMissed.value = false, 300);
};

const advance = () => {
  currentIndex.value++;
  
  if (currentMode.value === 'hard') {
    score.value++;
    combo.value++;
  } else {
    if (currentIndex.value > targetString.value.length - displayLength) {
      if (currentMode.value === 'basic') {
        targetString.value.push(..."abcdefghijklmnopqrstuvwxyz".split(''));
      } else {
        const chars = "abcdefghijklmnopqrstuvwxyz";
        for(let i=0; i<20; i++) {
          targetString.value.push(chars.charAt(Math.floor(Math.random() * chars.length)));
        }
      }
    }
  }
};

// --- 事件处理 ---

const handleKeyDown = (e) => {
  pressedKeys.value.add(e.code);
  
  const target = currentTargetChar.value;
  if (!target) return;

  if (e.key.length > 1 && e.key !== ' ' && e.key !== 'Backspace') return;

  if (e.key.toLowerCase() === target.toLowerCase()) {
    advance();
  } else {
    if (currentMode.value === 'hard') {
       combo.value = 0;
       isMissed.value = true;
       setTimeout(() => isMissed.value = false, 200);
    }
  }
};

const handleKeyUp = (e) => {
  pressedKeys.value.delete(e.code);
};

const togglePlay = (event) => {
  if (event) event.target.blur();

  if (isPlaying.value) {
    if (audioPlayer.value) audioPlayer.value.pause();
    isPlaying.value = false;
  } else {
    if (targetString.value.length === 0) {
      startHardMode(); 
    } else {
      if (audioPlayer.value) {
        audioPlayer.value.play();
        isPlaying.value = true;
      }
    }
  }
};

const blurElement = (e) => {
  e.target.blur();
};

onMounted(() => {
  updateHeaderColor(); // 初始化时设置颜色
  generateText();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  const setHeaderBgColor = inject('setHeaderBgColor');
  if (setHeaderBgColor) {
      setHeaderBgColor('transparent'); 
  }

  stopHardMode();
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});

// 监听主题变化 -> 更新 Header
watch(() => userStore.theme, updateHeaderColor);

// 监听模式变化 -> 更新 Header
watch(currentMode, updateHeaderColor);

</script>

<style scoped>
/* =========================================
   全局变量与基础容器
   ========================================= */
.typing-container {
  /* 默认（浅色模式）变量 */
  --bg-color: #ffffff;
  --key-bg: #ffffff;
  --key-shadow: #d1d5db;
  --text-color: #374151;
  --highlight-blue: #2196f3;
  --hand-color: rgba(224, 184, 170, 0.7);
  --finger-active: #2196f3;
  --header-text: #333;
  
  /* 基础样式 */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  overflow: hidden; 
  padding: 40px;
  box-sizing: border-box;
  position: relative; 
  transition: background 0.3s ease, color 0.3s ease;
}

/* --- 暗夜模式覆盖 (Dark Mode) --- */
.typing-container.dark-mode {
  --bg-color: #1a202c;
  --key-bg: #2d3748;
  --key-shadow: #1a202c;
  --text-color: #e2e8f0;
  --header-text: #e2e8f0;
}

/* 困难模式 (Hard Mode) - 优先级最高 */
.typing-container.hard-mode-active {
  /* 深蓝色/紫色渐变背景，模拟舞台迷雾 */
  background: radial-gradient(circle at center 30%, #2b32b2, #141e30);
  --text-color: rgba(255, 255, 255, 0.9);
}

/* 暗夜模式下，键盘区背景调整 */
.typing-container.dark-mode .keyboard-wrapper {
  background: #2d3748; /* 深色键盘底座 */
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

/* 暗夜模式下，字母显示区调整 */
.typing-container.dark-mode .letter-box {
  background: #2d3748;
  color: #a0aec0;
  border-color: #4a5568;
}
.typing-container.dark-mode .letter-box.current {
  background-color: var(--highlight-blue);
  color: white;
  border-color: var(--highlight-blue);
}

/* 暗夜模式下，顶部按钮调整 */
.typing-container.dark-mode button {
  background-color: #2d3748;
  color: #e2e8f0;
}
.typing-container.dark-mode button.active {
  background-color: var(--highlight-blue);
  color: white;
}


/* =========================================
   以下为原有特效与动画代码 (完全保留)
   ========================================= */

/* 让计分板在困难模式下“隐形”融入背景 */
.typing-container.hard-mode-active .score-board {
  background: transparent;
  box-shadow: none;
  border: none;
  color: rgba(255, 255, 255, 0.9);
}

/* 困难模式下，文字颜色调整为白色 */
.typing-container.hard-mode-active .stats,
.typing-container.hard-mode-active .song-selector label {
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

/* 困难模式下的下拉框适配 */
.score-board:has(.night-mode) .song-selector select {
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-color: rgba(100, 200, 255, 0.5);
}

/* =========================================
   修改版：离散式缭绕烟雾 (Organic Smoke Blobs)
   ========================================= */

.fog-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0; /* 在最底层 */
  pointer-events: none;
}

/* 烟团公共样式 */
.fog-cloud {
  position: absolute;
  border-radius: 50%; /* 圆形基础 */
  filter: blur(40px); /* 极高的模糊度，晕染成烟气 */
  opacity: 0; /* 默认隐藏，靠动画淡入淡出 */
}

/* 烟团 1：核心烟雾，横穿歌词区域 */
.cloud-1 {
  width: 600px;
  height: 300px;
  top: 30%; 
  left: -20%;
  background: radial-gradient(closest-side, rgba(200, 230, 255, 0.15), transparent);
  animation: float-across 18s ease-in-out infinite;
}

/* 烟团 2：底部的厚重氛围 */
.cloud-2 {
  width: 800px;
  height: 400px;
  bottom: -100px;
  right: -10%; 
  background: radial-gradient(closest-side, rgba(180, 200, 255, 0.1), transparent);
  animation: breathe-drift 25s ease-in-out infinite alternate;
  transform: rotate(-10deg); 
}

/* 烟团 3：干扰烟雾 */
.cloud-3 {
  width: 400px;
  height: 400px;
  top: 50%;
  right: 10%;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.05), transparent);
  animation: swirl-fade 15s linear infinite;
}

/* --- 烟雾动画定义 --- */
@keyframes float-across {
  0% { transform: translateX(0) scale(0.8); opacity: 0; }
  20% { opacity: 0.8; }
  80% { opacity: 0.6; }
  100% { transform: translateX(120vw) scale(1.2); opacity: 0; }
}
@keyframes breathe-drift {
  0% { transform: rotate(-10deg) translate(0, 0) scale(1); opacity: 0.3; }
  50% { transform: rotate(5deg) translate(-50px, -50px) scale(1.2); opacity: 0.6; }
  100% { transform: rotate(-5deg) translate(20px, 20px) scale(1.1); opacity: 0.3; }
}
@keyframes swirl-fade {
  0% { transform: rotate(0deg) scale(0.5); opacity: 0; }
  50% { opacity: 0.4; transform: rotate(180deg) scale(1); }
  100% { transform: rotate(360deg) scale(1.5); opacity: 0; }
}

/* =========================================
   顶部面板与控件
   ========================================= */
.header-panel {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 10; /* 保证在烟雾之上 */
}

.controls {
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
}

/* 通用按钮样式 */
button {
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background-color: white;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: all 0.2s;
}
button.active {
  background-color: var(--highlight-blue);
  color: white;
}

/* 困难模式按钮特殊样式 */
.hard-mode-btn {
  background: #ff5722;
  color: white;
}
.hard-mode-btn.active {
  background: #d84315;
}

/* 按钮脉冲动画 */
@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 87, 34, 0.7); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 87, 34, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 87, 34, 0); }
}
.pulse { animation: pulse 2s infinite; }

/* 计分板容器 */
.score-board {
  width: 100%;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  transition: all 0.5s ease;
}

/* 歌曲选择与迷你控制器区域 */
.song-selector {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
  z-index: 10;
}

.song-selector select {
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.3);
  font-size: 14px;
  outline: none;
  background-color: rgba(255, 255, 255, 0.1);
  color: #333;
  transition: all 0.3s;
  cursor: pointer;
}

/* 新增：迷你控制按钮样式 */
.mini-control-btn {
  padding: 8px 24px;
  font-size: 14px;
  font-weight: bold;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 5px;
  background: linear-gradient(135deg, #ff5722, #ff9800);
  color: white;
  box-shadow: 0 4px 10px rgba(255, 87, 34, 0.4);
}
.mini-control-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(255, 87, 34, 0.6);
}
.mini-control-btn:active { transform: translateY(0); }
/* 播放中状态 */
.mini-control-btn.playing {
  background: linear-gradient(135deg, #2196f3, #21cbba);
  box-shadow: 0 4px 10px rgba(33, 150, 243, 0.4);
  padding-left: 20px;
  padding-right: 20px;
}
.mini-control-btn.playing:hover {
  box-shadow: 0 0 15px rgba(33, 203, 186, 0.6);
}

/* 统计信息 */
.stats {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  color: #555;
}

/* =========================================
   顶部滑轨式进度条
   ========================================= */
/* 1. 轨道槽 (Track) - 最底层 */
.progress-bar {
  width: 100%;
  height: 10px;
  background: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 10px;
  position: relative;
}

/* 困难模式下的轨道槽：变细，变暗 */
.progress-bar.night-mode {
  height: 6px;
  background: rgba(255, 255, 255, 0.15);
  overflow: visible; /* 允许光束伸出 */
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}

/* 2. 时间进度条 (Time Fill) - 中间层 (蓝色) */
.time-fill {
  height: 100%;
  background: #2196f3;
  transition: width 0.1s linear;
  border-radius: 5px;
  position: relative; /* 作为得分条和光束的参照容器 */
}
/* 困难模式下覆盖颜色 */
.progress-bar.night-mode .time-fill {
  background: rgba(33, 150, 243, 0.6);
}

/* 3. 得分进度条 (Score Fill) - 最上层 (橙色/发光色) */
.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff9800, #ff5722);
  border-radius: 5px;
  transition: width 0.3s ease;
  max-width: 100%;
}
/* 困难模式下的得分条：强烈发光 */
.progress-bar.night-mode .score-fill {
  background: linear-gradient(90deg, #fff, #ffcc80);
  box-shadow: 
    0 0 10px 2px rgba(255, 152, 0, 0.7),
    0 0 20px 5px rgba(255, 255, 255, 0.5);
}


/* =========================================
   歌词显示与 KTV 风格
   ========================================= */
.display-area-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 10; /* 保证在烟雾之上 */
}

/* 歌词预览 */
.lyrics-preview {
  height: 24px;
  color: #999;
  font-size: 14px;
  margin-bottom: 5px;
}

/* 歌词主显示区 */
.display-area {
  display: flex;
  gap: 10px;
  margin-bottom: 40px;
  height: 80px;
  transition: transform 0.1s;
}
/* 错误震动 */
.shake { animation: shake 0.3s; }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* 基础模式字母框 */
.letter-box {
  width: 60px; height: 60px;
  background: white; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; font-family: monospace; color: #ccc;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.2s;
}
.letter-box.current {
  background-color: var(--highlight-blue);
  color: white; border-color: var(--highlight-blue);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

/* 困难模式 KTV 风格歌词 */
.display-area:has(.karaoke-line) {
  flex-wrap: wrap;
  justify-content: center;
  height: auto;
  min-height: 80px;
}
.karaoke-line {
  font-size: 36px; font-weight: bold; letter-spacing: 2px; line-height: 1.5;
  color: #e0e0e0;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
  font-family: "Menlo", "Consolas", monospace;
  text-align: center;
  transition: all 0.2s;
}
.karaoke-char {
  display: inline-block;
  transition: color 0.1s, transform 0.1s;
  position: relative;
}
.karaoke-char.done {
  color: #ff5722;
  text-shadow: 0 0 10px rgba(255, 87, 34, 0.4);
}
.karaoke-char.active {
  color: #2196f3;
  transform: scale(1.3) translateY(-5px);
  text-shadow: 0 5px 10px rgba(33, 150, 243, 0.4);
  border-bottom: 3px solid #2196f3;
}
.waiting-icon {
  font-size: 20px; color: #888; margin-top: 20px; font-weight: normal;
  animation: fade 1s infinite alternate;
}
@keyframes fade { from { opacity: 0.5; } to { opacity: 1; } }

/* 困难模式下歌词样式适配 (配合灯光) */
.typing-container.hard-mode-active .karaoke-line {
  color: rgba(255, 255, 255, 0.15);
  text-shadow: none;
  z-index: 20; /* 确保在光束前面 */
}
.typing-container.hard-mode-active .karaoke-char.active {
  color: #fff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(0, 150, 255, 0.6);
  transform: scale(1.4); border-bottom: none;
}
.typing-container.hard-mode-active .karaoke-char.done {
  color: #a8c0ff;
  text-shadow: 0 0 5px rgba(168, 192, 255, 0.4);
}
/* 配合键盘隐藏，调整歌词位置 */
.typing-container.hard-mode-active .display-area-wrapper {
  flex-grow: 1;
  justify-content: center;
  transform: translateY(-50px);
}

/* =========================================
   键盘与手部 (基础模式显示，困难模式隐藏)
   ========================================= */
.keyboard-wrapper {
  position: relative;
  background: #e0e0e0;
  padding: 20px;
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  transition: all 0.8s ease; /* 过渡动画 */
  z-index: 10;
}

/* 困难模式下隐藏键盘 */
.typing-container.hard-mode-active .keyboard-wrapper {
  opacity: 0;
  transform: translateY(50px);
  pointer-events: none;
  max-height: 0;
  margin: 0; padding: 0;
  overflow: hidden;
}

/* 键盘基础样式 (保持不变) */
.keyboard { display: flex; flex-direction: column; gap: 6px; }
.row { display: flex; justify-content: center; gap: 6px; }
.key {
  height: 45px; width: 45px; background: var(--key-bg); border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 500; color: var(--text-color);
  box-shadow: 0 2px 0 var(--key-shadow); position: relative; transition: all 0.1s; user-select: none;
}
.key.wide { width: 70px; font-size: 12px; }
.key.space { width: 300px; }
.key.highlight { background-color: var(--highlight-blue); color: white; box-shadow: 0 2px 0 #1976d2; }
.key.pressed { transform: translateY(2px); box-shadow: none; }

/* 手部层 (保持不变) */
.hands-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;
  display: flex; justify-content: space-between; padding: 0 50px; box-sizing: border-box; z-index: 10;
}
.hand {
  width: 280px; height: 300px; position: absolute; bottom: -80px; opacity: 0.8; transition: transform 0.2s ease-out;
}
.hand-left { left: 5%; } .hand-right { right: 5%; }
.hand svg { width: 100%; height: 100%; fill: var(--hand-color); }
.finger { transition: fill 0.2s; }
.finger.active { fill: var(--finger-active); }
.move-up { transform: translateY(-10px); }

/* 隐藏的音频元素 */
.audio-hidden { position: absolute; opacity: 0; pointer-events: none; height: 0; width: 0; }


/* =========================================
   高端体积光束效果 (Volumetric Spotlight) - V9 回归真实物理模型版
   ========================================= */

/* 1. 定位容器 (保持不变) */
.spotlight-wrapper {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  display: flex;
  justify-content: center;
  z-index: 999;
  transition: opacity 1s ease;
}

/* 2. 灯头 (保持V6的高亮真实感) */
.spotlight-head {
  position: absolute;
  top: -10px; 
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  z-index: 10;
  /* 多层高亮光晕，模拟强光刺眼的效果 */
  box-shadow: 
    0 0 15px 5px rgba(255, 255, 255, 1),   /* 核心白光 */
    0 0 30px 15px rgba(200, 230, 255, 0.8), /* 中层蓝白光晕 */
    0 0 60px 30px rgba(100, 200, 255, 0.5); /* 外层大范围蓝光 */
  opacity: 0.95;
  transition: all 1s ease;
}

/* 3. 光束 (回归V6的真实物理渐变) */
.beam {
  position: absolute;
  top: 0;
  left: 50%;
  transform-origin: top center;
  pointer-events: none;
  /* 关键：使用 screen 混合模式，让光叠加变亮，自然柔和 */
  mix-blend-mode: screen;
  
  width: 36px; 
  margin-left: -18px; 
  /* 足够长，射出屏幕 */
  height: 150vh; 
  
  /* 【核心】回归真实的体积光渐变 */
  /* 从上到下：高亮核心 -> 蓝白光柱 -> 透明衰减 */
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.8) 0%,    /* 根部高亮 */
    rgba(220, 245, 255, 0.6) 15%,   /* 核心光柱区 */
    rgba(150, 220, 255, 0.3) 40%,   /* 中段衰减区 */
    rgba(100, 200, 255, 0.1) 70%,   /* 远端淡出区 */
    rgba(0, 0, 0, 0) 100%           /* 完全消失 */
  );
  
  /* 较大的模糊，创造柔和的空气感和丁达尔效应 */
  filter: blur(12px);
  
  opacity: 0;
  transform: rotate(0deg);
  /* 平滑过渡 */
  transition: opacity 1.5s ease-in-out, transform 1.5s ease-in-out, filter 1.5s ease-in-out;
}

/* --- 动画关键帧 --- */
/* 【新】轻微摇摆动画：让散开的光束更有生气，不是死板固定 */
@keyframes subtle-sway {
    from { transform: rotate(calc(var(--base-angle) - 3deg)); }
    to { transform: rotate(calc(var(--base-angle) + 3deg)); }
}

/* --- 状态 A: 关闭 (state-off) --- */
.spotlight-wrapper.state-off .spotlight-head { opacity: 0; box-shadow: none; }
.spotlight-wrapper.state-off .beam { opacity: 0; }

/* --- 状态 B: 四散旋转 (state-scattered) --- */
.spotlight-wrapper.state-scattered .spotlight-head {
    opacity: 1;
    transform: translateX(-50%) scale(1);
}
.spotlight-wrapper.state-scattered .beam {
    opacity: 0.8; /* 稍微提高一点透明度，因为光束细了，可以更亮一点 */
    transform: rotate(var(--base-angle));
}

/* --- 光束动画关键帧 (保持不变) --- */
@keyframes rotate-beam-1 { from { transform: rotate(calc(-25deg - 8deg)); } to { transform: rotate(calc(-25deg + 8deg)); } }
@keyframes rotate-beam-2 { from { transform: rotate(calc(-8deg - 6deg)); }  to { transform: rotate(calc(-8deg + 6deg)); } }
@keyframes rotate-beam-3 { from { transform: rotate(calc(8deg - 6deg)); }   to { transform: rotate(calc(8deg + 6deg)); } }
@keyframes rotate-beam-4 { from { transform: rotate(calc(25deg - 8deg)); }  to { transform: rotate(calc(25deg + 8deg)); } }


/* 3. 光束 (保持“虚实虚”效果) */
.beam {
  position: absolute;
  top: 0;
  left: 50%;
  transform-origin: top center;
  pointer-events: none;
  mix-blend-mode: screen;
  width: 30px; 
  margin-left: -18px; 
  height: 150vh; 
  
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 95%);
  mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 95%);

  background: linear-gradient(
    to right,
    rgba(100, 200, 255, 0) 0%,
    rgba(130, 220, 255, 0.4) 15%,
    rgba(255, 255, 255, 1) 45%,
    rgba(255, 255, 255, 1) 55%,
    rgba(130, 220, 255, 0.4) 85%,
    rgba(100, 200, 255, 0) 100%
  );
  
  filter: blur(5px);
  
  opacity: 0;
  /* 默认角度为 0 */
  transform: rotate(0deg);
  /* 平滑过渡 */
  transition: opacity 1.5s ease-in-out, transform 1.5s ease-in-out, filter 1.5s ease-in-out;
}

/* --- 定义光束的基础散开角度 --- */
.beam-1 { --base-angle: -35deg; }
.beam-2 { --base-angle: -12deg; }
.beam-3 { --base-angle: 12deg; }
.beam-4 { --base-angle: 35deg; }

/* 【核心改动】每束光独立应用动画，实现旋转和动态合并 */
.spotlight-wrapper.state-scattered .beam-1 { animation: rotate-and-merge-1 8s infinite alternate ease-in-out; }
.spotlight-wrapper.state-scattered .beam-2 { animation: rotate-and-merge-2 8s infinite alternate ease-in-out; }
.spotlight-wrapper.state-scattered .beam-3 { animation: rotate-and-merge-3 8s infinite alternate ease-in-out; }
.spotlight-wrapper.state-scattered .beam-4 { animation: rotate-and-merge-4 8s infinite alternate ease-in-out; }


/* 【核心动画】旋转并合并的关键帧 */
/* 每个动画都从其基础角度开始，然后旋转到 0 度 (合并)，再旋转到相反角度 */
@keyframes rotate-and-merge-1 {
    0% { transform: rotate(var(--base-angle)); }
    50% { transform: rotate(0deg); } /* 合并 */
    100% { transform: rotate(calc(var(--base-angle) * -1)); }
}
@keyframes rotate-and-merge-2 {
    0% { transform: rotate(var(--base-angle)); }
    50% { transform: rotate(0deg); } /* 合并 */
    100% { transform: rotate(calc(var(--base-angle) * -1)); }
}
@keyframes rotate-and-merge-3 {
    0% { transform: rotate(var(--base-angle)); }
    50% { transform: rotate(0deg); } /* 合并 */
    100% { transform: rotate(calc(var(--base-angle) * -1)); }
}
@keyframes rotate-and-merge-4 {
    0% { transform: rotate(var(--base-angle)); }
    50% { transform: rotate(0deg); } /* 合并 */
    100% { transform: rotate(calc(var(--base-angle) * -1)); }
}

/* 合并呼吸动画 */
@keyframes breathe-merged {
    0% { transform: rotate(0deg) scaleX(3); opacity: 0.7; filter: blur(15px); }
    100% { transform: rotate(0deg) scaleX(3.8); opacity: 0.5; filter: blur(20px); }
}
</style>