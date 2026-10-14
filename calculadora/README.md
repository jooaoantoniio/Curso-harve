# Calculadora de Frete para Móveis

Calcule fretes, serviços adicionais e descontos de forma rápida e prática. Feita em HTML, CSS e JavaScript puros, sem dependências nem build.

As cores da identidade visual ficam centralizadas em variáveis no início de `css/estilos.css`.

## Como usar

Abra o arquivo `index.html` no navegador (duplo clique). O total é recalculado a cada valor digitado ou serviço marcado.

## Testes

Com o Node.js instalado:

```bash
node --test testes/*.test.js
```

## Arquivos

- `index.html`: estrutura da página.
- `css/estilos.css`: estilos e layout responsivo.
- `js/calculo.js`: preços padrão (`PRECOS_PADRAO`) e a fórmula do frete.
- `js/formatacao.js`: leitura de valores em BRL, formatação e texto do resumo.
- `js/app.js`: liga a interface ao cálculo.
- `testes/calculo.test.js`: testes da lógica.
