<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rules
- Client photos are stored as resized JPEG data URLs in `configuracoes` under the key `foto_cliente:<cliente_id>` (see `src/lib/foto-cliente.ts`). Why: no schema/storage migration tooling was available when the feature was added; move to a storage bucket + column when possible.
