/* Preserve the original meshes, materials and joints. Merge rigid pieces
   only within their own animated parent; never flatten the skeleton. */
function compactMultiplayerRig(H) {
 const keep=new Set([H.headMesh,H.lens,...H.arms.map(a=>a.hand)].filter(Boolean));
 const parents=[];H.root.traverse(o=>{if(!o.isMesh)parents.push(o);});
 let before=0,after=0;H.root.traverse(o=>{if(o.isMesh)before++;});
 for(const parent of parents) {
  const buckets=new Map();
  for(const mesh of parent.children) {
   if(!mesh.isMesh||keep.has(mesh)||Array.isArray(mesh.material))continue;
   const key=mesh.material;let list=buckets.get(key);if(!list){list=[];buckets.set(key,list);}list.push(mesh);
  }
  for(const [mat,list]of buckets) {
   if(list.length<2)continue;
   const values={position:[],normal:[],uv:[]};
   for(const mesh of list) {
    mesh.updateMatrix();const original=mesh.geometry,g=original.index?original.toNonIndexed():original;
    const nm=new THREE.Matrix3().getNormalMatrix(mesh.matrix),v=new THREE.Vector3();
    for(let i=0;i<g.attributes.position.count;i++) {
     v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(mesh.matrix);values.position.push(v.x,v.y,v.z);
     v.fromBufferAttribute(g.attributes.normal,i).applyMatrix3(nm).normalize();values.normal.push(v.x,v.y,v.z);
     const uv=g.attributes.uv;values.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);
    }
    if(g!==original)g.dispose();original.dispose();parent.remove(mesh);
   }
   const geo=new THREE.BufferGeometry();
   for(const [name,a]of Object.entries(values))geo.setAttribute(name,new THREE.Float32BufferAttribute(a,name==='uv'?2:3));
   geo.computeBoundingSphere();const merged=new THREE.Mesh(geo,mat);merged.matrixAutoUpdate=false;merged.updateMatrix();parent.add(merged);
  }
 }
 H.root.traverse(o=>{if(o.isMesh)after++;});return {before,after};
}
