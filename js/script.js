
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');

const WIDTH = 1920;
const HEIGHT = 1080;

const SMOOTHING = 0.25;
const VISTHRESH = 0.9;

//pose const
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
const LEFT_HEEL = 29;
const RIGHT_HEEL = 30;
const LEFT_FOOT = 31;
const RIGHT_FOOT = 32;

//hand pose
const WRIST = 0;
const INDEX1 = 5;
const MIDDLE1 = 9;
const RING1 = 13;
const PINKY1 = 17;

//face pose
const NOSE = 1;
const NASAL = 4; 
// const LEFT = 454;
// const RIGHT = 234;
const TOP = 10;
// const BOT = 152;


// Hàm xử lý kết quả từ MediaPipe
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Vẽ hình ảnh từ camera lên canvas
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // Vẽ body pose
    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                       {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks,
                      {color: '#FF0000', lineWidth: 2});
    }
    
    // Vẽ hand pose
    if (results.rightHandLandmarks) {
        drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS,
                       {color: '#00FF00', lineWidth: 2});
        drawLandmarks(canvasCtx, results.rightHandLandmarks, {color: '#FF0000', lineWidth: 1});
    }
    if (results.leftHandLandmarks) {
        drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS,
                       {color: '#00FF00', lineWidth: 2});
        drawLandmarks(canvasCtx, results.leftHandLandmarks, {color: '#FF0000', lineWidth: 1});
    }
    console.log("Pose body: ",results.poseLandmarks);
    console.log("Left Hand: ", results.leftHandLandmarks);
    console.log("Right Hand: ", results.rightHandLandmarks);
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

// Thiết lập camera để lấy dữ liệu video
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await holistic.send({image: videoElement});
    },
    width: 640,
    height: 480
});

camera.start();

function setPose(params) {
    
}

function setFinger(){
    
}

// Thiết lập Three.js
const scene = new THREE.Scene();
const camera3D = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(640, 480);
document.getElementById('model-container').appendChild(renderer.domElement);

// Thêm ánh sáng
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 0.51, 0.51);
scene.add(directionalLight);

// Thêm OrbitControls
const controls = new THREE.OrbitControls(camera3D, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// Tải mô hình FBX
const loader = new THREE.FBXLoader();
loader.load(
    '3DModel/remy.fbx', 
    function (fbx) {
        const model = fbx;
        let skinnedMesh = model.getObjectByName("Body");
        console.log(skinnedMesh)
        if (skinnedMesh){
            morphDict = skinnedMesh.morphTargetDictionary;
            morphTargets = skinnedMesh.morphTargetInfluences;
        }
        else console.log("Skin mesh not availble");

        // let skinnedMesh = model.traverse((child) => {
        //     if (child.isBone){
        //         console.log("Joints: ",child.name)
        //     }
        // })

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
            leftWristBone.getObjectByName("mixamorigRightHandThumb4"),
            leftWristBone.getObjectByName("mixamorigRightHandIndex1"),
            leftWristBone.getObjectByName("mixamorigRightHandIndex2"),
            leftWristBone.getObjectByName("mixamorigRightHandIndex3"),
            leftWristBone.getObjectByName("mixamorigRightHandIndex4"),
            leftWristBone.getObjectByName("mixamorigRightHandMiddle1"),
            leftWristBone.getObjectByName("mixamorigRightHandMiddle2"),
            leftWristBone.getObjectByName("mixamorigRightHandMiddle3"),
            leftWristBone.getObjectByName("mixamorigRightHandMiddle4"),
            leftWristBone.getObjectByName("mixamorigRightHandRing1"),
            leftWristBone.getObjectByName("mixamorigRightHandRing2"),
            leftWristBone.getObjectByName("mixamorigRightHandRing3"),
            leftWristBone.getObjectByName("mixamorigRightHandRing4"),
            leftWristBone.getObjectByName("mixamorigRightHandPinky1"),
            leftWristBone.getObjectByName("mixamorigRightHandPinky2"),
            leftWristBone.getObjectByName("mixamorigRightHandPinky3"),
            leftWristBone.getObjectByName("mixamorigRightHandPinky4"), 
        ]
        
        leftHandBones = [
            rightWristBone,
            rightWristBone.getObjectByName("mixamorigLeftHandThumb1"),
            rightWristBone.getObjectByName("mixamorigLeftHandThumb2"),
            rightWristBone.getObjectByName("mixamorigLeftHandThumb3"),
            rightWristBone.getObjectByName("mixamorigLeftHandThumb4"),
            rightWristBone.getObjectByName("mixamorigLeftHandIndex1"),
            rightWristBone.getObjectByName("mixamorigLeftHandIndex2"),
            rightWristBone.getObjectByName("mixamorigLeftHandIndex3"),
            rightWristBone.getObjectByName("mixamorigLeftHandIndex4"),
            rightWristBone.getObjectByName("mixamorigLeftHandMiddle1"),
            rightWristBone.getObjectByName("mixamorigLeftHandMiddle2"),
            rightWristBone.getObjectByName("mixamorigLeftHandMiddle3"),
            rightWristBone.getObjectByName("mixamorigLeftHandMiddle4"),
            rightWristBone.getObjectByName("mixamorigLeftHandRing1"),
            rightWristBone.getObjectByName("mixamorigLeftHandRing2"),
            rightWristBone.getObjectByName("mixamorigLeftHandRing3"),
            rightWristBone.getObjectByName("mixamorigLeftHandRing4"),
            rightWristBone.getObjectByName("mixamorigLeftHandPinky1"),
            rightWristBone.getObjectByName("mixamorigLeftHandPinky2"),
            rightWristBone.getObjectByName("mixamorigLeftHandPinky3"),
            rightWristBone.getObjectByName("mixamorigLeftHandPinky4"),
        ]

        model.traverse((child) => {
            if (child.isMesh){
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(model);

        // Tự động điều chỉnh camera để vừa với model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera3D.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

        camera3D.position.z = cameraZ * 1.5; 

        // Cập nhật OrbitControls
        controls.target.copy(center);
        controls.maxDistance = cameraZ * 10;
        controls.minDistance = cameraZ * 0.5;
        controls.update();

        function animate() {
            requestAnimationFrame(animate);

            controls.update(); // Cập nhật controls trong mỗi frame

            renderer.render(scene, camera3D);
        }
        animate();
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('An error happened', error);
    }
);