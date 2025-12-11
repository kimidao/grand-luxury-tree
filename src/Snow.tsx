import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const Snow = () => {
  const mesh = useRef<THREE.Points>(null);
  const count = 2000; // 雪花数量

  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const opacity = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // 随机分布在场景中，范围大一些
      positions[i * 3] = (Math.random() - 0.5) * 50;     // X
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40; // Y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50; // Z
      
      speeds[i] = Math.random() * 0.05 + 0.02; // 下落速度
      opacity[i] = Math.random() * 0.5 + 0.3;  // 透明度
    }
    return { positions, speeds, opacity };
  }, []);

  useFrame((_, dt) => {
    if (!mesh.current) return;
    const pos = mesh.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Y轴下落
      pos[i * 3 + 1] -= data.speeds[i] * (dt * 60);

      // 如果落到底部 (-15)，回到顶部 (20)
      if (pos[i * 3 + 1] < -15) {
        pos[i * 3 + 1] = 20;
        // 重置 X/Z，防止雪花看起来像在循环同一条路径
        pos[i * 3] = (Math.random() - 0.5) * 50;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
    
    // 整体缓慢旋转，模拟风吹
    mesh.current.rotation.y += dt * 0.05;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        {/* @ts-ignore */}
        <bufferAttribute attach="attributes-position" count={count} array={data.positions} itemSize={3} />
        {/* @ts-ignore */}
        <bufferAttribute attach="attributes-aOpacity" count={count} array={data.opacity} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        vertexShader={`
          attribute float aOpacity;
          varying float vAlpha;
          void main() {
            vAlpha = aOpacity;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 40.0 / -mvPosition.z; // 简单的透视大小
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying float vAlpha;
          void main() {
            float r = length(gl_PointCoord - 0.5);
            if (r > 0.5) discard;
            // 边缘柔和的雪花
            float glow = 1.0 - (r * 2.0);
            gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * glow);
          }
        `}
      />
    </points>
  );
};