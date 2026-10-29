"""
faiss_compat.py — Transparent FAISS fallback for Python 3.14 / systems without binary FAISS wheels.
"""
import os
import numpy as np

class _NumpyVectorVault:
    def __init__(self, d):
        self.d = d
        self.vectors = []

    @property
    def ntotal(self):
        return len(self.vectors)

    def add(self, x):
        arr = np.array(x, dtype=np.float32)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)
        self.vectors.extend(arr)

    def search(self, x, k):
        if not self.vectors:
            return np.array([[-1.0] * k], dtype=np.float32), np.array([[-1] * k], dtype=np.int64)
        v = np.array(self.vectors, dtype=np.float32)
        if x.ndim == 1:
            x = x.reshape(1, -1)
        sims = np.dot(x, v.T)
        actual_k = min(k, len(self.vectors))
        idx = np.argsort(-sims, axis=1)[:, :actual_k]
        distances = np.take_along_axis(sims, idx, axis=1)
        return distances, idx

try:
    import faiss
except ImportError:
    class _FaissFallbackModule:
        IndexFlatIP = _NumpyVectorVault

        @staticmethod
        def normalize_L2(x):
            norm = np.linalg.norm(x, axis=-1, keepdims=True)
            norm[norm == 0] = 1.0
            x /= norm

        @staticmethod
        def write_index(vault, path):
            if path.endswith(".tmp"):
                companion_tmp = path + ".npy"
                companion_dest = path[:-4] + ".npy"
                if hasattr(vault, "vectors"):
                    np.save(companion_tmp, np.array(vault.vectors, dtype=np.float32))
                    try:
                        os.replace(companion_tmp, companion_dest)
                    except Exception:
                        pass
            else:
                if hasattr(vault, "vectors"):
                    np.save(path + ".npy", np.array(vault.vectors, dtype=np.float32))

            with open(path, "w", encoding="utf-8") as f:
                f.write("NUMPY_VAULT\n")

        @staticmethod
        def read_index(path):
            npy_path = path + ".npy" if not path.endswith(".npy") else path
            if os.path.exists(npy_path):
                try:
                    arr = np.load(npy_path)
                    d = arr.shape[1] if arr.ndim > 1 else 512
                    vault = _NumpyVectorVault(d)
                    vault.vectors = list(arr)
                    return vault
                except Exception:
                    pass
            return _NumpyVectorVault(512)

    faiss = _FaissFallbackModule()
