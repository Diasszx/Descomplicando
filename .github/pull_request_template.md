## Descrição da Mudança

<!-- Resumo claro do que foi implementado, corrigido ou refatorado -->

## Checklist de Conformidade com a Constituição do Projeto Fono

- [ ] **Contratos compartilhados**: Nenhuma duplicação de tipos ou contratos. Novos schemas foram definidos em `packages/shared`.
- [ ] **TypeScript Zero-Any**: Código 100% tipado estritamente, sem uso de `any`.
- [ ] **Segurança e Menor Privilégio**:
  - [ ] Nenhuma credencial ou token gravado em código ou commit.
  - [ ] Permissões validadas no backend a partir do token e banco de dados (não confia no frontend).
  - [ ] Consultas parametrizadas no Prisma (proibido `$queryRawUnsafe`).
  - [ ] Nenhuma migration destrutiva sem label `allow-destructive-migration` aprovada.
- [ ] **Frontend e Mobile**:
  - [ ] Chamadas de API encapsuladas em hooks do TanStack Query (sem fetch/axios direto em componentes).
  - [ ] Tratamento explícito de estados: Loading, Error e Empty State.
  - [ ] Conformidade de acessibilidade (WAI-ARIA / Mobile accessibility labels).
- [ ] **Testes e CI**:
  - [ ] Testes unitários ou de integração adicionados/atualizados.
  - [ ] Pipeline de CI passando integralmente (`lint`, `typecheck`, `test`, `build`).
