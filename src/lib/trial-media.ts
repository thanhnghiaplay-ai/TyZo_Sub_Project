export function readMediaSeconds(file: File) {
  return new Promise<number>((resolve, reject) => {
    const el = document.createElement(file.type.startsWith("audio/") ? "audio" : "video");
    const url = URL.createObjectURL(file);
    const done = (error?: Error) => {
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      if (error) reject(error);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const seconds = el.duration;
      done();
      resolve(seconds);
    };
    el.onerror = () => {
      done(new Error("Không đọc được thời lượng tệp."));
    };
    el.src = url;
  });
}
