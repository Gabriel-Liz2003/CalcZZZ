# Limitações reais

1. **Cobertura de dados do jogo**: somente o recorte auditado da Dialyn está marcado como dado real verificado nesta revisão. O motor suporta Mindscapes, W-Engines e Drive Discs, mas os exemplos adicionais são fixtures matemáticas.
2. **Anomaly coefficients**: buildup/contribuição/Disorder funcionam, mas os presets de coeficiente ficam `verified:false` até revalidação externa.
3. **Arredondamento interno do jogo**: não foi confirmada nesta etapa uma política de arredondamento intermediário; o motor mantém precisão dupla e arredonda na UI.
4. **Validação in-game**: não foi possível executar o jogo neste ambiente. A validação automatizada cobre identidades e regressões matemáticas, não captura de dano in-game.
5. **Web**: consultas externas retornaram indisponibilidade durante esta execução; por isso a expansão massiva do banco foi bloqueada pela regra de não inventar números.
