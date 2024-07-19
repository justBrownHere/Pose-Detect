const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const probCanvasElement = document.getElementById('probCanvas');
const probCanvasCtx = probCanvasElement.getContext('2d');
const toggleButton = document.getElementById('toggleButton');

// Tạo kết nối WebSocket
const socket = new WebSocket("ws://localhost:8000/ws");

socket.onopen = function(event) {
  console.log("WebSocket is open now.");
};

socket.onclose = function(event) {
  console.log("WebSocket is closed now.");
};

socket.onerror = function(error) {
  console.log("WebSocket error: " + error);
};

let latestProbabilities = [0, 0, 0]; // Mảng để lưu trữ xác suất mới nhất nhận được từ server
let holisticActive = true; // Trạng thái của MediaPipe Holistic

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.error) {
    console.error("Error from server: ", data.error);
  } else {
    latestProbabilities = data.res;
  }
};

// Hàm trích xuất tọa độ landmark
function extractKeypoints(results) {
  const poseLandmarks = results.poseLandmarks;
  const leftHandLandmarks = results.leftHandLandmarks;
  const rightHandLandmarks = results.rightHandLandmarks;

  const pose = poseLandmarks !== undefined 
    ? poseLandmarks.reduce((acc, landmark) => 
        acc.concat([landmark.x, landmark.y, landmark.z, landmark.visibility]), []) 
    : Array(33 * 4).fill(0);

  const lh = leftHandLandmarks !== undefined 
    ? leftHandLandmarks.reduce((acc, landmark) => 
        acc.concat([landmark.x, landmark.y, landmark.z]), []) 
    : Array(21 * 3).fill(0);

  const rh = rightHandLandmarks !== undefined 
    ? rightHandLandmarks.reduce((acc, landmark) => 
        acc.concat([landmark.x, landmark.y, landmark.z]), []) 
    : Array(21 * 3).fill(0);

  return pose.concat(lh, rh);
}

// Hàm xử lý kết quả từ MediaPipe
function onResults(results) {
  if (!holisticActive) return;

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Vẽ hình ảnh từ camera lên canvas
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  // Vẽ pose, tay trái, tay phải
  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
  drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2});
  drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {color: '#00CC00', lineWidth: 5});
  drawLandmarks(canvasCtx, results.leftHandLandmarks, {color: '#CC0000', lineWidth: 2});
  drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {color: '#CC0000', lineWidth: 5});
  drawLandmarks(canvasCtx, results.rightHandLandmarks, {color: '#00CC00', lineWidth: 2});

  // Trích xuất và gửi tọa độ landmark qua WebSocket
  const keypoints = extractKeypoints(results);
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(keypoints.map(k => k.toFixed(5)).join(','));
  }

  // Vẽ các thanh phần trăm
  const actions = ["Wave_hands", "Like", "Dislike"];
  const colors = [
    [245, 117, 16], 
    [117, 245, 16], 
    [16, 117, 245]
  ];
  drawProbabilityBars(latestProbabilities, actions, colors, probCanvasCtx);

  canvasCtx.restore();
}

// Hàm vẽ thanh phần trăm
function drawProbabilityBars(probabilities, actions, colors, ctx) {
  ctx.clearRect(0, 0, probCanvasElement.width, probCanvasElement.height); // Xóa canvas
  const barWidth = 200; 
  const barHeight = 20; 
  const startX = 10;    
  const startY = 10;    

  for (let i = 0; i < probabilities.length; i++) {
    const prob = probabilities[i];
    const barLength = prob * barWidth; 

    ctx.fillStyle = `rgb(${colors[i][0]}, ${colors[i][1]}, ${colors[i][2]})`;
    ctx.fillRect(startX, startY + i * (barHeight + 5), barLength, barHeight);

    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(
      `${actions[i]}: ${Math.round(prob * 100)}%`,
      startX + barLength + 5,
      startY + i * (barHeight + 5) + barHeight / 1.5 
    );
  }
}

// Khởi tạo và cấu hình MediaPipe Holistic
const holistic = new Holistic({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
}});
holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
holistic.onResults(onResults);

// Khởi tạo và bắt đầu camera
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await holistic.send({image: videoElement});
  },
  width: 640,
  height: 480
});
camera.start();

// Bật/Tắt MediaPipe Holistic
toggleButton.addEventListener('click', () => {
  holisticActive = !holisticActive;
  toggleButton.textContent = holisticActive ? 'Pause' : 'Resume';
  if (!holisticActive) {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    probCanvasCtx.clearRect(0, 0, probCanvasElement.width, probCanvasElement.height);
  }
});
