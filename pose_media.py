import mediapipe as mp
import cv2
import numpy as np
import time

class mediapipe_pose:
    def __init__(self):
        self.mp_holistic = mp.solutions.holistic 
        self.mp_drawing = mp.solutions.drawing_utils
    def mediapipe_detection(self,image,model):
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) 
        image.flags.writeable = False                 
        results = model.process(image)                 
        image.flags.writeable = True                   
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR) 
        return image, results
    def draw_styled_landmarks(self,image, results):
        self.mp_drawing.draw_landmarks(image, results.pose_landmarks, self.mp_holistic.POSE_CONNECTIONS,
                                 self.mp_drawing.DrawingSpec(color=(112,112,112), thickness=2, circle_radius=1), 
                                 self.mp_drawing.DrawingSpec(color=(94,200,0), thickness=2, circle_radius=1)
                                 ) 


        self.mp_drawing.draw_landmarks(image, results.left_hand_landmarks, self.mp_holistic.HAND_CONNECTIONS, 
                                self.mp_drawing.DrawingSpec(color=(121,22,76), thickness=2, circle_radius=4), 
                                self.mp_drawing.DrawingSpec(color=(121,44,250), thickness=2, circle_radius=2)
                                ) 
        self.mp_drawing.draw_landmarks(image, results.right_hand_landmarks, self.mp_holistic.HAND_CONNECTIONS, 
                            self.mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=4), 
                            self.mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2)
                            )

    def extract_keypoints(self,results):
        pose = np.array([[res.x, res.y, res.z, res.visibility] for res in results.pose_landmarks.landmark]).flatten() if results.pose_landmarks else np.zeros(33*4)
        lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(21*3)
        rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(21*3)
        return np.concatenate([pose, lh, rh])
    def BBox(self,image,results):
        xList,yList,bbox = [],[],[]
        if results.pose_landmarks:
            for id,land in enumerate(results.pose_landmarks.landmark):
                h,w,c = image.shape # high,weight,chanel with img
                cx = int(land.x *w)
                cy = int(land.y *h)
                xList.append(cx)
                yList.append(cy)
            xmin,xmax = min(xList),max(xList)
            ymin,ymax = min(yList),max(yList)
            bbox = xmin,ymin,xmax,ymax
        return bbox

