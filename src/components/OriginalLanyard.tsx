"use client";

import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF, useTexture } from "@react-three/drei";
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

extend({ MeshLineGeometry, MeshLineMaterial });

const MODEL_URL = "https://framerusercontent.com/assets/mv3nY4GEDXqOTCVSvcDUNBfFOI.glb";
const STRING_URL = "/lanyard-string.png";
const CARD_URL = "https://framerusercontent.com/images/m91EJRK8ol36ILeDFi7VA7zUg.png?width=710&height=1060";
const EMPTY_TEXTURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

type BodyRef = { translation: () => THREE.Vector3; angvel: () => THREE.Vector3; rotation: () => THREE.Euler; setAngvel: (value: THREE.Vector3) => void; setNextKinematicTranslation: (value: THREE.Vector3) => void; wakeUp: () => void };

function CameraController() {
  useFrame(({ camera }) => camera.position.set(0, 0, 12));
  return null;
}

function CardTexture({ onReady }: { onReady: (url: string) => void }) {
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1024;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, 1024, 1024);
      context.drawImage(image, 0, 5, 512, 765);
      const flipped = document.createElement("canvas");
      flipped.width = flipped.height = 1024;
      const flippedContext = flipped.getContext("2d");
      if (!flippedContext) return;
      flippedContext.scale(1, -1);
      flippedContext.translate(0, -1024);
      flippedContext.drawImage(canvas, 0, 0);
      onReady(flipped.toDataURL());
    };
    image.src = CARD_URL;
  }, [onReady]);
  return null;
}

function Band({ cardImageUrl }: { cardImageUrl: string }) {
  const band = useRef<any>(null);
  const fixed = useRef<BodyRef | null>(null);
  const jointOne = useRef<BodyRef | null>(null);
  const jointTwo = useRef<BodyRef | null>(null);
  const jointThree = useRef<BodyRef | null>(null);
  const card = useRef<BodyRef | null>(null);
  const [dragged, setDragged] = useState<THREE.Vector3 | false>(false);
  const [hovered, setHovered] = useState(false);
  const { nodes, materials } = useGLTF(MODEL_URL) as any;
  const cardTexture = useTexture(cardImageUrl || EMPTY_TEXTURE) as THREE.Texture;
  const stringTexture = useTexture(STRING_URL) as THREE.Texture;
  const { size } = useThree();
  const curve = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), []);
  const vector = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const angularVelocity = useMemo(() => new THREE.Vector3(), []);
  const rotation = useMemo(() => new THREE.Vector3(), []);

  useRopeJoint(fixed as any, jointOne as any, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(jointOne as any, jointTwo as any, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(jointTwo as any, jointThree as any, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(jointThree as any, card as any, [[0, 0, 0], [0, 1.5, 0]]);

  useEffect(() => {
    stringTexture.wrapS = stringTexture.wrapT = THREE.RepeatWrapping;
    stringTexture.anisotropy = 16;
    stringTexture.needsUpdate = true;
    cardTexture.wrapS = cardTexture.wrapT = THREE.RepeatWrapping;
    cardTexture.anisotropy = 16;
  }, [cardTexture, stringTexture]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = dragged ? "grabbing" : "grab";
    return () => { document.body.style.cursor = "auto"; };
  }, [dragged, hovered]);

  useFrame((state, delta) => {
    if (!fixed.current || !jointOne.current || !jointTwo.current || !jointThree.current || !card.current || !band.current) return;
    if (dragged) {
      vector.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      direction.copy(vector).sub(state.camera.position).normalize();
      vector.add(direction.multiplyScalar(state.camera.position.length()));
      [card, jointOne, jointTwo, jointThree, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current.setNextKinematicTranslation({ x: vector.x - dragged.x, y: vector.y - dragged.y, z: vector.z - dragged.z } as any);
    }
    [jointOne, jointTwo].forEach((ref) => {
      const body: any = ref.current;
      if (!body.lerped) body.lerped = new THREE.Vector3().copy(body.translation());
      const distance = Math.max(0.1, Math.min(1, body.lerped.distanceTo(body.translation())));
      body.lerped.lerp(body.translation(), delta * distance * 50);
    });
    curve.points[0].copy(jointThree.current.translation());
    curve.points[1].copy((jointTwo.current as any).lerped);
    curve.points[2].copy((jointOne.current as any).lerped);
    curve.points[3].copy(fixed.current.translation());
    band.current.geometry.setPoints(curve.getPoints(32));
    angularVelocity.copy(card.current.angvel());
    rotation.copy(card.current.rotation() as any);
    card.current.setAngvel({ x: angularVelocity.x, y: angularVelocity.y - rotation.y * 0.25, z: angularVelocity.z } as any);
  });

  curve.curveType = "chordal";
  const segments = { type: "dynamic" as const, canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 };
  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed as any} {...segments} type="fixed" />
        <RigidBody ref={jointOne as any} position={[0.5, 0, 0]} {...segments}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody ref={jointTwo as any} position={[1, 0, 0]} {...segments}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody ref={jointThree as any} position={[1.5, 0, 0]} {...segments}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody ref={card as any} position={[2, 0, 0]} {...segments} type={dragged ? "kinematicPosition" : "dynamic"}>
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerUp={(event) => { event.target.releasePointerCapture(event.pointerId); setDragged(false); event.stopPropagation(); }}
            onPointerDown={(event) => { event.target.setPointerCapture(event.pointerId); if (card.current) setDragged(new THREE.Vector3().copy(event.point).sub(vector.copy(card.current.translation()))); event.stopPropagation(); }}
          >
            <mesh geometry={nodes.card.geometry}><meshPhysicalMaterial color="#fff" map={cardTexture} clearcoat={1} clearcoatRoughness={0.15} roughness={0.9} metalness={0.8} /></mesh>
            <mesh geometry={nodes.clip.geometry}><meshPhysicalMaterial material={materials.metal} color="#787878" roughness={0.3} metalness={0.8} /></mesh>
            <mesh geometry={nodes.clamp.geometry}><meshPhysicalMaterial material={materials.metal} color="#787878" roughness={0.3} metalness={0.8} /></mesh>
          </group>
        </RigidBody>
      </group>
      <mesh ref={band as any}>
        <meshLineGeometry />
        <meshLineMaterial color="#fff" depthTest={false} resolution={[size.width, size.height]} useMap map={stringTexture} repeat={[-17, 1]} lineWidth={1} />
      </mesh>
    </>
  );
}

export function OriginalLanyard() {
  const [cardImageUrl, setCardImageUrl] = useState("");
  return (
    <div className="wechat-original-lanyard">
      <CardTexture onReady={setCardImageUrl} />
      <Canvas camera={{ position: [0, 0, 12], fov: 20 }} gl={{ alpha: true }} onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0), 0)}>
        <CameraController />
        <ambientLight intensity={Math.PI * 0.7} />
        <Physics gravity={[0, -60, 0]} timeStep={1 / 60}><Band cardImageUrl={cardImageUrl} /></Physics>
        <Environment blur={0.75}><Lightformer intensity={1.4} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} /><Lightformer intensity={2.1} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} /><Lightformer intensity={7} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} /></Environment>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
useTexture.preload(STRING_URL);
