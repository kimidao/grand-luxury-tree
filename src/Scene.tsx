import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';

// 1. 数学逻辑
const getChaosPos = (r = 30) => { 
  // 范围适中，不要太远，保证漂浮在屏幕内
  const u = Math.random(), v = Math.random();
  const t = 2 * Math.PI * u, p = Math.acos(2 * v - 1);
  return new THREE.Vector3(r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p));
};

const getTreePos = (h = 14, baseR = 6.5) => {
  const y = Math.random() * h;
  const p = y / h; 
  const r = baseR * (1 - p) * Math.pow(Math.random(), 0.4); 
  const a = Math.random() * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a) * r, y - 6, Math.sin(a) * r);
};

// 2. 视觉控制器 (保持不变)
export const VisionController = () => {
  const { setChaos, setHandPosition } = useStore();
  const smoothPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let recognizer: GestureRecognizer;
    let video: HTMLVideoElement;
    let animationId: number;
    let lastVideoTime = -1;

    const setup = async () => {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
      recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task", delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      video = document.createElement("video");
      video.srcObject = stream;
      video.play();
      loop();
    };

    const loop = () => {
      if (video && video.readyState === 4 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const res = recognizer.recognizeForVideo(video, Date.now());
        if (res.gestures.length > 0) {
          const isUnleash = res.gestures[0][0].categoryName === "Open_Palm" && res.gestures[0][0].score > 0.6;
          setChaos(isUnleash);
          if (res.landmarks[0]) {
            smoothPos.current.x += ((res.landmarks[0][8].x - 0.5) * -2 - smoothPos.current.x) * 0.15;
            smoothPos.current.y += ((res.landmarks[0][8].y - 0.5) * -2 - smoothPos.current.y) * 0.15;
            setHandPosition(smoothPos.current.x, smoothPos.current.y);
          }
        } else {
          setChaos(false);
          smoothPos.current.x += (0 - smoothPos.current.x) * 0.05;
          smoothPos.current.y += (0 - smoothPos.current.y) * 0.05;
          setHandPosition(smoothPos.current.x, smoothPos.current.y);
        }
      }
      animationId = requestAnimationFrame(loop);
    };
    setup();
    return () => { cancelAnimationFrame(animationId); if(video?.srcObject) (video.srcObject as MediaStream).getTracks().forEach(t=>t.stop()); };
  }, []);
  return null;
};

// 3. 针叶系统 (梦幻漂浮版)
export const Foliage = () => {
  const mesh = useRef<THREE.Points>(null);
  // 必须把 Material 存到 ref 里以便更新 uniform
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const isChaos = useStore(s => s.isChaos);
  const count = 20000;
  
  // 用于平滑过渡粒子大小的变量
  const chaosFactor = useRef(0);

  const data = useMemo(() => {
    const chaos = [], tree = [], col = [], scale = [], driftPhase = [];
    const cDeep = new THREE.Color("#001a0a"); 
    const cMid = new THREE.Color("#003311");
    const cTip = new THREE.Color("#1a4d2e");

    for (let i = 0; i < count; i++) {
      const t = getTreePos();
      const c = getChaosPos(25); // 稍微分散一点
      tree.push(t.x, t.y, t.z);
      chaos.push(c.x, c.y, c.z);

      const r = Math.random();
      let color;
      if (r < 0.4) color = cDeep;
      else if (r < 0.8) color = cMid;
      else color = cTip;

      col.push(color.r, color.g, color.b);
      scale.push(Math.random() * 0.8 + 0.4);
      
      // 每个粒子有不同的漂浮相位，避免整齐划一的移动
      driftPhase.push(Math.random() * Math.PI * 2);
    }
    return { 
      chaos: new Float32Array(chaos), 
      tree: new Float32Array(tree), 
      col: new Float32Array(col), 
      scale: new Float32Array(scale),
      driftPhase: new Float32Array(driftPhase)
    };
  }, []);

  useFrame((state, dt) => {
    if (!mesh.current || !materialRef.current) return;
    const arr = mesh.current.geometry.attributes.position.array as Float32Array;
    
    // --- 1. 状态过渡逻辑 ---
    const targetFactor = isChaos ? 1.0 : 0.0;
    // 缓动 chaosFactor：用于控制粒子大小
    chaosFactor.current += (targetFactor - chaosFactor.current) * dt * 2.0;
    // 更新 Shader 里的 uniform
    materialRef.current.uniforms.uChaos.value = chaosFactor.current;

    // --- 2. 运动速度逻辑 ---
    // 散开时极慢 (0.8)，聚合时快 (4.0)
    const speed = isChaos ? 0.8 : 4.0;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
      
      let tx = isChaos ? data.chaos[ix] : data.tree[ix];
      let ty = isChaos ? data.chaos[iy] : data.tree[iy];
      let tz = isChaos ? data.chaos[iz] : data.tree[iz];

      // --- 3. 漂浮逻辑 (Floating) ---
      // 只有在散开状态下才漂浮
      if (isChaos) {
        const phase = data.driftPhase[i];
        // 上下左右缓慢浮动 (像灰尘一样)
        tx += Math.sin(time * 0.5 + phase) * 2.0; 
        ty += Math.cos(time * 0.3 + phase) * 2.0;
        tz += Math.sin(time * 0.4 + phase) * 1.0;
      }

      // Lerp 插值
      arr[ix] += (tx - arr[ix]) * dt * speed;
      arr[iy] += (ty - arr[iy]) * dt * speed;
      arr[iz] += (tz - arr[iz]) * dt * speed;
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
    
    // 聚合时自转，散开时不整体旋转（依靠粒子自身漂浮）
    if (!isChaos) mesh.current.rotation.y += dt * 0.1;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        {/* 加上这一行忽略报错 */}
        {/* @ts-ignore */}
        <bufferAttribute attach="attributes-position" count={count} array={data.tree.slice()} itemSize={3} />
        
        {/* 加上这一行忽略报错 */}
        {/* @ts-ignore */}
        <bufferAttribute attach="attributes-color" count={count} array={data.col} itemSize={3} />
        
        {/* 加上这一行忽略报错 */}
        {/* @ts-ignore */}
        <bufferAttribute attach="attributes-aScale" count={count} array={data.scale} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={`
          uniform float uP; 
          uniform float uChaos; // 0=树, 1=散开
          attribute float aScale; 
          varying vec3 vC; 
          void main() { 
            vC = color; 
            vec4 m = modelViewMatrix * vec4(position, 1.0);
            
            // 关键修改：散开时，粒子变大 5 倍 (1.0 + uChaos * 4.0)
            float sizeMult = 1.0 + uChaos * 4.0;
            
            gl_PointSize = aScale * sizeMult * uP * (90.0 / -m.z); 
            gl_Position = projectionMatrix * m; 
          }
        `}
        fragmentShader="varying vec3 vC; void main() { float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vC, 1.0); }"
        uniforms={{ 
          uP: { value: Math.min(window.devicePixelRatio, 2) },
          uChaos: { value: 0 } // 初始化
        }}
        transparent={false} depthWrite={true} vertexColors
      />
    </points>
  );
};

// 4. 装饰物：变大漂浮
export const Ornaments = ({ count, type, weight }: any) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const isChaos = useStore(s => s.isChaos);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const data = useMemo(() => new Array(count).fill(0).map(() => ({
    t: getTreePos(13.8, 6.6), 
    c: getChaosPos(35), 
    cur: getTreePos(13.8, 6.6), 
    // 基础尺寸 (树形态)
    baseScale: Math.random() * 0.3 + 0.15,
    rot: [Math.random()*Math.PI, Math.random()*Math.PI],
    phase: Math.random() * Math.PI * 2
  })), []);

  useFrame((state, dt) => {
    if (!mesh.current) return;
    const time = state.clock.elapsedTime;
    // 速度：散开慢，回来快
    const speed = dt * (isChaos ? 0.8 : 3.0) * weight;

    data.forEach((d, i) => {
      let target = isChaos ? d.c : d.t;
      
      // 漂浮逻辑
      let floatX = 0, floatY = 0, floatZ = 0;
      if(isChaos) {
         floatX = Math.sin(time * 0.5 + d.phase) * 2.0;
         floatY = Math.cos(time * 0.3 + d.phase) * 2.0;
         floatZ = Math.sin(time * 0.4 + d.phase) * 1.0;
      }
      
      // 我们不直接修改 d.c，而是计算一个临时目标
      const dest = new THREE.Vector3(target.x + floatX, target.y + floatY, target.z + floatZ);

      d.cur.lerp(dest, speed);
      dummy.position.copy(d.cur);
      
      // 旋转：散开时慢慢自转
      const rotSpeed = isChaos ? 0.2 : 1.0;
      dummy.rotation.set(d.rot[0] + time * rotSpeed, d.rot[1] + time * rotSpeed, 0);
      
      if (type === 'photo') { dummy.lookAt(0, d.cur.y, 0); dummy.rotateY(Math.PI); }
      
      // --- 尺寸放大逻辑 ---
      // 树形态：1倍大小；散开形态：2.5倍大小
      let scaleMult = isChaos ? 2.5 : 1.0;
      
      // 类型修正
      if (type === 'ball') scaleMult *= 0.6; // 球本身小一点
      
      // Lerp 尺寸，让变大变小也很丝滑
      const currentScale = dummy.scale.x; // 假设xyz缩放一致
      const targetScale = d.baseScale * scaleMult;
      const smoothScale = THREE.MathUtils.lerp(currentScale, targetScale, dt * 2.0);

      dummy.scale.setScalar(smoothScale);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  let color = "#FFFFFF", emissive = "#000000", metalness = 0.5, roughness = 0.5;
  if (type === 'ball') { color = "#FFD700"; emissive = "#aa6600"; metalness = 1.0; roughness = 0.0; } 
  else if (type === 'box') { color = "#770000"; metalness = 0.4; roughness = 0.7; emissive = "#220000"; } 
  else if (type === 'photo') { color = "#FFFFFF"; emissive = "#FFFFFF"; metalness = 0.0; }

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      {type === 'box' ? <boxGeometry args={[0.7, 0.7, 0.7]} /> : type==='ball' ? <sphereGeometry args={[0.6, 32, 32]} /> : <planeGeometry args={[0.6, 0.8]} />}
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={type === 'photo' ? 1.5 : 0.2} metalness={metalness} roughness={roughness} />
    </instancedMesh>
  );
};