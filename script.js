// Use the arrow keys or WASD to move the car through the hills.
// This game might be laggy.
import Stats from "https://threejs.org/examples/jsm/libs/stats.module.js";

var stats = new Stats();
document.body.appendChild(stats.dom);	

function pS(s){
	// return s;
	var n;
	while((n = s.match(/(?<=#include <)\S*(?=>)/)) != null)
		s = s.replace(/#include <\S*>/, THREE.ShaderChunk[n[0]]);
	console.log(s);
	return s;
}

var groundMat = new THREE.ShaderMaterial({
	vertexShader: document.getElementById("vertex").innerHTML,
	fragmentShader: document.getElementById("fragment").innerHTML,

	uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          THREE.UniformsLib.lights,
          THREE.UniformsLib.shadowmap,
          {
              mapMain: {value: null},
              mapGlow: {value: null}
          }
      ]),
	lights: true,
	fog: true
});

// var treeMat = new THREE.ShaderMaterial({
// 	vertexShader: document.getElementById("vertex").innerHTML,
// 	fragmentShader: document.getElementById("treefragment").innerHTML,

// 	uniforms: THREE.UniformsUtils.merge([
//           THREE.UniformsLib.fog,
//           THREE.UniformsLib.lights,
//           THREE.UniformsLib.shadowmap,
//           {
//               mapMain: {value: null},
//               mapGlow: {value: null},
// 		    root: {type: "vec3", value: new THREE.Vector3()}
//           }
//       ]),
// 	lights: true,
// 	fog: true,
// 	transparent: true,
// 	flatShading: true,
// 	depthWrite: true,
// 	depthWrite: true
// });

var scene = new THREE.Scene();
scene.background = new THREE.Color("#6894E2");
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, -20);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
// renderer.outputEncoding = THREE.sRGBEncoding;
var element = renderer.domElement;
document.body.appendChild(element);

var mouse = {locked: false};

function treeMaterial(p){
	p = p ?? new THREE.Vector3();
	return new THREE.ShaderMaterial({
		vertexShader: document.getElementById("vertex").innerHTML,
		fragmentShader: document.getElementById("treefragment").innerHTML,
	
		uniforms: THREE.UniformsUtils.merge([
	          THREE.UniformsLib.fog,
	          THREE.UniformsLib.lights,
	          THREE.UniformsLib.shadowmap,
	          {
	              mapMain: {value: null},
	              mapGlow: {value: null},
			  root: {type: "vec3", value: p}
	          }
	      ]),
		lights: true,
		fog: true,
		transparent: true,
		flatShading: true,
		depthWrite: true,
		depthWrite: true
	});
}

// for(var i = 0; i < 500; i++){
// 	var p = new THREE.Vector3(Math.random() * 200 - 100, 0, Math.random() * 200 - 100);
// 	var tree = new THREE.Mesh(new THREE.ConeBufferGeometry(3, 12), treeMaterial(p));
// 	tree.castShadow = true;
// 	tree.receiveShadow = true;
// 	tree.position.copy(p);
// 	scene.add(tree);
// }

var treeRay = new THREE.Raycaster();

document.addEventListener("pointerlockchange", function(e){
	mouse.locked = !mouse.locked;
});

window.onclick = function(e){
	if(!mouse.locked)
		element.requestPointerLock();
	treeRay.setFromCamera(new THREE.Vector2(), camera);
	// var inte = treeRay.intersectObject(ground, true);
	if(false && inte.length > 0){
		var tp = inte[0].point;
		tp.y += 5;
		treeArray.push(tp);
		var tree = new THREE.Mesh(new THREE.ConeBufferGeometry(3, 12), treeMaterial(tp));
		tree.castShadow = true;
		tree.receiveShadow = true;
		tree.position.copy(tp);
		scene.add(tree);
		console.log(treeArray.reduce((a, b) => a + b.x + "," + b.y + "," + b.z + "/", ""));
	}
}

element.onmousemove = function(e){
	if(mouse.locked){
		camera.rotateX(e.movementY * -0.002);
		camera.rotateY(e.movementX * -0.002);
	}
}

var EPSILON = 0.000001;

var BOUNCE = 1.2;
var WHEELBOUNCE = 1.1;
var FRICTION_MAX = 0.02 * 1000 / 16;
var FRICTION_SLIP = 0.02 * 1000 / 16;
var MAXRADIUS = 4;
var WHEEL_SPIN_RATIO = 0.1;
var TURNSPEED = 0.5;
var MAX_TURN = Math.PI / 4;

var CRASH_THRESHOLD = 0.6;

var MAX_REVERSE = 20;

var ACCELERATION = 0.02 * 1000 / 16;
var BRAKE = 0.5 * 1000 / 16;

var mInert = 0.08;

var CAM_SPEED = 0.05;

var CORRECTION_SPEED = 0.0001;

var VEHICLES = {
	RacingTruck: class{
		constructor(){
			var c = new THREE.Object3D();
			this.mesh = c;
			var sett = {
				direction: new THREE.Vector3(0, 1, 0),
				maxDist: 1,
				k: 100,
				f: Math.pow(0.9, 1000 / 16),
				side: new THREE.Vector3(1, 0, 0)
			}
			addPoint(c, 0, 1, 0);
			addPoint(c, -1.2, -0.5, -1.85, true, true, sett);
			addPoint(c, -1.2, -0.5, 1.85, true, false, sett);
			addPoint(c, 1.2, -0.5, -1.85, true, true, sett);
			addPoint(c, 1.2, -0.5, 1.85, true, false, sett);
			
			addPoint(c, -1.4, 0.5, -2.3);
			addPoint(c, -1.4, 0.5, 2.3);
			addPoint(c, 1.4, 0.5, -2.3);
			addPoint(c, 1.4, 0.5, 2.3);
			
			addPoint(c, -1, 1.5, -2);
			addPoint(c, -1, 1.5, 2);
			addPoint(c, 1, 1.5, -2);
			addPoint(c, 1, 1.5, 2);
			
			c.velocity = new THREE.Vector3(0, 0, 0);
			c.rotVel = new THREE.Vector3(0, 0, 0);
			c.damping = 0.5;
			c.max_speed = 40;
			c.acceleration = 0.02 * 1000 / 16;
		}
	}
};

var ground = new THREE.Object3D();
scene.add(ground);

var treeArray = [];
var treeData = document.getElementById("treeloc").innerHTML;
treeArray = treeData.split("/");
treeArray = treeArray.slice(0, treeArray.length - 1);
for(var i = 0; i < treeArray.length; i++){
	treeArray[i] = treeArray[i].split(",");
	var tp = new THREE.Vector3(
		Math.round(parseFloat(treeArray[i][0]) * 100) / 100,
		Math.round(parseFloat(treeArray[i][1]) * 100) / 100,
		Math.round(parseFloat(treeArray[i][2]) * 100) / 100
	);
	treeArray[i] = tp;
	// ttpos.x =
	// tp.y += 5;
	// treeArray.push(tp);
	var tree = new THREE.Mesh(new THREE.ConeBufferGeometry(3, 12, 6, 1, true), treeMaterial(tp));
	tree.castShadow = true;
	tree.receiveShadow = true;
	tree.position.copy(tp);
	ground.add(tree);
}
console.log(treeArray.reduce((a, b) => a + b.x + "," + b.y + "," + b.z + "/", ""));

var rt = new THREE.WebGLCubeRenderTarget(128);
var cc = new THREE.CubeCamera(
	1, 10000,
	rt
);

// var box = new THREE.Mesh(
// 	new THREE.BoxBufferGeometry(2, 2, 2),
// 	new THREE.MeshBasicMaterial({color: new THREE.Color("white")})
// );
var box = new VEHICLES.RacingTruck().mesh;
box.position.set(0, 10 - 7.8, 0);
box.rotation.set(0, Math.PI, 0);
// scene.add(box);
// box.velocity = new THREE.Vector3(0, 0, 0);
// box.rotVel = new THREE.Vector3(0, 0, 0);
// box.rotation.set(0, Math.PI, 0);
function addPoint(c, x, y, z, spring, steer, sett){
	var p = new THREE.Mesh(
		new THREE.SphereBufferGeometry(0.1),
		new THREE.MeshBasicMaterial({color: new THREE.Color("red")})
	);
	p.position.set(x, y, z);
	if(spring){
		for(i in sett)
			p[i] = sett[i];
		p.spring = true;
		p.pos = 0;
		p.original = p.position.clone();
		p.vel = 0.00;
		p.la = 0;
		p.spin = 0;
		var w = new THREE.Mesh(
			new THREE.CylinderBufferGeometry(0.5, 0.5, 0.1),
			new THREE.MeshBasicMaterial()
		);
		w.rotation.z = Math.PI / 2;
		w.position.y = 0.5;
		p.add(w);
	}
	if(steer){
		p.steer = steer;
	}
	c.add(p);
}

var dot = new THREE.Mesh(
	new THREE.SphereBufferGeometry(0.1),
	new THREE.MeshBasicMaterial({color: new THREE.Color("#800")})
);

// addPoint(0, -1.5, 0, true, true);
// addPoint(-1, 0, 0);
// addPoint(1, 0, 0);
// // addPoint(0, -1, 0);
// addPoint(0, 1, 0);
// addPoint(0, 0, -1);
// addPoint(0, 0, 1);
// // addPoint(0, 0, 0);
// addPoint(0, 1, 0);
// addPoint(-1.2, -0.5, -2.2, true, true);
// addPoint(-1.2, -0.5, 2.2, true);
// addPoint(1.2, -0.5, -2.2, true, true);
// addPoint(1.2, -0.5, 2.2, true);

// addPoint(-1.4, 0.5, -2.3);
// addPoint(-1.4, 0.5, 2.3);
// addPoint(1.4, 0.5, -2.3);
// addPoint(1.4, 0.5, 2.3);

// // addPoint(-1.6, 0, -2.2);
// // addPoint(-1.6, 0, 2.2);
// // addPoint(1.6, 0, -2.2);
// // addPoint(1.6, 0, 2.2);

// // addPoint(-1.6, -0.5, -2.2);
// // addPoint(-1.6, -0.5, 2.2);
// // addPoint(1.6, -0.5, -2.2);
// // addPoint(1.6, -0.5, 2.2);

// // addPoint(-1, 0, -2);
// // addPoint(-1, 0, 2);
// // addPoint(1, 0, -2);
// // addPoint(1, 0, 2);
// addPoint(-1, 1.5, -2);
// addPoint(-1, 1.5, 2);
// addPoint(1, 1.5, -2);
// addPoint(1, 1.5, 2);
// addPoint(0, 0, 0);

scene.add(new THREE.HemisphereLight(0x888888, 0x222222));

var keys = [false, false, false, false];

window.onkeydown = function(e){
	if(e.code == "KeyW" || e.code == "ArrowUp")
		keys[0] = true;
	if(e.code == "KeyA" || e.code == "ArrowLeft")
		keys[1] = true;
	if(e.code == "KeyS" || e.code == "ArrowDown")
		keys[2] = true;
	if(e.code == "KeyD" || e.code == "ArrowRight")
		keys[3] = true;
	if(e.code == "KeyC")
		keys[4] = true;
}

window.onkeyup = function(e){
	if(e.code == "KeyW" || e.code == "ArrowUp")
		keys[0] = false;
	if(e.code == "KeyA" || e.code == "ArrowLeft")
		keys[1] = false;
	if(e.code == "KeyS" || e.code == "ArrowDown")
		keys[2] = false;
	if(e.code == "KeyD" || e.code == "ArrowRight")
		keys[3] = false;
	if(e.code == "KeyC")
		keys[4] = false;
}


var ray = new THREE.Raycaster();
ray.near = 0;
var n = new THREE.Vector3();
var q = new THREE.Quaternion();
// var warp = 0;
function rotate(a){
	box.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), box.rotVel.x * a);
	box.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), box.rotVel.y * a);
	box.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), box.rotVel.z * a);
}
function unrotate(a){
	box.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -box.rotVel.z * a);
	box.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -box.rotVel.y * a);
	box.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), -box.rotVel.x * a);
}
function pos(i){
	return box.children[i].getWorldPosition(n).clone();
}

function getVel(from, normal){
	rotate(EPSILON);
	box.updateMatrixWorld();
	var realVel = from.getWorldPosition(n).clone();
	unrotate(EPSILON);
	box.updateMatrixWorld();
	realVel.sub(from.getWorldPosition(n).clone());
	realVel.multiplyScalar(1 / EPSILON);
	realVel.add(box.velocity.clone());
	if(from.spring)
		realVel.add(from.direction.clone().applyQuaternion(from.getWorldQuaternion(q)).multiplyScalar(from.vel))
			 .add((normal ? from.side.clone().applyQuaternion(from.getWorldQuaternion(q)).cross(normal).multiplyScalar(from.spin) : new THREE.Vector3()));
	return realVel;
}

function force(from, vec){
	var oj = new THREE.Object3D();
	oj.position.copy(from);
	var cV = getVel(oj);
	cV.add(vec);
	box.rotVel.add((from.clone().sub(box.position)).clone().cross(vec));
	var nV = getVel(oj);
	box.velocity.add(cV.sub(nV));
}

function debug(obj, dir, col){
	dir = dir.clone().multiplyScalar(20);
	var d = new THREE.Mesh(new THREE.BoxBufferGeometry(0.05, 0.05, dir.length()), new THREE.MeshBasicMaterial({color: new THREE.Color(col)}));
	d.lookAt(dir);
	d.position.copy(dir.clone().multiplyScalar(0.5));
	obj.add(d);
}

var lt = -1;
var warp;

function render(t){
	requestAnimationFrame(render);
	if(lt < 0)
		lt = t;
	warp = t - lt;
	lt = t;
	warp = 16;
	// warp = Math.min(warp, 32);
	if(keys[4]){
		keys[4] = false;
		camera.free = !camera.free;
	}
	if(camera.free){
		if(keys[0])
			camera.position.add(camera.getWorldDirection(n).multiplyScalar(1));
		if(keys[2])
			camera.position.add(camera.getWorldDirection(n).multiplyScalar(-1));
	}else{
		camera.position.copy(camera.position.multiplyScalar(1 - CAM_SPEED).add(new THREE.Vector3(0, 0, 5).applyQuaternion(box.quaternion).add(box.position).add(new THREE.Vector3(0, 2, 0)).multiplyScalar(CAM_SPEED)));
		camera.lookAt(box.position);
	}
	renderer.render(scene, camera);
	var acc = box.velocity.clone();
	box.velocity.y -= 9.8 * warp / 1000 * 2;
	for(var i = 0; i < box.children.length; i++){
		var b = box.children[i];
		b.material.color = new THREE.Color("#f00");
		var rayPos = b.spring ? pos(i).add(b.direction.clone().applyQuaternion(b.quaternion).multiplyScalar((b.maxDist - b.pos) + 3)) : pos(0);
		ray.set(rayPos, (pos(i).sub(rayPos)).normalize());
		ray.far = pos(i).sub(rayPos).length();
		var intersects = ray.intersectObject(ground, true);
		if(intersects.length > 0){
			var d = dot.clone();
			d.position.copy(intersects[0].point);
			// scene.add(d);
			b.material.color = new THREE.Color("#0f0");
			
			var normal = intersects[0].face.normal.applyQuaternion(intersects[0].object.getWorldQuaternion(q));
			
			//debug(d, normal, "#0ff");
			
			var realVel = getVel(b, normal);
			
			//debug(d, realVel, "#f00");
			
			var vpart = realVel.dot(normal);
			
			var friction = realVel.clone().sub(normal.clone().multiplyScalar(vpart)).negate();
			if(b.spring || vpart < 0){
				vpart = Math.min(vpart, 0);
				
				b.material.color = new THREE.Color("#0ff");
				vpart = normal.clone().multiplyScalar(vpart);
				if(friction.length() > FRICTION_MAX){
					friction = friction.normalize().multiplyScalar(FRICTION_SLIP);
					console.log("oi");
				}
				vpart.multiplyScalar(-(b.spring ? WHEELBOUNCE : BOUNCE)).add(friction);
				// debug(d, vpart, "#ff0");
				var vpartMod = new THREE.Vector3();
				if(b.spring){
					var damp = b.pos >= b.maxDist ? 0 : box.damping;
					var rD = b.direction.clone().applyQuaternion(b.getWorldQuaternion(q));
					b.vel += vpart.dot(rD) * damp;
					vpartMod.sub(rD.clone().multiplyScalar(vpart.dot(rD) * damp * 1));
					
					var rV = b.side.clone().applyQuaternion(b.getWorldQuaternion(q)).cross(normal);
					b.spin += vpart.dot(rV) * (1 / (1 + WHEEL_SPIN_RATIO));
					vpartMod.sub(rV.clone().multiplyScalar(vpart.dot(rV) * (1 / (1 + WHEEL_SPIN_RATIO))))
					
					b.pos = Math.min(Math.max(b.pos, 2.9 + b.maxDist - intersects[0].distance), b.maxDist);
				}
				vpart.add(vpartMod);
				
				if(vpart.length() * warp / 1000 > CRASH_THRESHOLD * (b.spring ? 2.5 : 1)){
					var explode = new THREE.Mesh(new THREE.SphereBufferGeometry(3), new THREE.MeshBasicMaterial({color: "#f00"}));
					explode.position.copy(box.position);
					scene.add(explode);
					scene.remove(box);
					camera.free = true;
					console.log(vpart.length());
					vpart.multiplyScalar(0.5);
				}
				
				var target = realVel.clone().add(vpart);
				var dist = pos(i).sub(box.position);
				box.rotVel.add(dist.cross(vpart).multiplyScalar(mInert));
				box.updateMatrixWorld();
				realVel = getVel(b, normal);
				realVel.add(vpartMod);
				target.sub(realVel);
				box.velocity.add(target);
				debug(d, target, "#0f0");
			}
		}
		if(b.spring){
			// console.log(b.spin);
			b.pos += b.vel * warp / 1000;
			
			if(b.pos >= b.maxDist){
				b.pos = b.maxDist;
				b.vel = -Math.abs(b.vel * (WHEELBOUNCE - 1));
			}
			// if(b.pos <= 0){
			// 	b.pos = 0;
			// 	b.vel = Math.abs(b.vel * (WHEELBOUNCE - 1));
			// }
			
			b.vel -= b.k * b.pos * (1 / (1 + WHEEL_SPIN_RATIO)) * warp / 1000;
			force(b.getWorldPosition(n), b.direction.clone().applyQuaternion(b.getWorldQuaternion(q)).multiplyScalar(box.damping * b.k * b.pos / 4 * (WHEEL_SPIN_RATIO / (1 + WHEEL_SPIN_RATIO)) * warp / 1000));
			b.position.copy(b.original.clone().add(b.direction.clone().multiplyScalar(b.pos)));
			b.vel *= Math.pow(b.f, warp / 1000);
			if(keys[0])
				b.spin = box.max_speed * box.acceleration * warp / 1000 + b.spin * (1 - box.acceleration * warp / 1000);
			if(keys[2])
				b.spin = b.spin > 0.1 ? -MAX_REVERSE * BRAKE * warp / 1000 + b.spin * (1 - BRAKE * warp / 1000) : -MAX_REVERSE * box.acceleration * warp / 1000 + b.spin * (1 - box.acceleration * warp / 1000);
			if(!(keys[0] ^ keys[2]))
				b.spin *= 0.995;
		}
		if(b.steer){
			if(keys[1] && b.rotation.y >= 0)
				b.rotation.y = Math.min(b.rotation.y + TURNSPEED * warp / 1000, MAX_TURN);
			if(keys[3] && b.rotation.y <= 0)
				b.rotation.y = Math.max(b.rotation.y - TURNSPEED * warp / 1000, -MAX_TURN);
			if(!((keys[1] && b.rotation.y >= 0) ^ (keys[3] && b.rotation.y <= 0)))
				b.rotation.y = Math.max(Math.abs(b.rotation.y) - TURNSPEED * 5 * warp / 1000, 0) * Math.sign(b.rotation.y);
		}
	}
	box.rotVel.multiplyScalar(0.999);
	
	box.position.add(box.velocity.clone().multiplyScalar(warp / 1000));
	rotate(warp / 1000);
	
	ll.position.copy(box.position).add(new THREE.Vector3(100, 60, -100));
	acc = box.velocity.clone().sub(acc);
	
	stats.update();
}

var ll = new THREE.DirectionalLight();
ll.position.set(100, 60, -100);
ll.castShadow = true;
scene.add(ll);

var camSize = 150;
ll.shadow.camera.top =     camSize;
ll.shadow.camera.bottom = -camSize;
ll.shadow.camera.left =   -camSize;
ll.shadow.camera.right =   camSize;
ll.target = box;
ll.shadow.camera.far = 1000;
ll.shadow.mapSize.width = 1028;
ll.shadow.mapSize.height = 1028;
ll.shadow.bias = 0.0001;

var g = new THREE.Mesh(new THREE.PlaneBufferGeometry(100, 100), new THREE.MeshBasicMaterial({color: "#888"}));
g.rotation.x = -Math.PI / 2;
// ground.add(g);
var o = new THREE.OBJLoader();
o.load("https://jchabin.github.io/ThingHosting/testterrain13smooth.obj", function(e){
	e.children[0].material = groundMat;
	e.children[0].castShadow = true;
	e.children[0].receiveShadow = true;
	render(-1);
	e.position.set(120, 0, -30);
	ground.add(e);
	e.scale.setScalar(3);
	
	cc.update(renderer, scene);
	// scene.background = rt.texture;
	
	// scene.add(new THREE.Mesh(new THREE.SphereBufferGeometry(10), ))
	
	scene.add(box);
});

o.load("https://jchabin.github.io/ThingHosting/startsign.obj", function(e){
	console.log(e.children);
	ground.add(e);
	e.children[0].material[0] = new THREE.MeshStandardMaterial({metalness: 1, roughness: 0.3, envMap: rt.texture});
	e.children[0].material[1] = new THREE.MeshStandardMaterial({metalness: 0, roughness: 1});
	e.children[0].castShadow = true;
	e.children[0].receiveShadow = true;
	e.children[1].material = new THREE.MeshStandardMaterial({metalness: 0.5, roughness: 0.5, map: new THREE.TextureLoader().load("https://jchabin.github.io/ThingHosting/starttexture.png")});
	e.children[1].castShadow = true;
	e.children[1].receiveShadow = true;
	
	e.scale.setScalar(1.5);
	e.rotation.y = -0.25;
	e.position.set(-14, -4, 30);
});

o.load("https://jchabin.github.io/ThingHosting/carbodyv3.obj", function(e){
	console.log(e.children);
	e.position.y = -0.2;
	box.children[0].add(e);
	var body = new THREE.MeshStandardMaterial({metalness: 0.5, roughness: 0.1, envMap: rt.texture, color: "#f22"});
	var metal = new THREE.MeshStandardMaterial({metalness: 0.5, roughness: 0.3, envMap: rt.texture});
	var glass = new THREE.MeshStandardMaterial({metalness: 1, roughness: 0, envMap: rt.texture, color: "#888"});
	var tire = new THREE.MeshStandardMaterial({metalness: 0, roughness: 1, color: "#444"});
	var light = new THREE.MeshBasicMaterial();
	var voidM = new THREE.MeshBasicMaterial({color: "black"});
	console.log(e);
	e.children[0].material = [body, glass, metal, light, voidM];
	e.children[1].material = [body, glass];
	e.children[2].material = metal;
	e.children[3].material = [tire, metal];
	e.children[4].material = light;
	
	for(var i = 0; i < e.children.length; i++)
		e.children[0].castShadow = e.children[0].receiveShadow = true;
	// e.children[0].material = [body, glass, tire, metal, light];
	// e.children[0].castShadow = true;
	// e.children[0].receiveShadow = true;
	// e.children[1].material = [body, glass];
	// e.children[1].castShadow = true;
	// e.children[1].receiveShadow = true;
// 	e.children[0].material[0] = new THREE.MeshStandardMaterial({metalness: 1, roughness: 0.3, envMap: rt.texture});
// 	e.children[0].material[1] = new THREE.MeshStandardMaterial({metalness: 0, roughness: 1});
// 	e.children[0].castShadow = true;
// 	e.children[0].receiveShadow = true;
// 	e.children[1].material = new THREE.MeshStandardMaterial({metalness: 0.5, roughness: 0.5, map: new THREE.TextureLoader().load("https://jchabin.github.io/ThingHosting/starttexture.png")});
// 	e.children[1].castShadow = true;
// 	e.children[1].receiveShadow = true;
	
// 	e.scale.setScalar(1.5);
// 	e.rotation.y = -0.25;
// 	e.position.set(-14, -4, 30);
});