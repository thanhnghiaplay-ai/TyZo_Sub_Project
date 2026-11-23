"""DeepFilterNet 3 khử ồn (vá import torchaudio.backend đã bị bỏ ở torchaudio mới)."""
import sys, types
m = types.ModuleType("torchaudio.backend"); c = types.ModuleType("torchaudio.backend.common")
class AudioMetaData: pass
c.AudioMetaData = AudioMetaData; m.common = c
sys.modules["torchaudio.backend"] = m; sys.modules["torchaudio.backend.common"] = c
import numpy as np, torch
from scipy import signal as S
from df.enhance import init_df, enhance
_M = None
def denoise(x, sr=16000, atten_db=None):
    global _M
    if _M is None:
        from safetensors.torch import load_file
        _M = init_df("pretrained/DFN3", log_level="ERROR")
        sd = load_file("pretrained/DFN3/model.safetensors")
        miss = _M[0].load_state_dict(sd, strict=False)
        assert not miss.missing_keys, miss.missing_keys[:5]
        _M[0].eval()
    model, st, _ = _M
    y = S.resample_poly(x, 3, 1).astype(np.float32)  # 16k -> 48k
    out = enhance(model, st, torch.from_numpy(y)[None], atten_lim_db=atten_db)
    return S.resample_poly(out[0].numpy(), 1, 3)[:len(x)]
