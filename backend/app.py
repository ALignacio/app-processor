from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import json
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
async def process_image(file: UploadFile = File(...), operations: str = Form(...)):
    print(f"Processing image with operations: {operations}")
    contents = await file.read()
    npimg = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    if img is None:
        return JSONResponse(content={"error": "Invalid image"}, status_code=400)
    
    processed = img.copy()
    op_list = json.loads(operations)

    for op in op_list:
        operation = op.get("name")
        value = op.get("value")

        # Ensure image is BGR for color operations
        if operation in ["lighten", "darken", "hueshift"] and len(processed.shape) == 2:
            processed = cv2.cvtColor(processed, cv2.COLOR_GRAY2BGR)

        # Ensure image is grayscale for certain operations
        if operation in ["threshold", "edge_detection"] and len(processed.shape) == 3:
            processed = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)

        if operation == "grayscale":
            if len(processed.shape) == 3: # only if it's not already grayscale
                processed = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)
        elif operation == "blur":
            if len(processed.shape) == 2:
                processed = cv2.cvtColor(processed, cv2.COLOR_GRAY2BGR)
            blur_value = int(value) if value is not None else 15
            if blur_value <= 0:
                blur_value = 15
            if blur_value % 2 == 0:
                blur_value += 1
            processed = cv2.GaussianBlur(processed, (blur_value, blur_value), 0)
        elif operation == "edge_detection":
            processed = cv2.Canny(processed, 100, 200)
        elif operation == "threshold":
            _, processed = cv2.threshold(processed, 127, 255, cv2.THRESH_BINARY)
        elif operation == "resize":
            if value and 'width' in value and 'height' in value:
                width = int(value['width'])
                height = int(value['height'])
                if width > 0 and height > 0:
                    processed = cv2.resize(processed, (width, height))
        elif operation == "rotate":
            (h, w) = processed.shape[:2]
            angle = float(value) if value is not None else 90
            M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
            processed = cv2.warpAffine(processed, M, (w, h))
        elif operation == "flip":
            if value == 'vertical':
                processed = cv2.flip(processed, 0)
            else: # default to horizontal
                processed = cv2.flip(processed, 1)
        elif operation == "lighten":
            value = int(value) if value is not None else 50
            hsv = cv2.cvtColor(processed, cv2.COLOR_BGR2HSV)
            h, s, v = cv2.split(hsv)
            v = cv2.add(v, value)
            final_hsv = cv2.merge((h, s, v))
            processed = cv2.cvtColor(final_hsv, cv2.COLOR_HSV2BGR)
        elif operation == "darken":
            value = int(value) if value is not None else 50
            hsv = cv2.cvtColor(processed, cv2.COLOR_BGR2HSV)
            h, s, v = cv2.split(hsv)
            v = cv2.subtract(v, value)
            final_hsv = cv2.merge((h, s, v))
            processed = cv2.cvtColor(final_hsv, cv2.COLOR_HSV2BGR)
        elif operation == "hueshift":
            if value:
                hsv = cv2.cvtColor(processed, cv2.COLOR_BGR2HSV)
                # Frontend sends 0-360, OpenCV is 0-179
                hue_shift = int(int(value) / 2)
                hsv[:, :, 0] = (hsv[:, :, 0] + hue_shift) % 180
                processed = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        elif operation != "original":
            return JSONResponse(content={"error": f"Unknown operation: {operation}"}, status_code=400)

    original_base64 = cv2_to_base64(img)
    processed_base64 = cv2_to_base64(processed)

    return {"original_image": original_base64, "processed_image": processed_base64}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
