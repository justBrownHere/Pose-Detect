

const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');

const WIDTH = 1920;
const HEIGHT = 1080;

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12; 
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_PINKY = 17; 
const RIGHT_PINKY = 18;
const LEFT_INDEX = 19;
const RIGHT_INDEX = 20;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;
const LEFT_FOOT = 31;
const RIGHT_FOOT = 32;

const WRIST = 0;
const INDEX1 = 5;
const MIDDLE1 = 9;
const RING1 = 13;
const PINKY1 = 17;


const NOSE = 1;
const NASAL = 4;
const LEFT = 454;
const RIGHT = 234;  
const TOP = 10;
const BOT = 152;

let skeleton, spine, neckBone;
let leftShoulderBone, leftElbowBone, leftWristBone, rightShoulderBone, rightElbowBone, rightWristBone;
let leftHipBone, leftKneeBone, leftAnkleBone, leftFootBone, rightHipBone, rightKneeBone, rightAnkleBone, rightFootBone;

// Initialize THREE.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Load 3D model
const loader = new FBXLoader();
let avatar;
loader.load('3DModel/remy.fbx', (loadedAvatar) => {
    avatar = loadedAvatar;
    skeleton = avatar.getObjectByName("mixamorigHips");
    spine = skeleton.getObjectByName("mixamorigSpine");
    neckBone = skeleton.getObjectByName("mixamorigHead");

    leftShoulderBone = skeleton.getObjectByName("mixamorigRightArm");
    leftElbowBone = leftShoulderBone.getObjectByName("mixamorigRightForeArm");
    leftWristBone = leftElbowBone.getObjectByName("mixamorigRightHand");
    rightShoulderBone = skeleton.getObjectByName("mixamorigLeftArm");
    rightElbowBone = rightShoulderBone.getObjectByName("mixamorigLeftForeArm");
    rightWristBone = rightElbowBone.getObjectByName("mixamorigLeftHand");

    leftHipBone = skeleton.getObjectByName("mixamorigRightUpLeg");
    leftKneeBone = leftHipBone.getObjectByName("mixamorigRightLeg");
    leftAnkleBone = leftKneeBone.getObjectByName("mixamorigRightFoot");
    leftFootBone = leftAnkleBone.getObjectByName("mixamorigRightToe_End");
    rightHipBone = skeleton.getObjectByName("mixamorigLeftUpLeg");
    rightKneeBone = rightHipBone.getObjectByName("mixamorigLeftLeg");
    rightAnkleBone = rightKneeBone.getObjectByName("mixamorigLeftFoot");
    rightFootBone = rightAnkleBone.getObjectByName("mixamorigLeftToe_End");

    scene.add(avatar);
});

// Initialize MediaPipe
const videoElement = document.getElementById('videoInput');
const preload = document.getElementById('preload');

const holistic = new Holistic({ locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
}});

holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

holistic.onResults((results) => {
    preload.hidden = true;
    let poseLandmarks = results.poseLandmarks;
    let poseWorldLandmarks = results.ea;
    if (poseWorldLandmarks) {
        updateAvatarPose(poseLandmarks, poseWorldLandmarks);
    }

    // Additional handling for hands and face if needed
    let leftHandLandmarks = results.leftHandLandmarks;
    let rightHandLandmarks = results.rightHandLandmarks;
    let faceLandmarks = results.faceLandmarks;
});

const cameraInput = new Camera(videoElement, {
    onFrame: async () => {
        await holistic.send({ image: videoElement });
    },
    width: 1920,
    height: 1080
});

cameraInput.start();

// Render loop
function animate() {
    requestAnimationFrame(animate);
    if (avatar) {
        // Update the avatar's pose here if needed
    }
    renderer.render(scene, camera);
}
animate();

// Smooth rotation helper function
function smoothRotation(bone, rotX, rotY, rotZ) {
    const targetRotation = new THREE.Euler(rotX, rotY, rotZ);
    const currentRotation = bone.rotation.clone();
    currentRotation.x += (targetRotation.x - currentRotation.x) * SMOOTHING;
    currentRotation.y += (targetRotation.y - currentRotation.y) * SMOOTHING;
    currentRotation.z += (targetRotation.z - currentRotation.z) * SMOOTHING;
    bone.rotation.copy(currentRotation);
}

// Update Avatar Pose
function updateAvatarPose(poseLandmarks, poseWorldLandmarks) {
    let userJoints = [];
    poseWorldLandmarks.forEach((landmark) => {
        userJoints.push(new THREE.Vector3(landmark.x, landmark.y, landmark.z).negate());
    });

    let rightShoulderVis = poseWorldLandmarks[12].visibility;
    let leftShoulderVis = poseWorldLandmarks[11].visibility;
    let rightHipVis = poseWorldLandmarks[24].visibility;
    let leftHipVis = poseWorldLandmarks[23].visibility;

    if (rightShoulderVis > VISTHRESH && leftShoulderVis > VISTHRESH) {
        let shoulderX = userJoints[12].clone().sub(userJoints[11]).normalize();
        let shoulderY = userJoints[12].clone().lerp(userJoints[11], 0.5).normalize();
        let shoulderZ = shoulderX.clone().cross(shoulderY).normalize();

        let thetaX = Math.acos(shoulderZ.x);
        let thetaY = Math.acos(shoulderZ.y);
        let thetaZ = Math.acos(shoulderY.x);
        let rotX = thetaY - 1.2 * Math.PI / 2;
        let rotY = - thetaX + Math.PI / 2;
        let rotZ = thetaZ - Math.PI / 2;
        smoothRotation(spine, rotX, rotY, rotZ);

        // Left arm
        let xAxis = shoulderX.clone();
        let yAxis = shoulderY.clone();
        let zAxis = shoulderZ.clone();
        let basis = new THREE.Matrix3().set(
            xAxis.x, yAxis.x, zAxis.x,
            xAxis.y, yAxis.y, zAxis.y,
            xAxis.z, yAxis.z, zAxis.z
        );

        let rot = rotateBone(userJoints[11], userJoints[13], leftElbowBone.position, basis);
        leftShoulderBone.quaternion.slerp(rot, SMOOTHING);
        updateBasis(leftShoulderBone.quaternion, xAxis, yAxis, zAxis, basis);

        rot = rotateBone(userJoints[13], userJoints[15], leftWristBone.position, basis);
        leftElbowBone.quaternion.slerp(rot, SMOOTHING);
        updateBasis(leftElbowBone.quaternion, xAxis, yAxis, zAxis, basis);

        let leftFingersUser = userJoints[17].lerp(userJoints[19], 0.5);
        let leftFingersAvatar = leftWristBone.position.clone().lerp(leftWristBone.position, 0.5);
        rot = rotateBone(userJoints[15], leftFingersUser, leftFingersAvatar, basis);
        leftWristBone.quaternion.slerp(rot, SMOOTHING);

        // Right arm
        xAxis = shoulderX.clone();
        yAxis = shoulderY.clone();
        zAxis = shoulderZ.clone();
        basis = new THREE.Matrix3().set(
            xAxis.x, yAxis.x, zAxis.x,
            xAxis.y, yAxis.y, zAxis.y,
            xAxis.z, yAxis.z, zAxis.z
        );

        rot = rotateBone(userJoints[12], userJoints[14], rightElbowBone.position, basis);
        rightShoulderBone.quaternion.slerp(rot, SMOOTHING);
        updateBasis(rightShoulderBone.quaternion, xAxis, yAxis, zAxis, basis);

        rot = rotateBone(userJoints[14], userJoints[16], rightWristBone.position, basis);
        rightElbowBone.quaternion.slerp(rot, SMOOTHING);
        updateBasis(rightElbowBone.quaternion, xAxis, yAxis, zAxis, basis);

        let rightFingersUser = userJoints[18].lerp(userJoints[20], 0.5);
        let rightFingersAvatar = rightWristBone.position.clone().lerp(rightWristBone.position, 0.5);
        rot = rotateBone(userJoints[16], rightFingersUser, rightFingersAvatar, basis);
        rightWristBone.quaternion.slerp(rot, SMOOTHING);
    }

    if (rightHipVis > VISTHRESH && leftHipVis > VISTHRESH) {
        let hipX = userJoints[24].clone().sub(userJoints[23]).normalize();
        let hipY = userJoints[24].clone().lerp(userJoints[23], 0.5).normalize();
        let hipZ = hipX.clone().cross(hipY).normalize();

        let thetaX = Math.acos(hipZ.x);
        let thetaY = Math.acos(hipZ.y);
        let thetaZ = Math.acos(hipY.x);
        let rotX = thetaY - Math.PI / 2;
        let rotY = - thetaX + Math.PI / 2;
        let rotZ = thetaZ - Math.PI / 2;
        smoothRotation(skeleton, rotX, rotY, rotZ);

        // Left leg
        let xAxis = hipX.clone();
        let yAxis = hipY.clone();
        let zAxis = hipZ.clone();
        let basis = new THREE.Matrix3().set(
            xAxis.x, yAxis.x, zAxis.x,
            xAxis.y, yAxis.y, zAxis.y,
            xAxis.z, yAxis.z, zAxis.z
        );

        rot = rotateBone(userJoints[23], userJoints[25], leftKneeBone.position, basis);
        leftHipBone.quaternion.slerp(rot, SMOOTHING);
        updateBasis(leftHipBone.quaternion, xAxis, yAxis, zAxis, basis);

        rot = rotateBone(userJoints[25], userJoints[27], leftAnkleBone.position, basis);
        leftKneeBone.quaternion.slerp(rot, SMOOTHING);
        updateBasis(leftKneeBone.quaternion, xAxis, yAxis, zAxis, basis);

        let leftToesUser = userJoints[27].clone().lerp(userJoints[29], 0.5);
        let leftToesAvatar = leftFootBone.position.clone().lerp(leftFootBone.position, 0.5);
        rot = rotateBone(userJoints[27], leftToesUser, leftToesAvatar, basis);
        leftAnkleBone.quaternion.slerp(rot, SMOOTHING);

        // Right leg
        xAxis = hipX.clone();
        yAxis = hipY.clone();
        zAxis = hipZ.clone();
        basis = new THREE.Matrix3().set(
            xAxis.x, yAxis.x, zAxis.x,
            xAxis.y, yAxis.y, zAxis.y,
            xAxis.z, yAxis.z, zAxis.z
        );

        rot = rotateBone(userJoints[24], userJoints[26], rightKneeBone.position, basis);
        rightHipBone.quaternion.slerp(rot, SMOOTHING);
        updateBasis(rightHipBone.quaternion, xAxis, yAxis, zAxis, basis);

        rot = rotateBone(userJoints[26], userJoints[28], rightAnkleBone.position, basis);
        rightKneeBone.quaternion.slerp(rot, SMOOTHING);
        updateBasis(rightKneeBone.quaternion, xAxis, yAxis, zAxis, basis);

        let rightToesUser = userJoints[28].clone().lerp(userJoints[30], 0.5);
        let rightToesAvatar = rightFootBone.position.clone().lerp(rightFootBone.position, 0.5);
        rot = rotateBone(userJoints[28], rightToesUser, rightToesAvatar, basis);
        rightAnkleBone.quaternion.slerp(rot, SMOOTHING);
    }
}

// Bone rotation helper functions (update these as needed from avatar.js)
function rotateBone(from, to, targetPos, basis) {
    let targetVec = to.clone().sub(from).normalize();
    let basisVec = targetPos.clone().normalize();
    let angle = Math.acos(targetVec.dot(basisVec));
    let axis = targetVec.clone().cross(basisVec).normalize();
    let quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    return quaternion;
}

function updateBasis(quaternion, xAxis, yAxis, zAxis, basis) {
    let newBasis = new THREE.Matrix4().makeRotationFromQuaternion(quaternion).multiply(basis);
    xAxis.copy(new THREE.Vector3(newBasis.elements[0], newBasis.elements[1], newBasis.elements[2]));
    yAxis.copy(new THREE.Vector3(newBasis.elements[4], newBasis.elements[5], newBasis.elements[6]));
    zAxis.copy(new THREE.Vector3(newBasis.elements[8], newBasis.elements[9], newBasis.elements[10]));
}

