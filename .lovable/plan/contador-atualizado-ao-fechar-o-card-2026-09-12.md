# Contador atualizado ao fechar o card

## Alterações
- Manter o número visível congelado enquanto qualquer card de lead estiver aberto.
- Ao fechar o card, fazer o número subir progressivamente do valor anterior até o total atual.
- Pausar a contagem em cada múltiplo de 10 para mostrar a celebração da dezena; se várias dezenas foram alcançadas, reproduzir cada celebração uma vez, em sequência.
- Em múltiplos de 100, usar a celebração especial da centena no lugar da celebração comum.
- Integrar o contador animado acima da barra de status e adicionar as animações visuais necessárias.

## Comportamento esperado
Exemplo: o contador estava em 8 e, com o card aberto, chegou a 21. Ao fechar, ele sobe até 10, celebra, continua até 20, celebra novamente e termina em 21.

## Detalhes técnicos
- O estado aberto/fechado do card será passado ao contador para controlar quando ele pode atualizar.
- A sequência será controlada pelo próprio contador, garantindo que uma animação termine antes da próxima começar.
- As animações respeitarão a preferência do aparelho por movimento reduzido.
