

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function clamp(number, min, max) {

	let result = Math.min(max, Math.max(number, min));
	return result;

}

function lerp(start, end, amt) {
	return (1 - amt) * start + amt * end
}

function inverseLerp(start, end, amt) {
	return (amt - start) / (end - start);
}

function ScrollToWorldspace(scrollX, scrollY, boundingBox) {

	let result = new THREE.Vector2();


	result.x = lerp(boundingBox.min.x, boundingBox.max.x, scrollX);
	result.y = lerp(boundingBox.max.y, boundingBox.min.y, scrollY);

	return result;
}

function WorldspaceToScroll(cameraX, cameraY, boundingBox) {

	let result = new THREE.Vector2();


	result.x = inverseLerp(boundingBox.min.x, boundingBox.max.x, cameraX) * (document.body.scrollWidth - window.innerWidth);
	result.y = inverseLerp(boundingBox.max.y, boundingBox.min.y, cameraY) * (document.body.scrollHeight - window.innerHeight);

	return result;

}

let LINE_TYPES = {

	H: 0,
	V: 1,
	UNKNOWN: 2

};

function CreateLine(p0, p1, name) {

	let result = {

		p0: new THREE.Vector2(p0.position.x, -p0.position.z),
		p1: new THREE.Vector2(p1.position.x, -p1.position.z),
		name: name,
		type: LINE_TYPES.UNKNOWN

	}

	if (p0.position.x == p1.position.x) {
		result.type = LINE_TYPES.V;
	}

	if (p0.position.z == p1.position.z) {
		if (result.type === LINE_TYPES.V) {
			console.error("POINTS 0 AND 1 ARE THE SAME FOR LINE: " + name);
			console.log("point 0: ");
			console.log(p0);
			console.log("point 1: ");
			console.log(p1);
		}

		result.type = LINE_TYPES.H;
	}

	if (result.type === LINE_TYPES.UNKNOWN) {

		console.error("NO VALID LINE TYPE FOUND FOR LINE: " + name);

	}

	return result;


}


function PointIsOnLine(p, line) {

	//console.log(line);
	let lineLength = line.p0.distanceTo(line.p1);
	let distanceToP0 = p.distanceTo(line.p0);
	let distanceToP1 = p.distanceTo(line.p1);

	let result = (lineLength === (distanceToP1 + distanceToP0));

	//console.log("len: " + lineLength);
	//console.log("distace 0: " + distanceToP0);
	//console.log("distance 1: " + distanceToP1);
	//console.log("is distance same: " + result);

	return result;

}


function Camera2DPosition(camera) {

	let result = new THREE.Vector2(camera.position.x, camera.position.y);

	return result;

}

console.log(THREE);


let scene = new THREE.Scene();


//let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let cameraZoom = 2;
let frustumSize = cameraZoom * (window.innerHeight / window.innerWidth);
let aspect = window.innerWidth / window.innerHeight;
let camera = new THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 0.1, 2000);
camera.position.z = 5;


let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//let controlls = new OrbitControls(camera, renderer.domElement);



let geometry = new THREE.BoxGeometry(1, 1, 1);
let material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
let cube = new THREE.Mesh(geometry, material);
//scene.add(cube);

let loadCountdown = 10;


let gltfLoader = new GLTFLoader();

let panelPoints = {};
let panelLines = {};
let sceneBoundingBox = null;

let panels = gltfLoader.load("./models/multi_scroll_test__layout.glb", function(object) {

	console.log(object);

	let children = object.scene.children;

	for (let i = 0; i < children.length; i++) {

		let currentChild = children[i];

		if (currentChild.name.includes("point")) {


			let name = currentChild.name;
			name = name.replace("point", "").replaceAll("_", "");

			panelPoints[name] = currentChild;


		} else {

			currentChild.material = material;

		}

	}

	console.log(panelPoints);
	let startingPosition = new THREE.Vector3();

	panelPoints["a0"].getWorldPosition(startingPosition);
	console.log(startingPosition);


	panelLines["a"] = CreateLine(panelPoints["a0"], panelPoints["a1"], "a");
	panelLines["b"] = CreateLine(panelPoints["b0"], panelPoints["b1"], "b");
	panelLines["c"] = CreateLine(panelPoints["c0"], panelPoints["c1"], "c");

	panelLines["l"] = CreateLine(panelPoints["b0"], panelPoints["c0"], "l");
	panelLines["r"] = CreateLine(panelPoints["b1"], panelPoints["c1"], "r");


	console.log(panelLines);


	camera.position.x = startingPosition.x;
	//NOTE: camera y = point -z
	camera.position.y = -startingPosition.z;


	scene.add(object.scene);
	scene.rotation.x = Math.PI / 2;

	//scene.scale.x = .5;

	//console.log(scene);

	console.log(Camera2DPosition(camera));
	console.log(PointIsOnLine(Camera2DPosition(camera), panelLines["a"]));


	sceneBoundingBox = new THREE.Box3().setFromObject(scene);
	console.log(sceneBoundingBox);


	let scrollPos = WorldspaceToScroll(camera.position.x, camera.position.y, sceneBoundingBox);
	window.scrollTo(scrollPos.x, scrollPos.y);

});

//document.addEventListener("DOMContentLoaded", OnReady, false);
//window.addEventListener("load", OnReady, false);




function OnWindowResize(e) {

	frustumSize = cameraZoom * (window.innerHeight / window.innerWidth);
	aspect = window.innerWidth / window.innerHeight;

	camera.left = frustumSize * aspect / - 2;
	camera.right = frustumSize * aspect / 2;
	camera.top = frustumSize / 2;
	camera.bottom = frustumSize / - 2;


	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

}

function OnWindowScroll(e) {

	/*TODO:
	 * 0) make sure we're on a path
	 * 0a) if not, course correct to the closest path
	 * 0b) create a circle with a small base radius and check for intersection with paths
	 * 0c) if no paths found, increase radius
	 * 0d) repeat until intersection is found
	 * 0e) move camera to the middle of the two intersection points
	 * .5) adjust body classes to ensure the propper scroll is used
	 * 1) if on vertical path, check for overlap with horizontal paths (with some wiggle room)
	 * 2) if on horizontal path, check for overlap with vertical paths 
	 * 3) if current location intersects with another path, add propper scroll class
	 */

}




function animate() {

	let scrollX = window.scrollX / (document.body.scrollWidth - window.innerWidth);
	scrollX = clamp(scrollX, 0, 1);

	let scrollY = window.scrollY / (document.body.scrollHeight - window.innerHeight);
	scrollY = clamp(scrollY, 0, 1);


	if (sceneBoundingBox !== null) {
		let newCameraPosition = ScrollToWorldspace(scrollX, scrollY, sceneBoundingBox);
		//camera.position.x = lerp(sceneBoundingBox.min.x, sceneBoundingBox.max.x, scrollX);
		//camera.position.y = lerp(sceneBoundingBox.max.y, sceneBoundingBox.min.y, scrollY);

		camera.position.x = newCameraPosition.x;
		camera.position.y = newCameraPosition.y;

		//console.log(WorldspaceToScroll(camera.position.x, camera.position.y, sceneBoundingBox));
		//console.log("height: " + (document.body.scrollHeight - window.innerHeight));
		//console.log("width: " + (document.body.scrollWidth - window.innerWidth));

		//console.log(camera.position);
	}



	let panelLineKeys = Object.keys(panelLines);
	for (let i = 0; i < panelLineKeys.length; i++) {

		let currentLine = panelLineKeys[i];

		if (PointIsOnLine(Camera2DPosition(camera), panelLines[currentLine])) {

			//console.log(currentLine);


		}

	}


	renderer.render(scene, camera);

}



window.addEventListener("resize", OnWindowResize);
window.addEventListener("scroll", OnWindowScroll);

renderer.setAnimationLoop(animate);
