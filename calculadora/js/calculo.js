// Lógica do frete, sem dependência da interface.

// Preços padrão dos serviços. Podem ser alterados aqui ou pela área
// "Configurar preços dos serviços" da própria página.
const PRECOS_PADRAO = {
  desmontagem: 20,
  embalagem: 30,
  montagem: 60,
  taxaFimDeSemana: 0.15, // fração decimal: 0.15 = 15%
  taxaCidadeVizinha: 0.4, // fração decimal sobre o valor-base: 0.4 = 40%
  precoPorKm: 5, // valor cobrado a cada 1 km de distância
  // Preço por quantidade de cômodos: posição 0 = 1 cômodo, ..., última = "5 ou mais".
  comodos: [450, 700, 980, 1300, 1650],
};

// Preço da faixa de cômodos. Acima da última faixa, vale o preço da última.
function precoComodos(quantidade, tabela) {
  if (!quantidade || quantidade < 1) return 0;
  return tabela[Math.min(quantidade, tabela.length) - 1];
}

function descreverComodos(quantidade, tabela) {
  if (quantidade >= tabela.length) return tabela.length + ' ou mais';
  return String(quantidade);
}

// Arredonda para centavos, evitando erros de ponto flutuante.
function arredondar(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function formatarPercentual(fracao) {
  return arredondar(fracao * 100).toLocaleString('pt-BR') + '%';
}

function formatarKm(km) {
  return arredondar(km).toLocaleString('pt-BR') + ' km';
}

/**
 * entradas: { valorBase, comodos, distanciaKm, valorDescontoPacote, servicos }
 *           comodos é a quantidade de cômodos (0 = nenhum)
 * servicos: { desmontagem, embalagem, montagem, cidadeVizinha, fimDeSemana, descontoPacote } (booleanos)
 * precos:   { desmontagem, embalagem, montagem, taxaFimDeSemana, taxaCidadeVizinha, precoPorKm, comodos }
 */
function calcularFrete(entradas, precos) {
  const servicos = entradas.servicos;
  const quantidadeComodos = entradas.comodos || 0;
  const distanciaKm = entradas.distanciaKm || 0;

  const comodos = precoComodos(quantidadeComodos, precos.comodos);
  const distancia = arredondar(distanciaKm * precos.precoPorKm);
  const desmontagem = servicos.desmontagem ? precos.desmontagem : 0;
  const embalagem = servicos.embalagem ? precos.embalagem : 0;
  const montagem = servicos.montagem ? precos.montagem : 0;
  // A taxa de cidade vizinha incide só sobre o valor-base.
  const cidadeVizinha = servicos.cidadeVizinha
    ? arredondar(entradas.valorBase * precos.taxaCidadeVizinha)
    : 0;

  const subtotal = arredondar(
    entradas.valorBase + comodos + distancia + desmontagem + embalagem + montagem + cidadeVizinha,
  );

  const taxaFimDeSemana = servicos.fimDeSemana ? arredondar(subtotal * precos.taxaFimDeSemana) : 0;

  // O desconto só é aplicado quando a opção está marcada.
  const desconto = servicos.descontoPacote ? arredondar(entradas.valorDescontoPacote) : 0;

  const bruto = arredondar(subtotal + taxaFimDeSemana - desconto);
  const total = Math.max(0, bruto);

  const linhas = [
    { id: 'base', rotulo: 'Valor-base', valor: entradas.valorBase, tipo: 'base' },
    {
      id: 'comodos',
      rotulo:
        quantidadeComodos > 0
          ? 'Cômodos (' + descreverComodos(quantidadeComodos, precos.comodos) + ')'
          : 'Cômodos',
      valor: comodos,
      tipo: 'acrescimo',
    },
    {
      id: 'distancia',
      rotulo: distanciaKm > 0 ? 'Distância (' + formatarKm(distanciaKm) + ')' : 'Distância',
      valor: distancia,
      tipo: 'acrescimo',
    },
    { id: 'desmontagem', rotulo: 'Desmontagem', valor: desmontagem, tipo: 'acrescimo' },
    { id: 'embalagem', rotulo: 'Embalagem', valor: embalagem, tipo: 'acrescimo' },
    { id: 'montagem', rotulo: 'Montagem', valor: montagem, tipo: 'acrescimo' },
    {
      id: 'cidadeVizinha',
      rotulo: 'Taxa extra – cidade vizinha (' + formatarPercentual(precos.taxaCidadeVizinha) + ')',
      valor: cidadeVizinha,
      tipo: 'acrescimo',
    },
    {
      id: 'fimDeSemana',
      rotulo: 'Taxa de fim de semana (' + formatarPercentual(precos.taxaFimDeSemana) + ')',
      valor: taxaFimDeSemana,
      tipo: 'acrescimo',
    },
    { id: 'desconto', rotulo: 'Desconto de pacote', valor: desconto, tipo: 'desconto' },
  ];

  return {
    linhas,
    subtotal,
    taxaFimDeSemana,
    desconto,
    total,
    descontoExcedeuValor: bruto < 0, // o total foi limitado a zero
  };
}

// Permite usar este arquivo nos testes com Node.
if (typeof module === 'object' && module.exports) {
  module.exports = {
    PRECOS_PADRAO,
    arredondar,
    formatarPercentual,
    formatarKm,
    precoComodos,
    descreverComodos,
    calcularFrete,
  };
}
