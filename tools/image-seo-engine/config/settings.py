import os

# Default Storage Directory (Supports F:\ drive or custom env path)
OUTPUT_DIR = os.getenv("IMAGE_BANK_DIR", "F:\\ai_image_bank" if os.path.exists("F:\\") else "./ai_image_bank")

# HuggingFace Cache Directory (Supports F:\ drive to save C:\ space)
HF_CACHE_DIR = os.getenv("HF_HOME", "F:\\huggingface_cache" if os.path.exists("F:\\") else "./huggingface_cache")

# Default Model & Performance Configurations
DEFAULT_MODEL = os.getenv("MODEL_NAME", "black-forest-labs/FLUX.1-schnell")
WEBP_QUALITY = 85
DEFAULT_STEPS = 4
IMAGE_WIDTH = 1024
IMAGE_HEIGHT = 1024

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(HF_CACHE_DIR, exist_ok=True)
