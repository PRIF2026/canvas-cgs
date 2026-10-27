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
- The Cartela Digital app reads a customer's cartela (including the photo as `foto`) from `POST /api/public/cartela` with phone + CPF; the response shape must stay compatible with Cartela Digital's `cgsCartelaSchema`. Why: CGS is the single source of customer identity for that app.
- `/api/public/cartela` reads data with the service role key when present, otherwise signs in with the CGS integration account (`CGS_INTEGRACAO_EMAIL` / `CGS_INTEGRACAO_SENHA` secrets). Why: the shared database only lets signed-in users read clients.
