const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');

const WIDTH = 1920;
const HEIGHT = 1080;

const SMOOTHING = 0.25;
const VISTHRESH = 0.9;

// Pose constants
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
// const LEFT_HEEL = 29;
// const RIGHT_HEEL = 30;
const LEFT_FOOT = 31;
const RIGHT_FOOT = 32;

// Hand pose constants
const WRIST = 0;
const INDEX1 = 5;
const MIDDLE1 = 9;
const RING1 = 13;
const PINKY1 = 17;

// Face pose constants
const NOSE = 1;
const NASAL = 4;
const TOP = 10;

let skeleton, spine, neckBone, morphTargets, morphDict;
let leftShoulderBone, leftElbowBone, leftWristBone, rightShoulderBone, rightElbowBone, rightWristBone;
let leftHipBone, leftKneeBone, leftAnkleBone, leftFootBone, rightHipBone, rightKneeBone, rightAnkleBone, rightFootBone;
let leftHandBones, rightHandBones;

// Function to process results from MediaPipe
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                       {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks,
                      {color: '#FF0000', lineWidth: 2});

        // Convert pose landmarks to model pose
        const poseData = results.poseLandmarks.reduce((acc, landmark, index) => {
            acc[index] = {x: Math.round(landmark.x * WIDTH), y: Math.round(landmark.y * HEIGHT), z: Math.round(landmark.z)};
            return acc;
        }, {});
        console.log("Pose data: ",poseData)
        setPose(poseData);
    }
    if (results.rightHandLandmarks) {
        drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS,
                       {color: '#00FF00', lineWidth: 2});
        drawLandmarks(canvasCtx, results.rightHandLandmarks, {color: '#FF0000', lineWidth: 1});

        // Convert hand landmarks to model hand
        const handData = results.rightHandLandmarks.reduce((acc, landmark, index) => {
            acc[index] = {x: landmark.x, y: landmark.y, z: landmark.z};
            return acc;
        }, {});
        setFinger(handData, 'right');
    }
    if (results.leftHandLandmarks) {
        drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS,
                       {color: '#00FF00', lineWidth: 2});
        drawLandmarks(canvasCtx, results.leftHandLandmarks, {color: '#FF0000', lineWidth: 1});

        // Convert hand landmarks to model hand
        const handData = results.leftHandLandmarks.reduce((acc, landmark, index) => {
            acc[index] = {x: landmark.x, y: landmark.y, z: landmark.z};
            return acc;
        }, {});
        setFinger(handData, 'left');
    }

    canvasCtx.restore();
}

const holistic = new Holistic({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
}});

holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: true,
    refineFaceLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

holistic.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await holistic.send({image: videoElement});
    },
    width: 640,
    height: 480
});

camera.start();

// Three.js setup
const scene = new THREE.Scene();
const camera3D = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(640, 480);
document.getElementById('model-container').appendChild(renderer.domElement);

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 0.51, 0.51);
scene.add(directionalLight);

// Add OrbitControls
const controls = new THREE.OrbitControls(camera3D, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// Load FBX model
const loader = new THREE.FBXLoader();
loader.load(
    '3DModel/remy.fbx',
    function (fbx) {
        const model = fbx;
        let skinnedMesh = model.getObjectByName("Body");
        console.log(skinnedMesh);
        if (skinnedMesh) {
            morphDict = skinnedMesh.morphTargetDictionary;
            morphTargets = skinnedMesh.morphTargetInfluences;
        } else {
            console.log("Skin mesh not available");
        }

        skeleton = model.getObjectByName("mixamorigHips");
        spine = model.getObjectByName("mixamorigSpine");
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

        leftHandBones = [
            leftWristBone,
            leftWristBone.getObjectByName("mixamorigRightHandThumb1"),
            leftWristBone.getObjectByName("mixamorigRightHandThumb2"),
            leftWristBone.getObjectByName("mixamorigRightHandThumb3"),
            leftWristBone.getObjectByName("mixamorigRightHandIndex1"),
            leftWristBone.getObjectByName("mixamorigRightHandIndex2"),
            leftWristBone.getObjectByName("mixamorigRightHandIndex3"),
            leftWristBone.getObjectByName("mixamorigRightHandMiddle1"),
            leftWristBone.getObjectByName("mixamorigRightHandMiddle2"),
            leftWristBone.getObjectByName("mixamorigRightHandMiddle3"),
            leftWristBone.getObjectByName("mixamorigRightHandRing1"),
            leftWristBone.getObjectByName("mixamorigRightHandRing2"),
            leftWristBone.getObjectByName("mixamorigRightHandRing3"),
            leftWristBone.getObjectByName("mixamorigRightHandPinky1"),
            leftWristBone.getObjectByName("mixamorigRightHandPinky2"),
            leftWristBone.getObjectByName("mixamorigRightHandPinky3")
        ];

        rightHandBones = [
            rightWristBone,
            rightWristBone.getObjectByName("mixamorigLeftHandThumb1"),
            rightWristBone.getObjectByName("mixamorigLeftHandThumb2"),
            rightWristBone.getObjectByName("mixamorigLeftHandThumb3"),
            rightWristBone.getObjectByName("mixamorigLeftHandIndex1"),
            rightWristBone.getObjectByName("mixamorigLeftHandIndex2"),
            rightWristBone.getObjectByName("mixamorigLeftHandIndex3"),
            rightWristBone.getObjectByName("mixamorigLeftHandMiddle1"),
            rightWristBone.getObjectByName("mixamorigLeftHandMiddle2"),
            rightWristBone.getObjectByName("mixamorigLeftHandMiddle3"),
            rightWristBone.getObjectByName("mixamorigLeftHandRing1"),
            rightWristBone.getObjectByName("mixamorigLeftHandRing2"),
            rightWristBone.getObjectByName("mixamorigLeftHandRing3"),
            rightWristBone.getObjectByName("mixamorigLeftHandPinky1"),
            rightWristBone.getObjectByName("mixamorigLeftHandPinky2"),
            rightWristBone.getObjectByName("mixamorigLeftHandPinky3")
        ];

        scene.add(model);
        camera3D.position.z = 5;

        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera3D);
        }
        animate();
    }
);

function setPose(poseData) {
    // Helper function to set rotation for bones
    function setBoneRotation(bone, poseKey) {
        if (poseData[poseKey]) {
            bone.rotation.set(poseData[poseKey].x, poseData[poseKey].y, poseData[poseKey].z);
        }
    }

    setBoneRotation(leftShoulderBone, LEFT_SHOULDER);
    setBoneRotation(rightShoulderBone, RIGHT_SHOULDER);
    setBoneRotation(leftElbowBone, LEFT_ELBOW);
    setBoneRotation(rightElbowBone, RIGHT_ELBOW);
    setBoneRotation(leftWristBone, LEFT_WRIST);
    setBoneRotation(rightWristBone, RIGHT_WRIST);

    setBoneRotation(leftHipBone, LEFT_HIP);
    setBoneRotation(rightHipBone, RIGHT_HIP);
    setBoneRotation(leftKneeBone, LEFT_KNEE);
    setBoneRotation(rightKneeBone, RIGHT_KNEE);
    setBoneRotation(leftAnkleBone, LEFT_ANKLE);
    setBoneRotation(rightAnkleBone, RIGHT_ANKLE);
    setBoneRotation(leftFootBone, LEFT_FOOT);
    setBoneRotation(rightFootBone, RIGHT_FOOT);
}

function setFinger(handData, hand) {
    const handBones = hand === 'left' ? leftHandBones : rightHandBones;
    handBones.forEach((bone, index) => {
        if (handData[WRIST + index]) {
            bone.rotation.set(handData[WRIST + index].x, handData[WRIST + index].y, handData[WRIST + index].z);
        }
    });
}

// Optional: Adjust camera position to fit the model
camera3D.position.set(0, 1, 1);
controls.target.set(0, 1, 0);