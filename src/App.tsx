import { Suspense, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, PerspectiveCamera, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { useStore } from './store';
import { Foliage, Ornaments, VisionController } from './Scene';
import { Snow } from './Snow'; // 引入雪花
import { AudioController } from './AudioController'; // 引入音频
import * as THREE from 'three';

const Rig = () => {
  const { camera } = useThree();
  const pos = useStore(s => s.handPosition);
  useFrame((_, dt) => {
    camera.position.lerp(new THREE.Vector3(pos.x * 6, 4 + pos.y * 3, 20 + Math.abs(pos.x) * 4), dt * 1.5);
    camera.lookAt(0, 3, 0);
  });
  return null;
}

export default function App() {
  // 增加开始状态，用于处理音频自动播放策略
  const [started, setStarted] = useState(false);

  return (
    <div className="w-full h-screen bg-[#000502] relative font-serif">
      {/* 3D 场景 */}
      <Canvas gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}>
        <PerspectiveCamera makeDefault position={[0, 4, 20]} fov={40} />
        <color attach="background" args={['#000502']} />
        <fog attach="fog" args={['#000502', 8, 45]} />

        <Suspense fallback={null}>
          <Environment preset="forest" />
          <ambientLight intensity={0.1} />
          <spotLight position={[5, 20, 5]} angle={0.4} penumbra={0.5} intensity={30} color="#fff5cc" castShadow />
          <pointLight position={[0, -2, 0]} intensity={10} distance={15} color="#ffaa00" decay={2} />
          <pointLight position={[0, 3, 0]} intensity={8} distance={15} color="#ffaa00" decay={2} />

          <Rig />

          <group position={[0, -4.5, 0]}>
            <Foliage />
            <Ornaments count={80} type="box" weight={0.8} /> 
            <Ornaments count={250} type="ball" weight={2.2} />
            <Ornaments count={40} type="photo" weight={1.2} />
            
            {/* 新增：下雪效果 */}
            <Snow />

            <Sparkles count={400} scale={10} size={2} speed={0.4} opacity={0.8} color="#FFD700" />
            <Sparkles count={200} scale={20} size={5} speed={0.3} opacity={0.5} color="#ffeeaa" />
          </group>

          <ContactShadows opacity={0.8} scale={30} blur={3} color="#000" />

          <EffectComposer>
            <Bloom luminanceThreshold={0.8} intensity={2.0} mipmapBlur radius={0.5} />
            <Vignette darkness={1.2} offset={0.2} />
            <Noise opacity={0.05} />
          </EffectComposer>

          {/* 只有点击开始后，才启动摄像头检测，节省性能 */}
          {started && <VisionController />}
        </Suspense>
      </Canvas>

      {/* 音频控制器 (无 UI) */}
      <AudioController started={started} />

      {/* UI 层 */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${started ? 'opacity-100 pointer-events-none' : 'opacity-0'}`}>
        <div className="absolute top-16 left-0 w-full flex flex-col items-center justify-center select-none">
          <h1 className="text-4xl md:text-6xl text-[#FFD700] tracking-wider drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]">
            GRAND LUXURY
          </h1>
          <h2 className="text-emerald-100 text-sm md:text-base tracking-[0.5em] mt-2 font-light uppercase opacity-80">
            Deep Forest Edition
          </h2>
        </div>

        <div className="absolute bottom-12 w-full flex flex-col items-center justify-center opacity-80 select-none text-emerald-100">
          <div className="flex flex-col items-center mb-4 text-[#FFD700]">
            <div className="w-8 h-8 border border-[#FFD700] rounded-full flex items-center justify-center mb-1 animate-pulse shadow-[0_0_10px_#FFD700]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575V12a1.5 1.5 0 003 1.5h6.375a1.5 1.5 0 011.5 1.5v9" />
              </svg>
            </div>
            <p className="text-[10px] font-mono tracking-widest">HAND DETECTED</p>
          </div>
          <div className="flex gap-16 text-[10px] md:text-xs font-bold tracking-widest text-center text-emerald-200/50">
            <div className="flex flex-col items-center">
              <span className="text-[#FFD700] text-lg mb-1">✋</span>
              <p>OPEN HAND</p>
              <p className="opacity-50 font-light">UNLEASH CHAOS</p>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[#FFD700] text-lg mb-1">✊</span>
              <p>CLOSED FIST</p>
              <p className="opacity-50 font-light">FORM TREE</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- 开始遮罩层 (点击以播放音乐) --- */}
      {!started && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer transition-opacity"
             onClick={() => setStarted(true)}>
          <div className="text-center group">
             <h1 className="text-5xl md:text-7xl text-[#FFD700] tracking-widest drop-shadow-[0_0_25px_rgba(255,215,0,0.8)] mb-8">
               EDZİE
             </h1>
             <div className="inline-block px-8 py-3 border border-[#FFD700] text-[#FFD700] tracking-[0.3em] text-sm hover:bg-[#FFD700] hover:text-black transition-all duration-500">
               ENTER EXPERIENCE
             </div>
             <p className="text-emerald-500/50 mt-4 text-xs font-mono">TURN ON SOUND & CAMERA</p>
          </div>
        </div>
      )}
    </div>
  )
}