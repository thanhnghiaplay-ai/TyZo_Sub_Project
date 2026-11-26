import { useEffect, useState } from "react";
import { getModalPrice, saveModalPrice } from "@/lib/tyzo-modal-settings";
import type { ModalPrice } from "@/lib/sub/tyzo-modal-price";

export function TyzoModalPriceBoard() {
  const [mode, setMode] = useState<ModalPrice["mode"]>("fixed");
  const [nhanh, setNhanh] = useState("");
  const [ky, setKy] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    getModalPrice().then(price => {
      if (!active) return;
      if (price) {
        setMode(price.mode);
        setNhanh(String(price.nhanh));
        setKy(String(price.ky));
      }
      setReady(true);
    }).catch(error => { if (active) setMessage(String(error)); });
    return () => { active = false; };
  }, []);
  const unit = mode === "fixed" ? "USD/giờ phim" : "USD/giờ xử lý";
  return <form className="grid gap-2 p-3" onSubmit={async event => {
    event.preventDefault();
    setReady(false);
    try {
      await saveModalPrice({ data: { mode, nhanh: Number(nhanh), ky: Number(ky) } });
      setMessage("Đã lưu giá TyZo Modal.");
    } catch (error) { setMessage(String(error)); }
    finally { setReady(true); }
  }}>
    <h3>Giá TyZo Modal</h3>
    <fieldset disabled={!ready} className="grid gap-2">
      <label>Cách tính <select value={mode} onChange={e => {
        setMode(e.target.value as ModalPrice["mode"]); setNhanh(""); setKy(""); setMessage("");
      }}>
        <option value="fixed">Theo thời lượng phim</option>
        <option value="usage">Theo thời gian xử lý và phí mô hình chữ</option>
      </select></label>
      <label>Nhanh ({unit}) <input required type="number" min="0" step="any" value={nhanh} onChange={e => setNhanh(e.target.value)} /></label>
      <label>Kỹ ({unit}) <input required type="number" min="0" step="any" value={ky} onChange={e => setKy(e.target.value)} /></label>
      <button type="submit">Lưu giá</button>
    </fieldset>
    <p role="status">{message}</p>
  </form>;
}
