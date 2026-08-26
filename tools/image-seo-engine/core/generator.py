import torch
from PIL import Image
from diffusers import AutoPipelineForText2Image
from config.settings import DEFAULT_MODEL, HF_CACHE_DIR, DEFAULT_STEPS, IMAGE_WIDTH, IMAGE_HEIGHT

_pipeline = None

def get_pipeline():
    global _pipeline
    if _pipeline is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32

        print(f"🚀 [Image SEO Engine] Loading model '{DEFAULT_MODEL}' on device '{device}'...")
        try:
            _pipeline = AutoPipelineForText2Image.from_pretrained(
                DEFAULT_MODEL,
                torch_dtype=dtype,
                cache_dir=HF_CACHE_DIR
            ).to(device)
            print("✅ [Image SEO Engine] Pipeline loaded successfully!")
        except Exception as e:
            print(f"⚠️ Model load failed ({e}). Falling back to dummy generator mode for lightweight testing.")
            _pipeline = "dummy"

    return _pipeline

def generate_image_from_prompt(prompt: str, steps: int = DEFAULT_STEPS) -> Image.Image:
    pipe = get_pipeline()

    # Enforce photorealistic 8K photography style with NO text/watermark graphics
    photo_prompt = f"Award-winning professional photography of {prompt}, 8k resolution, photorealistic, natural lighting, sharp focus, 35mm lens, cinematic depth of field, highly detailed, no text, no watermark, no typography"

    if pipe == "dummy" or pipe is None:
        # Fallback dummy PIL image for CPU/test mode without GPU weights
        img = Image.new("RGB", (IMAGE_WIDTH, IMAGE_HEIGHT), color=(73, 109, 137))
        return img

    image = pipe(
        prompt=photo_prompt,
        num_inference_steps=steps,
        guidance_scale=0.0, # 0.0 for FLUX schnell
        width=IMAGE_WIDTH,
        height=IMAGE_HEIGHT
    ).images[0]

    return image
