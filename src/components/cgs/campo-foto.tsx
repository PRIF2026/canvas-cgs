import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";
import { FOTO_ALTURA, FOTO_LARGURA, prepararFoto } from "@/lib/foto-cliente";
import { Button } from "@/components/ui/button";

export function FotoCliente({ src, className = "" }: { src?: string | null; className?: string }) {
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground ${className}`}
      style={{ width: FOTO_LARGURA, height: FOTO_ALTURA }}
    >
      {src ? (
        <img src={src} alt="Foto do cliente" width={FOTO_LARGURA} height={FOTO_ALTURA} className="h-full w-full object-cover" />
      ) : (
        <Camera className="h-8 w-8" />
      )}
    </div>
  );
}

export function CampoFoto({ valor, onChange }: { valor: string | null; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="block text-xs text-muted-foreground">
      Foto ({FOTO_LARGURA} x {FOTO_ALTURA} px)
      <div className="mt-1 flex items-end gap-3">
        <FotoCliente src={valor} />
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
            <Camera className="h-4 w-4" /> {valor ? "Trocar foto" : "Escolher foto"}
          </Button>
          {valor ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <X className="h-4 w-4" /> Remover
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            onChange(await prepararFoto(file));
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Não foi possível usar esta imagem.");
          }
        }}
      />
    </div>
  );
}
