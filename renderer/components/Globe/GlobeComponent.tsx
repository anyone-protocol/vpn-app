import React, { useState, useRef, useEffect, useMemo } from "react";
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  Billboard,
  Line,
  OrbitControls,
  Text,
} from "@react-three/drei";
import data from "../../assets/globe/grid.json";
import BackgroundSphere from "./BackgroundSphere"; // Adjust the path as necessary

type Location = {
  lat: number;
  lon: number;
  name: string;
};

// Convert latitude and longitude to Cartesian coordinates
function latLongToCartesian(
  lat: number,
  lon: number,
  radius = 2
): THREE.Vector3 {
  const latRad = lat * (Math.PI / 180);
  const lonRad = lon * (Math.PI / 180);

  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.sin(lonRad);

  return new THREE.Vector3(x, y, z);
}

function latLongToCartesianPoints(
  lat: number,
  lon: number,
  radius = 2
): THREE.Vector3 {
  const latRad = lat * (Math.PI / 180);
  const lonRad = -lon * (Math.PI / 180);

  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.sin(lonRad);

  return new THREE.Vector3(x, y, z);
}

const Point = ({ dataPoints }: { dataPoints: Location[] }) => {
  const points = dataPoints.map((point: any, index: number) => {
    const position = latLongToCartesianPoints(point.lat, point.lon, 2);

    return (
      <group key={`${point.name}-${index}`} position={position}>
        <mesh>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <Billboard follow={true}>
          <Text
            fontSize={0.05}
            position={[0, 0.08, 0]}
            color="white"
            anchorX="center"
            anchorY="middle"
            renderOrder={1000}
            // Directly access and modify the material properties
          >
            {point.name}
          </Text>
        </Billboard>
      </group>
    );
  });

  return <group>{points}</group>;
};

function slerp(p0: THREE.Vector3, p1: THREE.Vector3, t: number): THREE.Vector3 {
  // Normalize both vectors to ensure they are unit vectors
  p0.normalize();
  p1.normalize();

  // Calculate the angle between the two vectors
  const omega = Math.acos(p0.dot(p1));

  // If the vectors are very close or identical, just return one of them
  if (omega < 1e-6) {
    // Small threshold to account for floating point precision
    return p0.clone();
  }

  const sinOmega = Math.sin(omega);

  // If sinOmega is 0, avoid division by zero
  if (sinOmega === 0) {
    return p0.clone(); // or p1.clone() as both are essentially the same
  }

  // Calculate interpolation weights
  const alpha = Math.sin((1 - t) * omega) / sinOmega;
  const beta = Math.sin(t * omega) / sinOmega;

  // Perform the spherical interpolation
  return new THREE.Vector3()
    .addScaledVector(p0, alpha)
    .addScaledVector(p1, beta);
}

const BridgeBalls = ({ pathPoints }: { pathPoints: THREE.Vector3[] }) => {
  const ballsRef = useRef<any[]>([]);
  const [balls, setBalls] = useState<any[]>([]);

  const speed = 0.5; // Constant speed for all balls
  const interval = 2000; // Interval between balls in ms

  useEffect(() => {
    // Function to spawn a new ball at fixed intervals
    const spawnBall = () => {
      setBalls((prevBalls) => {
        const newBall = { position: 0, speed, index: prevBalls.length };
        return [...prevBalls, newBall];
      });

      const spawnTimeout = setTimeout(spawnBall, interval);

      // Clear the timeout when component unmounts or interval changes
      return () => clearTimeout(spawnTimeout);
    };

    // Initial spawn of balls
    spawnBall();

    return () => {}; // Cleanup on unmount
  }, [interval]);

  useFrame(() => {
    // Update the position of each ball
    setBalls((prevBalls) => {
      return prevBalls
        .map((ball, index) => {
          ball.position += ball.speed;

          if (ball.position >= pathPoints.length - 1) {
            ballsRef.current[index] = null;
            return null;
          } else {
            const nextPoint = pathPoints[Math.floor(ball.position)];
            const nextNextPoint = pathPoints[Math.ceil(ball.position)];
            const interpolationFactor = ball.position % 1;
            const ballPosition = nextPoint
              .clone()
              .lerp(nextNextPoint, interpolationFactor);

            // Update the ball's position
            if (ballsRef.current[index]) {
              ballsRef.current[index].position.set(
                ballPosition.x,
                ballPosition.y,
                ballPosition.z
              );
            }
            return ball; // Return the ball if it hasn't reached the end
          }
        })
        .filter((ball) => ball !== null); // Remove null entries (balls that have reached the end)
    });
    // invalidate();
  });

  return (
    <>
      {balls.map((ball, index) => (
        <mesh
          key={index}
          ref={(ref) => {
            ballsRef.current[index] = ref;
          }}
          position={pathPoints[0]}
        >
          <sphereGeometry args={[0.02, 4, 4]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}
    </>
  );
};

// Bridge component to draw a bridge between two points
const Bridge = ({
  start,
  end,
  radius,
  amplitude,
}: {
  start: { lat: number; lon: number };
  end: { lat: number; lon: number };
  radius: number;
  amplitude: number;
}) => {
  const numPoints = 50;

  // Memoize the bridge path calculation
  const pathPoints = useMemo(() => {
    const startPos = latLongToCartesianPoints(start.lat, start.lon, radius);
    const endPos = latLongToCartesianPoints(end.lat, end.lon, radius);
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      let point = slerp(startPos, endPos, t);

      const parabolaFactor = 1 - Math.pow(2 * t - 1, 2);
      const heightAdjustment = amplitude * parabolaFactor;

      const adjustedPoint = point
        .clone()
        .normalize()
        .multiplyScalar(radius + heightAdjustment);

      points.push(adjustedPoint);
    }

    return points;
  }, [start, end, radius, amplitude]); // Only recalculate when these dependencies change

  return (
    <>
      <Line points={pathPoints} color="#838383" lineWidth={2} />
      {/* <BridgeBalls pathPoints={pathPoints} /> */}
    </>
  );
};

const Grid = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  useEffect(() => {
    if (meshRef.current) {
      const tempMatrix = new THREE.Matrix4(); // Temporary matrix for positioning
      const sphereColor = new THREE.Color("#27D7F2"); // Color for the smaller spheres

      data.forEach((point: any, index: number) => {
        const position = latLongToCartesian(point.lat, point.lon, 2);

        // Set transformation matrix for each instance (small spheres)
        tempMatrix.setPosition(position.x, position.y, position.z);
        meshRef.current.setMatrixAt(index, tempMatrix);

        // Optionally set colors for the smaller spheres if required
        meshRef.current.setColorAt(index, sphereColor);
      });

      // Notify Three.js of changes
      meshRef.current.instanceMatrix.needsUpdate = true;
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  return (
    <group rotation={[Math.PI, 0, 0]}>
      {/* Instanced mesh for the larger spheres */}
      {data.map((point: any, index: number) => {
        const position = latLongToCartesian(point.lat, point.lon, 1.95); // Larger radius for background sphere

        return (
          <mesh
            key={`large-sphere-${index}-${point.lat}-${point.lon}`}
            position={position}
          >
            <sphereGeometry args={[0.05, 16, 16]} /> {/* Larger sphere size */}
            <meshStandardMaterial color="#2d3e50" /> {/* Background color */}
          </mesh>
        );
      })}

      {/* Instanced mesh for smaller spheres */}
      <instancedMesh
        ref={meshRef}
        args={[null, null, data.length]} // Geometry, Material, Count
      >
        <sphereGeometry args={[0.01, 4, 4]} />
        <meshStandardMaterial color="#89cff0" />
      </instancedMesh>
    </group>
  );
};

const Globe = ({ points, orbitRef }: { points: Location[]; orbitRef: any }) => {
  const globeRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [bridges, setBridges] = useState<JSX.Element[]>([]);

  const targetPositionRef = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    if (targetPositionRef.current) {
      // Calculate the direction vector from the globe's center to the target position
      const direction = targetPositionRef.current.clone().normalize();

      // distance to 0,0,0
      const fixedDistance = 3.7;

      // Scale the direction to the fixed distance
      const desiredPosition = direction.multiplyScalar(fixedDistance);

      // Smoothly transition the camera to the desired position
      const distance = camera.position.distanceTo(desiredPosition); // Calculate the distance to the desired position
      const tolerance = 0.01; // Define a small threshold for "closeness"

      if (distance < tolerance) {
        // Stop updating once the camera reaches the target position
        targetPositionRef.current = null;
        return;
      } else {
        // Interpolate the camera position for a smooth transition
        camera.position.lerp(desiredPosition, 0.1); // Smoothness factor
        camera.lookAt(0, 0, 0); // Look at the center of the globe
        invalidate();
      }
    }
  });

  // Update the target position when points change
  useEffect(() => {
    if (points.length > 0) {
      const realLocation = points[0]; // Assume the first point is the target
      const vector = latLongToCartesianPoints(
        realLocation.lat,
        realLocation.lon,
        1
      ); // Get the target point in Cartesian coordinates

      // Calculate the surface normal at the target point (this points outward from the center)
      const surfaceNormal = vector.clone().normalize();

      // Apply an offset to create a side-angle view
      const offsetDistance = 0.2; // Distance for the offset

      // sideways vector to simulate the side view (this will be perpendicular to the surface normal)
      const sidewaysVector = new THREE.Vector3(-surfaceNormal.z, 0, 0); // Perpendicular to the normal on the XZ plane
      sidewaysVector.normalize();

      // Combine downward and sideways offsets
      const offset = surfaceNormal
        .multiplyScalar(-offsetDistance)
        .add(sidewaysVector.multiplyScalar(0.5)); // Adjust 0.5 for sideways offset magnitude

      // Apply the offset to the target position
      vector.add(offset);

      // Set the target position to the calculated point with the offset
      targetPositionRef.current = new THREE.Vector3(
        vector.x,
        vector.y,
        vector.z
      );
    } else {
      targetPositionRef.current = null;
    }
  }, [points]);

  useEffect(() => {
    if (points.length === 3) {
      const bridges = [
        <Bridge
          start={{ lat: points[0].lat, lon: points[0].lon }}
          end={{ lat: points[1].lat, lon: points[1].lon }}
          radius={2}
          amplitude={0.2}
          key={`bridge-${points[0].name}-${points[1].name}`}
        />,
        <Bridge
          start={{ lat: points[1].lat, lon: points[1].lon }}
          end={{ lat: points[2].lat, lon: points[2].lon }}
          radius={2}
          amplitude={0.2}
          key={`bridge-${points[1].name}-${points[2].name}`}
        />,
      ];
      setBridges(bridges);
    } else {
      setBridges([]);
    }
  }, [points]);

  return (
    <group ref={globeRef}>
      <BackgroundSphere />
      {bridges}
      <Grid />
      <Point dataPoints={points} />
    </group>
  );
};

export default function GlobeComponent({
  realLocation,
  proxyLocation,
  relayLocation,
  rotating,
  enableOrbitControls,
  initialZoom,
}: {
  realLocation: any;
  proxyLocation: any;
  relayLocation: any;
  rotating: boolean;
  enableOrbitControls: boolean;
  initialZoom: number;
}) {
  const [points, setPoints] = useState<Location[]>([]);

  useEffect(() => {
    if (realLocation && proxyLocation && relayLocation) {
      const newPoints = [
        {
          lat: realLocation.latitude,
          lon: realLocation.longitude,
          name: realLocation.countryCode?.toUpperCase(),
        },
        {
          lat: relayLocation.latitude,
          lon: relayLocation.longitude,
          name: relayLocation.countryCode?.toUpperCase(),
        },
        {
          lat: proxyLocation.latitude,
          lon: proxyLocation.longitude,
          name: proxyLocation.countryCode?.toUpperCase(),
        },
      ];

      if (newPoints != points) {
        setPoints(newPoints);
      }
    } else {
      setPoints([]);
    }
  }, [realLocation, proxyLocation, relayLocation]);

  const orbitControlsRef = useRef<any>(null);

  // base the x position on the real location

  const MemoizedCanvas = useMemo(
    () => (
      <Canvas
        camera={{ fov: 75, position: new THREE.Vector3(0, 0, initialZoom) }}
        frameloop="demand"
        gl={{ antialias: true }}
        dpr={[1, 1.5]}
        shadows={false}
      >
        <ambientLight intensity={1} />
        <Globe orbitRef={orbitControlsRef} points={points} />
        {enableOrbitControls && (
          <OrbitControls
            ref={orbitControlsRef}
            enablePan={false}
            maxZoom={5}
            maxDistance={5}
            minDistance={3.5}
            zoomSpeed={0.2}
            zoom0={initialZoom}
            makeDefault
          />
        )}
      </Canvas>
    ),
    [points]
  );

  return (
    <div
      style={{
        height: "100%",
        maxHeight: "100%",
        width: "100%",
        backgroundImage: "radial-gradient(#2f4e5054 0.8px, transparent 0)",
      }}
    >
      {MemoizedCanvas}
    </div>
  );
}
