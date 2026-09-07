from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
from PIL import Image
import numpy as np
import io
import os

# บังคับใช้ CPU และจำกัดเธรดเพื่อประหยัดแรมบน Render
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

# ตั้งค่าให้ TensorFlow ค่อยๆ จองแรม ไม่ให้กินโควตารวดเดียวหมด
gpus = tf.config.list_physical_devices('GPU')
if not gpus:
    try:
        # เปิดใช้งาน memory growth สำหรับ CPU/RAM ทั่วไป
        tf.config.set.set_soft_device_placement(True)
    except Exception as e:
        print(e)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("กำลังโหลดโมเดล 7 Classes ตอนเริ่มต้นระบบ...")
model = load_model("skin_efficientnetv2_7classes_best.keras")
print("✅ โหลดโมเดลสำเร็จและพร้อมใช้งานแล้ว!")

# ชื่อคลาส 7 อย่างตามโมเดลของคุณ
CLASSES = [
    'Pigmentation & Dark spots',
    'Redness',
    'Inflammatory acne',
    'Blackheads',
    'Whiteheads',
    'Pores',
    'Wrinkles'
]
THRESHOLD = 0.20 # 20%

def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((384, 384)) 
    img_array = np.array(img, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

@app.post("/predict")
async def predict_acne(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        processed_image = preprocess_image(contents)
        
        # ใช้โมเดลที่โหลดรอไว้แล้วในแรม
        predictions = model.predict(processed_image)[0]
        
        all_scores = []
        detected_issues = []
        
        for i, pred in enumerate(predictions):
            score = float(pred)
            item = {"class_name": CLASSES[i], "probability": score}
            all_scores.append(item)
            
            if score >= THRESHOLD:
                detected_issues.append(item)
        
        return {
            "status": "success",
            "detected_count": len(detected_issues),
            "all_scores": all_scores,
            "message": "🔍 พบปัญหาผิวที่ต้องดูแล" if len(detected_issues) > 0 else "✨ ผิวสุขภาพดี ไม่พบปัญหาหลัก"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}