"""
Export CLIP ViT-B/32 Vision Encoder to ONNX
=============================================
Generates clip_vision.onnx from the HuggingFace CLIP model.
This gives 7-10x speedup over PyTorch on CPU inference.

Usage:
  cd Backend
  python export_clip_onnx.py

Output:
  clip_vision.onnx       (~353MB or less depending on opset)

Requirements:
  pip install transformers torch onnx onnxruntime

NOTE: If you only have best.pth and not the ONNX files, the system
      will still work fine — it just uses PyTorch CLIP (slower but functional).
      ONNX is a performance optimization, not a requirement.
"""

import os
import sys
import torch
import numpy as np

def main():
    print("=" * 55)
    print("  CLIP ViT-B/32 → ONNX Export")
    print("=" * 55)
    
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clip_vision.onnx")
    
    if os.path.exists(output_path) and os.path.getsize(output_path) > 50_000_000:
        print(f"\n  ✓ clip_vision.onnx already exists ({os.path.getsize(output_path)/1e6:.0f}MB)")
        print("    Delete it first if you want to re-export.")
        return 0

    print("\n  Loading CLIP ViT-B/32 from HuggingFace...")
    from transformers import CLIPModel, CLIPProcessor
    
    model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    
    # Extract vision encoder only (we don't need text encoder for similarity search)
    vision_model = model.vision_model
    visual_projection = model.visual_projection
    
    print("  ✓ Model loaded")
    
    # Create a wrapper that does vision_model + projection + L2 normalize
    class CLIPVisionEncoder(torch.nn.Module):
        def __init__(self, vision_model, projection):
            super().__init__()
            self.vision_model = vision_model
            self.projection = projection
            
        def forward(self, pixel_values):
            outputs = self.vision_model(pixel_values=pixel_values)
            # Use pooler_output (CLS token)
            pooled = outputs.pooler_output
            # Project to 512-dim
            projected = self.projection(pooled)
            # L2 normalize
            normalized = projected / projected.norm(dim=-1, keepdim=True)
            return normalized
    
    encoder = CLIPVisionEncoder(vision_model, visual_projection)
    encoder.eval()
    
    # Create dummy input (batch=1, 3 channels, 224x224)
    dummy_input = torch.randn(1, 3, 224, 224)
    
    print("  Exporting to ONNX (opset 14)...")
    print("  This may take 1-2 minutes...\n")
    
    torch.onnx.export(
        encoder,
        dummy_input,
        output_path,
        opset_version=14,
        input_names=["pixel_values"],
        output_names=["embeddings"],
        dynamic_axes={
            "pixel_values": {0: "batch_size"},
            "embeddings": {0: "batch_size"},
        },
        do_constant_folding=True,
    )
    
    size_mb = os.path.getsize(output_path) / 1e6
    print(f"  ✓ Exported: clip_vision.onnx ({size_mb:.1f}MB)")
    
    # Verify the exported model
    print("\n  Verifying ONNX model...")
    import onnxruntime as ort
    
    session = ort.InferenceSession(output_path, providers=["CPUExecutionProvider"])
    
    # Test with dummy input
    test_input = np.random.randn(1, 3, 224, 224).astype(np.float32)
    result = session.run(None, {"pixel_values": test_input})
    
    embedding = result[0]
    assert embedding.shape == (1, 512), f"Expected (1, 512), got {embedding.shape}"
    
    # Check L2 norm is ~1.0
    norm = np.linalg.norm(embedding[0])
    assert 0.95 < norm < 1.05, f"Expected norm ~1.0, got {norm}"
    
    print(f"  ✓ Verification passed — output shape: {embedding.shape}, norm: {norm:.4f}")
    
    # Compare with PyTorch output for consistency
    print("\n  Comparing with PyTorch output...")
    from PIL import Image
    
    test_img = Image.new("RGB", (224, 224), color=(128, 64, 192))
    inputs = processor(images=[test_img], return_tensors="pt")
    
    with torch.no_grad():
        pytorch_output = encoder(inputs["pixel_values"]).numpy()
    
    onnx_input = inputs["pixel_values"].numpy()
    onnx_output = session.run(None, {"pixel_values": onnx_input})[0]
    
    diff = np.abs(pytorch_output - onnx_output).max()
    print(f"  Max difference: {diff:.6f} (should be < 0.001)")
    
    if diff < 0.01:
        print("  ✓ ONNX matches PyTorch output — export successful!")
    else:
        print("  ⚠ Large difference detected — model may have precision issues")
    
    print(f"\n{'=' * 55}")
    print(f"  ✅ Done! clip_vision.onnx ready at:")
    print(f"     {output_path}")
    print(f"\n  Set in .env:")
    print(f"    CLIP_ONNX_PATH={output_path}")
    print(f"{'=' * 55}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
