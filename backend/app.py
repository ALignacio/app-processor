from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import base64

app = FastAPI()

# Allow Electron frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Convert OpenCV image to Base64
def cv2_to_base64(img):
    _, buffer = cv2.imencode(".png", img)
    return base64.b64encode(buffer).decode("utf-8")

@app.post("/process")
async def process_image(file: UploadFile = File(...), operation: str = Form(...)):
    contents = await file.read()
    npimg = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    if img is None:
        return JSONResponse(content={"error": "Invalid image"}, status_code=400)

    # Image operations
    if operation == "original":
        processed = img.copy()
    elif operation == "grayscale":
        processed = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    elif operation == "blur":
        processed = cv2.GaussianBlur(img, (15, 15), 0)
    elif operation == "edge":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        processed = cv2.Canny(gray, 100, 200)
    elif operation == "threshold":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, processed = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
    elif operation == "resize":
        processed = cv2.resize(img, (200, 200))
    elif operation == "rotate":
        (h, w) = img.shape[:2]
        M = cv2.getRotationMatrix2D((w // 2, h // 2), 45, 1.0)
        processed = cv2.warpAffine(img, M, (w, h))
    elif operation == "flip":
        processed = cv2.flip(img, 1)
    elif operation == "lighten":
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        hsv[:, :, 2] = cv2.convertScaleAbs(hsv[:, :, 2], alpha=1.2, beta=50)
        processed = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    elif operation == "darken":
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        hsv[:, :, 2] = cv2.convertScaleAbs(hsv[:, :, 2], alpha=0.8, beta=-30)
        processed = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    elif operation == "hue":
        # Ensure 3 channels before converting
        if len(img.shape) == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        hsv[:, :, 0] = (hsv[:, :, 0] + 30) % 180  # auto hue shift
        processed = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    else:
        return JSONResponse(content={"error": "Unknown operation"}, status_code=400)

    original_base64 = cv2_to_base64(img)
    processed_base64 = cv2_to_base64(processed)

    return {"original_image": original_base64, "processed_image": processed_base64}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
