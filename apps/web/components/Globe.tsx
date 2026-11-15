'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import land from './land.json';
const point=(lat:number,lon:number,r=2)=>{const phi=(90-lat)*Math.PI/180, theta=(lon+180)*Math.PI/180;return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));};
const destinations=[[48.9,24.5],[54.4,18.6],[46.8,10.8]];
function World({active}:{active:number}){
 const group=useRef<THREE.Group>(null); const route=useMemo(()=>{const a=point(51.5,-0.1),b=point(destinations[active][0],destinations[active][1]); const mid=a.clone().add(b).normalize().multiplyScalar(2.8); return new THREE.QuadraticBezierCurve3(a,mid,b).getPoints(70);},[active]);
 const positions=useMemo(()=>new Float32Array(land.flatMap(([lon,lat])=>point(lat,lon,2.014).toArray())),[]);
 useFrame((state,delta)=>{if(group.current){ group.current.rotation.y+=delta*.035; group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,state.pointer.y*.045,.02); }});
 return <group ref={group} rotation={[0,-1.2,0]}><mesh><sphereGeometry args={[2,64,48]}/><meshStandardMaterial color="#0a2341" metalness={.5} roughness={.72}/></mesh><points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><pointsMaterial color="#5fdbcf" size={.012} transparent opacity={.85}/></points><mesh scale={1.045}><sphereGeometry args={[2,48,32]}/><shaderMaterial transparent depthWrite={false} side={THREE.BackSide} uniforms={{}} vertexShader={'varying vec3 vNormal; void main(){ vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'} fragmentShader={'varying vec3 vNormal; void main(){ float intensity = pow(0.65 - dot(vNormal, vec3(0.,0.,1.)), 3.0); gl_FragColor = vec4(0.16, 0.85, 0.83, 1.0) * intensity; }'}/></mesh><primitive object={new THREE.Line(new THREE.BufferGeometry().setFromPoints(route),new THREE.LineBasicMaterial({color:'#51f6d2',transparent:true,opacity:.9}))}/>{destinations.map(([lat,lon],i)=><mesh key={i} position={point(lat,lon,2.035)}><sphereGeometry args={[i===active?.035:.018,12,12]}/><meshBasicMaterial color={i===active?'#aaffed':'#53c9c1'}/></mesh>)}</group>
}
export default function Globe({active}:{active:number}){return <div className="globe-canvas"><Canvas camera={{position:[0,0,6.6],fov:42}} dpr={[1,1.5]} gl={{alpha:true,antialias:true}}><ambientLight intensity={1.2}/><directionalLight position={[3,4,5]} intensity={2}/><World active={active}/></Canvas></div>}
