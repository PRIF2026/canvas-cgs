import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const FOTO_LARGURA = 168;
export const FOTO_ALTURA = 238;
const PREFIXO = "foto_cliente:";

export const fotosKey = ["cgs", "fotos-clientes"] as const;

/** Recorta (cover) e redimensiona a imagem para exatamente 168 x 238 px, retornando um JPEG em data URL. */
export async function prepararFoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Selecione um arquivo de imagem.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      i.src = url;
    });
    const alvo = FOTO_LARGURA / FOTO_ALTURA;
    const origem = img.naturalWidth / img.naturalHeight;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    if (origem > alvo) sw = sh * alvo;
    else sh = sw / alvo;
    const sx = (img.naturalWidth - sw) / 2;
    const sy = (img.naturalHeight - sh) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = FOTO_LARGURA;
    canvas.height = FOTO_ALTURA;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar a imagem.");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, FOTO_LARGURA, FOTO_ALTURA);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function salvarFoto(clienteId: string, dataUrl: string) {
  const { error } = await supabase
    .from("configuracoes")
    .upsert({ chave: `${PREFIXO}${clienteId}`, valor: dataUrl }, { onConflict: "chave" });
  if (error) throw new Error(error.message);
}

export function useFotosClientes() {
  return useQuery({
    queryKey: fotosKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("chave, valor")
        .like("chave", `${PREFIXO}%`);
      if (error) throw new Error(error.message);
      const mapa: Record<string, string> = {};
      for (const r of data ?? []) mapa[r.chave.slice(PREFIXO.length)] = r.valor;
      return mapa;
    },
  });
}
