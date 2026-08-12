/**
 * Trava específica para `prisma migrate reset --force` na esteira
 * (`.github/workflows/ci.yml`).
 *
 * `tests/guarda-de-banco.ts` aprova desenvolvimento OU teste — correto para
 * `npm test`, que só aplica migration e semeia/apaga linha. `migrate reset`
 * derruba o schema inteiro; um secret do GitHub apontado para o projeto de
 * desenvolvimento por engano apagaria o banco de quem programa, não só
 * aplicaria migration de novo. Por isso esta trava recusa também
 * desenvolvimento — só o projeto de teste passa.
 *
 * Roda como script avulso, igual a `guarda-de-banco.ts`, ANTES do passo de
 * reset — nunca depois.
 */

import { validarSoTeste } from "./guarda-de-banco.ts";

validarSoTeste(process.env);
