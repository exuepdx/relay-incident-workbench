"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, RoundedBox, Sparkles } from "@react-three/drei";
import * as THREE from "three";

/**
 * The boundary, in three dimensions.
 *
 * Above: a glass slab (Vercel) carrying three lit nodes: Workflows, the agent,
 * and AI Gateway. Below: the customer's estate as a field of blocks. Between
 * them, streams of particles: ice-blue requests going down through the
 * boundary, teal evidence coming back up. The camera drifts and follows the
 * pointer. No post-processing; glow comes from additive sprites.
 */

const SIGNAL_COLOR = "#91d9ff";
const TEAL = "#b7f7d9";
const NODES: Array<[number, number, number]> = [
  [-1.9, 1.75, 0.2],
  [0, 1.75, -0.35],
  [1.9, 1.75, 0.2],
];

function glowTexture(color: string) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color + "aa");
  g.addColorStop(0.6, color + "22");
  g.addColorStop(1, color + "00");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Rig() {
  const { camera, pointer } = useThree();
  // Reserve the left side for the customer story; stage the sculpture to the right.
  const target = useMemo(() => new THREE.Vector3(-1.8, 0.1, 0), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const x = 2.6 + Math.sin(t * 0.12) * 0.7 + pointer.x * 0.7;
    const y = 2.1 + Math.cos(t * 0.1) * 0.25 + pointer.y * 0.45;
    camera.position.lerp(new THREE.Vector3(x, y, 8.2), 0.03);
    camera.lookAt(target);
  });
  return null;
}

function VercelLayer() {
  const violet = useMemo(() => glowTexture(SIGNAL_COLOR), []);
  const white = useMemo(() => glowTexture("#ffffff"), []);
  return (
    <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.5}>
      <group position={[0, 0, 0]}>
        <RoundedBox args={[5.6, 0.16, 2.6]} radius={0.08} smoothness={6} position={[0, 1.5, 0]}>
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.92}
            thickness={0.6}
            roughness={0.12}
            ior={1.4}
            clearcoat={1}
            transparent
            opacity={0.9}
            attenuationColor="#b8e7ff"
            attenuationDistance={2.5}
          />
        </RoundedBox>
        <mesh position={[0, 1.42, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[5.8, 2.8]} />
          <meshBasicMaterial color={SIGNAL_COLOR} transparent opacity={0.07} />
        </mesh>
        {NODES.map((p, i) => (
          <group key={i} position={p}>
            <mesh>
              <sphereGeometry args={[0.16, 32, 32]} />
              <meshStandardMaterial color="#ffffff" emissive={SIGNAL_COLOR} emissiveIntensity={2.2} roughness={0.25} />
            </mesh>
            <sprite scale={[1.6, 1.6, 1]}>
              <spriteMaterial
                map={violet}
                transparent
                opacity={0.75}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </sprite>
            <sprite scale={[0.5, 0.5, 1]}>
              <spriteMaterial
                map={white}
                transparent
                opacity={0.9}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </sprite>
          </group>
        ))}
        {/* The agent's orbit ring around the middle node */}
        <mesh position={NODES[1]} rotation-x={Math.PI / 2.3}>
          <torusGeometry args={[0.42, 0.012, 12, 80]} />
          <meshBasicMaterial color={SIGNAL_COLOR} transparent opacity={0.7} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </Float>
  );
}

function Boundary() {
  return (
    <group position={[0, 0.3, 0]}>
      <gridHelper args={[9, 18, "#3d657d", "#152a38"]} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.001}>
        <planeGeometry args={[9, 9]} />
        <meshBasicMaterial color="#0b1620" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function Estate() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cols = 14;
  const rows = 10;
  const count = cols * rows;
  const { matrices, colors, hot } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const hot: number[] = [];
    const base = new THREE.Color("#182b39");
    const lit = new THREE.Color("#29465c");
    const teal = new THREE.Color(TEAL);
    for (let i = 0; i < count; i++) {
      const cx = (i % cols) - (cols - 1) / 2;
      const cz = Math.floor(i / cols) - (rows - 1) / 2;
      const h = 0.12 + Math.pow(Math.random(), 2.2) * 0.9;
      dummy.position.set(cx * 0.62, -1.4 + h / 2, cz * 0.62);
      dummy.scale.set(0.46, h, 0.46);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
      const isHot = Math.random() < 0.09;
      if (isHot) hot.push(i);
      colors.push(isHot ? teal.clone() : Math.random() < 0.3 ? lit.clone() : base.clone());
    }
    return { matrices, colors, hot };
  }, [count]);
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) mesh.setMatrixAt(i, matrices[i]);
    mesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < hot.length; i++) {
      const idx = hot[i];
      const pulse = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.7);
      mesh.setColorAt(idx, new THREE.Color(TEAL).multiplyScalar(0.35 + pulse * 0.9));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, count]}
      onUpdate={(m) => colors.forEach((c, i) => m.setColorAt(i, c))}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.6} metalness={0.15} />
    </instancedMesh>
  );
}

function Streams() {
  const down = useRef<THREE.Points>(null);
  const up = useRef<THREE.Points>(null);
  const { curves, phases, downPos, upPos, n } = useMemo(() => {
    const curves: THREE.CatmullRomCurve3[] = [];
    for (let i = 0; i < 18; i++) {
      const start = new THREE.Vector3(...NODES[i % 3]);
      const end = new THREE.Vector3((Math.random() - 0.5) * 7.4, -1.1, (Math.random() - 0.5) * 5.4);
      const mid1 = new THREE.Vector3(
        start.x * 0.6 + end.x * 0.2 + (Math.random() - 0.5),
        0.9,
        start.z * 0.5 + (Math.random() - 0.5),
      );
      const mid2 = new THREE.Vector3(
        end.x * 0.8 + (Math.random() - 0.5) * 0.4,
        -0.3,
        end.z * 0.8 + (Math.random() - 0.5) * 0.4,
      );
      curves.push(new THREE.CatmullRomCurve3([start, mid1, mid2, end]));
    }
    const n = 900;
    const phases = new Float32Array(n);
    for (let i = 0; i < n; i++) phases[i] = Math.random();
    return { curves, phases, downPos: new Float32Array(n * 3), upPos: new Float32Array(n * 3), n };
  }, []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const curve = curves[i % curves.length];
      const a = (phases[i] + t * 0.11) % 1;
      curve.getPointAt(a, tmp);
      downPos[i * 3] = tmp.x;
      downPos[i * 3 + 1] = tmp.y;
      downPos[i * 3 + 2] = tmp.z;
      const b = 1 - ((phases[i] * 1.37 + t * 0.085) % 1);
      curve.getPointAt(b, tmp);
      upPos[i * 3] = tmp.x + 0.08;
      upPos[i * 3 + 1] = tmp.y;
      upPos[i * 3 + 2] = tmp.z + 0.08;
    }
    for (const ref of [down, up]) {
      const attr = ref.current?.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
      if (attr) attr.needsUpdate = true;
    }
  });
  return (
    <>
      <points ref={down}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[downPos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          color={SIGNAL_COLOR}
          transparent
          opacity={0.95}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <points ref={up}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[upPos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          color={TEAL}
          transparent
          opacity={0.85}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}

export default function HeroScene({ animate = true }: { animate?: boolean }) {
  return (
    <div className="hero3d-canvas" aria-hidden="true">
      <Canvas
        frameloop={animate ? "always" : "demand"}
        dpr={[1, 1.6]}
        camera={{ position: [2.6, 2.1, 8.2], fov: 38, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#060d14"]} />
        <fog attach="fog" args={["#060d14", 9, 17]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[3, 4.5, 2.5]} intensity={60} color={SIGNAL_COLOR} distance={16} decay={2} />
        <pointLight position={[-4, 2.5, -2]} intensity={28} color={TEAL} distance={14} decay={2} />
        <directionalLight position={[-2, 6, 4]} intensity={0.8} color="#c9edff" />
        <Rig />
        <VercelLayer />
        <Boundary />
        <Estate />
        <Streams />
        <Sparkles count={140} scale={[11, 7, 9]} size={2.4} speed={0.25} opacity={0.55} color="#d0ecff" />
      </Canvas>
    </div>
  );
}
