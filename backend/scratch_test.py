import cv2
import os
import sys
import numpy as np

# Adjust path to import backend
sys.path.append(r"C:\AI Attendance System\backend")

from app.ai.face_engine import face_engine
from app.core.config import settings

print("Initializing face engine...")
print("Detector:", face_engine.detector)
print("Recognizer:", face_engine.recognizer)
print("Use fallback:", face_engine.use_fallback)
print("Registered faces:", len(face_engine.registered_faces))
print("Models dir files:", os.listdir(face_engine.models_dir))

# Create a dummy image with a square representing a face or just check if detect_faces works without errors
img = np.zeros((480, 640, 3), dtype=np.uint8)
cv2.rectangle(img, (200, 150), (400, 350), (255, 255, 255), -1) # Draw white box

print("Running detect_faces on dummy image...")
try:
    faces = face_engine.detect_faces(img)
    print("Detected faces:", faces)
except Exception as e:
    print("Error during detect_faces:", e)
