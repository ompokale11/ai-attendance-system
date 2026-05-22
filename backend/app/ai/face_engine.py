import os
import cv2
import numpy as np
import urllib.request
import json
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class FaceEngine:
    def __init__(self):
        self.models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        os.makedirs(self.models_dir, exist_ok=True)
        
        self.yunet_path = os.path.join(self.models_dir, "face_detection_yunet_2023mar.onnx")
        self.sface_path = os.path.join(self.models_dir, "face_recognition_sface_2021dec.onnx")
        self.embeddings_path = os.path.join(settings.DATASET_DIR, "embeddings.json")
        
        self.detector = None
        self.recognizer = None
        self.use_fallback = False
        
        # Try to download and initialize models
        self.initialize_models()
        self.load_registered_embeddings()

    def initialize_models(self):
        try:
            # URLs for YuNet and SFace
            yunet_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
            sface_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
            
            # Download YuNet if missing
            if not os.path.exists(self.yunet_path):
                logger.info("Downloading YuNet face detection model...")
                urllib.request.urlretrieve(yunet_url, self.yunet_path)
                
            # Download SFace if missing
            if not os.path.exists(self.sface_path):
                logger.info("Downloading SFace face recognition model...")
                urllib.request.urlretrieve(sface_url, self.sface_path)
                
            # Initialize OpenCV YuNet & SFace
            # Note: We need dummy input size to instantiate YuNet, it will be updated per image
            self.detector = cv2.FaceDetectorYN.create(
                model=self.yunet_path,
                config="",
                input_size=(320, 320),
                score_threshold=0.6,
                nms_threshold=0.3,
                top_k=5000
            )
            self.recognizer = cv2.FaceRecognizerSF.create(
                model=self.sface_path,
                config=""
            )
            logger.info("Successfully initialized YuNet and SFace models.")
        except Exception as e:
            logger.warning(f"Failed to load ONNX face models: {e}. Falling back to Haar Cascade + Pixel Matching.")
            self.use_fallback = True
            # Fallback face detector using Haar Cascade
            self.cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            self.detector = cv2.CascadeClassifier(self.cascade_path)

    def load_registered_embeddings(self):
        self.registered_faces = {}
        if os.path.exists(self.embeddings_path):
            try:
                with open(self.embeddings_path, "r") as f:
                    self.registered_faces = json.load(f)
                logger.info(f"Loaded {len(self.registered_faces)} registered student faces.")
            except Exception as e:
                logger.error(f"Error loading embeddings: {e}")
                self.registered_faces = {}

    def save_registered_embeddings(self):
        try:
            with open(self.embeddings_path, "w") as f:
                json.dump(self.registered_faces, f)
            logger.info("Saved registered embeddings to disk.")
        except Exception as e:
            logger.error(f"Error saving embeddings: {e}")

    def detect_faces(self, image_np):
        """
        Detects faces in an image.
        Returns: list of dicts with 'box' [x, y, w, h], 'raw_detect' (for SFace alignment), and 'confidence'
        """
        h, w = image_np.shape[:2]
        
        if not self.use_fallback:
            try:
                # Update detector input size
                self.detector.setInputSize((w, h))
                _, faces = self.detector.detect(image_np)
                
                results = []
                if faces is not None:
                    for face in faces:
                        # face coordinates: [x, y, w, h, eye_r_x, eye_r_y, ...]
                        box = [int(face[0]), int(face[1]), int(face[2]), int(face[3])]
                        conf = float(face[14])
                        results.append({
                            "box": box,
                            "raw_detect": face,
                            "confidence": conf
                        })
                return results
            except Exception as e:
                logger.error(f"YuNet detection failed: {e}. Trying fallback.")
                
        # Fallback using Haar Cascade
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
        faces = self.detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        results = []
        for (x, y, w, h) in faces:
            results.append({
                "box": [int(x), int(y), int(w), int(h)],
                "raw_detect": None,
                "confidence": 1.0
            })
        return results

    def get_face_embedding(self, image_np, face_detect_info):
        """
        Extracts a feature vector for a face.
        """
        if not self.use_fallback and face_detect_info["raw_detect"] is not None:
            try:
                # Align and crop the face using SFace alignment logic
                aligned_face = self.recognizer.alignCrop(image_np, face_detect_info["raw_detect"])
                # Extract 128-dimensional embedding
                feature = self.recognizer.feature(aligned_face)
                # Feature is a 1x128 float array, normalize it
                embedding = feature[0] / np.linalg.norm(feature[0])
                return embedding.tolist()
            except Exception as e:
                logger.error(f"SFace embedding extraction failed: {e}. Trying fallback.")

        # Fallback embedding: Crop face, convert to grayscale, downsample, and normalize
        box = face_detect_info["box"]
        x, y, w_box, h_box = box
        # Clamp to image boundaries
        img_h, img_w = image_np.shape[:2]
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(img_w, x + w_box), min(img_h, y + h_box)
        
        if x2 <= x1 or y2 <= y1:
            return None
            
        face_crop = image_np[y1:y2, x1:x2]
        face_gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        # Downsample to 32x32 to get a 1024-dimensional simple feature vector
        resized = cv2.resize(face_gray, (32, 32), interpolation=cv2.INTER_AREA)
        # Flatten and normalize
        feature = resized.flatten().astype(float)
        feature = feature / np.linalg.norm(feature)
        return feature.tolist()

    def train_student(self, student_id, student_name, images_dir):
        """
        Processes all images in a student's dataset directory, extracts face embeddings,
        averages them, and registers the student.
        """
        if not os.path.exists(images_dir):
            logger.warning(f"Directory {images_dir} does not exist.")
            return False
            
        embeddings = []
        for filename in os.listdir(images_dir):
            if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            
            image_path = os.path.join(images_dir, filename)
            img = cv2.imread(image_path)
            if img is None:
                continue
                
            faces = self.detect_faces(img)
            if not faces:
                continue
                
            # Take the largest face in the photo
            largest_face = max(faces, key=lambda f: f["box"][2] * f["box"][3])
            emb = self.get_face_embedding(img, largest_face)
            if emb is not None:
                embeddings.append(emb)
                
        if not embeddings:
            logger.warning(f"No faces found in dataset for student {student_id}")
            return False
            
        # Calculate mean embedding
        mean_embedding = np.mean(embeddings, axis=0)
        # Re-normalize
        mean_embedding = mean_embedding / np.linalg.norm(mean_embedding)
        
        self.registered_faces[student_id] = {
            "name": student_name,
            "embedding": mean_embedding.tolist()
        }
        self.save_registered_embeddings()
        return True

    def recognize_faces_in_frame(self, frame):
        """
        Analyzes a single frame from the camera feed.
        Returns: list of dicts with 'box' and 'name' ('Unknown' if not matched)
        """
        faces = self.detect_faces(frame)
        results = []
        
        for face in faces:
            box = face["box"]
            emb = self.get_face_embedding(frame, face)
            
            best_match = "Unknown"
            best_score = -1.0
            
            if emb is not None and self.registered_faces:
                # Compare embedding with all registered faces
                for student_id, data in self.registered_faces.items():
                    reg_emb = np.array(data["embedding"])
                    curr_emb = np.array(emb)
                    
                    # Compute cosine similarity
                    similarity = np.dot(reg_emb, curr_emb)
                    
                    if similarity > best_score:
                        best_score = similarity
                        best_match = student_id
            
            # Set similarity thresholds: SFace cosine similarity range is roughly -1 to 1.
            # A good match threshold for SFace is around 0.36 - 0.40.
            # For fallback (raw pixel template), we want a much higher threshold because it's normalized, e.g. 0.70.
            threshold = 0.70 if self.use_fallback else 0.38
            
            matched_student_id = "Unknown"
            matched_name = "Unknown"
            confidence = 0.0
            
            if best_score >= threshold:
                matched_student_id = best_match
                matched_name = self.registered_faces[best_match]["name"]
                confidence = float(best_score)
                
            results.append({
                "box": box,
                "student_id": matched_student_id,
                "name": matched_name,
                "confidence": confidence
            })
            
        return results

# Singleton instance
face_engine = FaceEngine()
