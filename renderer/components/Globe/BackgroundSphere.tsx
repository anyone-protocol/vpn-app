// components/BackgroundSphere.js
import React from "react";
import * as THREE from "three";

const BackgroundSphere = () => {
  return (
    <mesh>
      <sphereGeometry args={[2, 64, 64]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={0.2}
        side={THREE.BackSide}
      />
    </mesh>
  );
};

export default BackgroundSphere;
