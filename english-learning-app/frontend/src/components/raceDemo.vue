<template>
  <div ref="canvasContainer" class="scene-container"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import * as THREE from 'three';
// --- 新增: 引入 GLTFLoader ---
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- 1. 核心变量 ---
const canvasContainer = ref(null);
let scene, camera, renderer, animationId;
let trackMesh;
// let horseMesh; // 删除旧的方块马
// --- 新增: 模型和动画相关变量 ---
let horseModel, mixer, clock;
let trackTexture;

// --- 2. 配置参数 (保持不变) ---
const CONFIG = {
  cameraHeight: 5,
  cameraDistance: 10,
  trackWidth: 10,
  trackLength: 200,
  trackSpeed: 0.2,
};

// --- 3. 初始化场景 (保持不变) ---
const initScene = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 20, CONFIG.trackLength - 50);

  camera = new THREE.PerspectiveCamera(
    60,
    canvasContainer.value.clientWidth / canvasContainer.value.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, CONFIG.cameraHeight, CONFIG.cameraDistance);
  camera.lookAt(0, 0, -20);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  canvasContainer.value.appendChild(renderer.domElement);

  // 调整光源：增强一点，让模型更好看
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 20); // 调整光源位置到前上方
  scene.add(directionalLight);
  
  // 初始化时钟，用于动画更新
  clock = new THREE.Clock();
};

// --- 4. 创建跑道 (保持不变) ---
const createTrack = () => {
  const textureLoader = new THREE.TextureLoader();
  trackTexture = textureLoader.load(new URL('@/assets/textures/track.jpg', import.meta.url).href);
  trackTexture.wrapS = THREE.RepeatWrapping;
  trackTexture.wrapT = THREE.RepeatWrapping;
  trackTexture.repeat.set(1, CONFIG.trackLength / 10);

  const geometry = new THREE.PlaneGeometry(CONFIG.trackWidth, CONFIG.trackLength);
  const material = new THREE.MeshLambertMaterial({
    map: trackTexture,
    side: THREE.DoubleSide
  });
  trackMesh = new THREE.Mesh(geometry, material);
  trackMesh.rotation.x = -Math.PI / 2;
  trackMesh.position.z = -CONFIG.trackLength / 2 + 5;
  scene.add(trackMesh);
};

// --- 5. 删除旧的 createHorse 函数 ---
// const createHorse = () => { ... }

// --- 新增 5. 加载 3D 马匹模型 ---
const loadHorseModel = () => {
  const loader = new GLTFLoader();
  // 使用 URL 方式引入模型文件
  const modelUrl = new URL('@/assets/models/Horse.glb', import.meta.url).href;

  loader.load(
    modelUrl,
    (gltf) => {
      horseModel = gltf.scene;

      // 调整模型大小和方向
      horseModel.scale.set(0.02, 0.02, 0.02); // 这个模型比较大，需要缩小
      horseModel.rotation.y = Math.PI; // 模型默认朝向可能不对，转 180 度让它背对相机

      // 设置位置：在跑道上，相机前方
      horseModel.position.set(0, 0, -5);

      scene.add(horseModel);

      // --- 处理动画 ---
      // gltf.animations 包含了模型里的所有动画片段
      if (gltf.animations && gltf.animations.length > 0) {
        // 创建动画混合器
        mixer = new THREE.AnimationMixer(horseModel);
        // 获取第一个动画片段 (通常是奔跑或走路，这个模型第一个就是奔跑)
        const runClip = gltf.animations[0]; 
        // 创建播放操作
        const action = mixer.clipAction(runClip);
        // 开始播放
        action.play();
      }
      
      console.log('马匹模型加载成功!');
    },
    (xhr) => {
      // 加载进度
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
      console.error('马匹模型加载失败:', error);
    }
  );
};

// --- 6. 动画循环 (修改) ---
const animate = () => {
  animationId = requestAnimationFrame(animate);
  
  // 获取自上一帧以来的时间间隔 (deltaTime)
  const delta = clock.getDelta();

  // 1. 更新跑道纹理偏移 (保持不变)
  if (trackTexture) {
    trackTexture.offset.y -= CONFIG.trackSpeed * 0.02;
  }
  
  // 删除旧的方块动画
  // if (horseMesh) { ... }

  // 2. 新增: 更新模型动画混合器
  if (mixer) {
    mixer.update(delta);
  }

  renderer.render(scene, camera);
};

// --- 7. 处理窗口大小调整 (保持不变) ---
const handleResize = () => {
  if (!camera || !renderer || !canvasContainer.value) return;
  camera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight);
};

// --- 生命周期钩子 (修改) ---
onMounted(() => {
  initScene();
  createTrack();
  // createHorse(); // 删除旧调用
  loadHorseModel(); // 调用新的加载函数
  animate();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', handleResize);
  if (renderer && canvasContainer.value) {
    canvasContainer.value.removeChild(renderer.domElement);
  }
  // 释放资源 (简化版)
  if (mixer) mixer.stopAllAction();
});
</script>

<style scoped>
.scene-container {
  width: 100%;
  height: 100vh; /* 占满全屏 */
  overflow: hidden;
  background-color: #000;
}
</style>