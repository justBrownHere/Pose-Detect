import uvicorn
from fastapi import FastAPI, WebSocket
import numpy as np
import onnxruntime as ort
import pose_media as pm

app = FastAPI()
model = ort.InferenceSession('md5-fp16.onnx')
pose = pm.mediapipe_pose()
actions = np.array(["Wave_hands", "Like", "Dislike"])  # Thay đổi actions cho phù hợp

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    sequence = []
    count = 0
    await websocket.accept()
    while True:
        try:
            data = await websocket.receive_text()
            keypoints = np.array([float(k) for k in data.split(",")])

            if keypoints.size != 33 * 4 + 21 * 3 + 21 * 3:  # Đảm bảo số lượng keypoints chính xác
                await websocket.send_json({"error": "Dữ liệu keypoints nhận được không hợp lệ"})
                continue

            sequence.append(keypoints)
            sequence = sequence[-30:]

            if len(sequence) == 30:
                res = model.run(None, {model.get_inputs()[0].name: np.expand_dims(sequence, axis=0).astype(np.float16)})[0]
                res = res.flatten()
                print("sent",count)
                count+=1
                await websocket.send_json({
                    # "keypoints": keypoints.tolist(),
                    "res": res.tolist()  # Gửi res dưới dạng list
                })

        except Exception as e:
            print(f"Lỗi: {e}")
            await websocket.send_json({"error": str(e)})
            break

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
