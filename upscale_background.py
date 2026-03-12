import cv2
import numpy as np
import os
from PIL import Image, ImageEnhance

def upscale_image(input_path, output_path, scale_factor=2):
    """
    Upscales an image using Lanczos4 interpolation and applies 
    Unsharp Masking and Denoising to improve clarity.
    """
    print(f"Starting upscale process for: {input_path}")
    
    # 1. Load image using OpenCV
    img = cv2.imread(input_path)
    if img is None:
        print(f"Error: Could not load image from {input_path}. Check if the file exists and is a valid image.")
        return

    # 2. traditional Upscaling (Lanczos4 is excellent for photographic quality)
    width = int(img.shape[1] * scale_factor)
    height = int(img.shape[0] * scale_factor)
    dim = (width, height)
    
    print(f"Resizing from {img.shape[1]}x{img.shape[0]} to {width}x{height}...")
    upscaled = cv2.resize(img, dim, interpolation=cv2.INTER_LANCZOS4)

    # 3. Denoising (Removes potential artifacts introduced by scaling)
    print("Applying denoising...")
    denoised = cv2.fastNlMeansDenoisingColored(upscaled, None, 10, 10, 7, 21)

    # 4. Sharpening (Unsharp Masking technique)
    # Using Gaussian Blur to create a mask for sharpening
    print("Sharpening and enhancing clarity...")
    gaussian_blur = cv2.GaussianBlur(denoised, (0, 0), 2.0)
    sharpened = cv2.addWeighted(denoised, 1.5, gaussian_blur, -0.5, 0)

    # 5. Final Polish with Pillow (Contrast and extra Details)
    # Convert BGR (OpenCV) to RGB (Standard)
    color_converted = cv2.cvtColor(sharpened, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(color_converted)
    
    # Enhance Sharpness slightly more
    enhancer = ImageEnhance.Sharpness(pil_img)
    pil_img = enhancer.enhance(1.1)
    
    # Enhance Contrast to make it "pop"
    enhancer = ImageEnhance.Contrast(pil_img)
    pil_img = enhancer.enhance(1.05)

    # 6. Save result
    pil_img.save(output_path, "JPEG", quality=95, optimize=True, subsampling=0)
    print(f"\n[DONE] High-clarity upscaled image saved to: {output_path}")

if __name__ == "__main__":
    # CONFIGURATION
    INPUT_FILE = "/Users/amar/Davinci-enterprise/Da-vinci/public/main_background2.jpeg"
    OUTPUT_FILE = "/Users/amar/Davinci-enterprise/Da-vinci/public/main_background2_up.jpeg"
    SCALE = 2 # Change to 3 or 4 for higher resolution
    
    if os.path.exists(INPUT_FILE):
        upscale_image(INPUT_FILE, OUTPUT_FILE, SCALE)
    else:
        print(f"Error: Input file NOT FOUND at {INPUT_FILE}")
        print("Please verify the path and try again.")
