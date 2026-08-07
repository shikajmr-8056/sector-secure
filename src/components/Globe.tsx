import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const RADIUS = 1.6;

/** Coarse continental boxes (lat min/max, lon min/max) for a stylized land mask. */
const LAND_BOXES: Array<[number, number, number, number]> = [
  [50, 71, -165, -62],
  [30, 50, -125, -68],
  [24, 32, -112, -80],
  [15, 30, -106, -88],
  [8, 18, -92, -77],
  [60, 82, -55, -20],
  [0, 12, -80, -60],
  [-20, 0, -76, -35],
  [-35, -20, -72, -40],
  [-55, -35, -75, -58],
  [36, 60, -10, 30],
  [55, 70, 5, 32],
  [10, 35, -17, 32],
  [-12, 12, 8, 42],
  [-35, -12, 12, 38],
  [-25, -12, 43, 50],
  [40, 72, 30, 180],
  [20, 45, 45, 122],
  [8, 30, 68, 90],
  [0, 25, 95, 122],
  [-10, 6, 95, 141],
  [30, 45, 129, 146],
  [-38, -11, 113, 153],
  [-47, -34, 166, 179],
  [-90, -70, -180, 180],
];

function isLand(lat: number, lon: number) {
  for (const [la0, la1, lo0, lo1] of LAND_BOXES) {
    if (lat >= la0 && lat <= la1 && lon >= lo0 && lon <= lo1) return true;
  }
  return false;
}

function toVec(lat: number, lon: number, r = RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function LandDots() {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    for (let lat = -88; lat <= 88; lat += 1.6) {
      const step = 1.6 / Math.max(0.18, Math.cos((lat * Math.PI) / 180));
      for (let lon = -180; lon <= 180; lon += step) {
        if (!isLand(lat, lon)) continue;
        const v = toVec(lat, lon, RADIUS * 1.004);
        pts.push(v.x, v.y, v.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.021}
        sizeAttenuation
        color="#7cebff"
        transparent
        opacity={0.75}
      />
    </points>
  );
}

function GraticuleLines() {
  const geometry = useMemo(() => {
    const seg: number[] = [];
    const push = (a: THREE.Vector3, b: THREE.Vector3) => {
      seg.push(a.x, a.y, a.z, b.x, b.y, b.z);
    };
    for (let lat = -80; lat <= 80; lat += 10) {
      for (let lon = -180; lon < 180; lon += 4) {
        push(toVec(lat, lon), toVec(lat, lon + 4));
      }
    }
    for (let lon = -180; lon < 180; lon += 10) {
      for (let lat = -88; lat < 88; lat += 4) {
        push(toVec(lat, lon), toVec(lat + 4, lon));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#1d6f8f" transparent opacity={0.35} depthWrite={false} />
    </lineSegments>
  );
}

const SCAN_SITES: Array<[number, number]> = [
  [37.77, -122.42],
  [51.5, -0.12],
  [1.35, 103.82],
  [-33.86, 151.2],
  [19.07, 72.87],
  [50.11, 8.68],
  [-23.55, -46.63],
];

function ScanMarkers() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current?.children.forEach((child, i) => {
      const ring = child.children[1] as THREE.Mesh | undefined;
      if (!ring) return;
      const phase = (t * 0.55 + i * 0.37) % 1;
      const s = 0.6 + phase * 2.6;
      ring.scale.setScalar(s);
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.65 * (1 - phase);
    });
  });

  return (
    <group ref={group}>
      {SCAN_SITES.map(([lat, lon], i) => {
        const pos = toVec(lat, lon, RADIUS * 1.01);
        const normal = pos.clone().normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          normal,
        );
        return (
          <group key={i} position={pos} quaternion={quat}>
            <mesh>
              <circleGeometry args={[0.018, 16]} />
              <meshBasicMaterial color="#9df3ff" transparent opacity={0.95} />
            </mesh>
            <mesh>
              <ringGeometry args={[0.026, 0.034, 32]} />
              <meshBasicMaterial color="#4fd8ff" transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Earth() {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.055;
  });

  return (
    <group ref={group} rotation={[0.32, 0, 0.16]}>
      <mesh renderOrder={-1} visible={false}>
        <sphereGeometry args={[RADIUS * 0.99, 48, 48]} />
        <meshBasicMaterial color="#08131b" />
      </mesh>
      <GraticuleLines />
      <LandDots />
      <ScanMarkers />
      <mesh>
        <sphereGeometry args={[RADIUS * 1.12, 32, 32]} />
        <meshBasicMaterial
          color="#0e7fa4"
          transparent
          opacity={0.09}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function Globe() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.6], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.6} />
      <Earth />
    </Canvas>
  );
}
