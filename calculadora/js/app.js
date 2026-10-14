// Interface da calculadora: lê os campos, chama calcularFrete e atualiza a tela.
(function () {
  const camposValor = document.querySelectorAll('[data-campo]');
  const camposConfig = document.querySelectorAll('[data-config]');
  const checkboxes = document.querySelectorAll('[data-servico]');
  const seletorComodos = document.getElementById('comodos');

  const listaLinhas = document.getElementById('resumo-linhas');
  const listaAvisos = document.getElementById('resumo-avisos');
  const elementoTotal = document.getElementById('total');
  const botaoCopiar = document.getElementById('botao-copiar');
  const botaoLimpar = document.getElementById('botao-limpar');

  let ultimoResultado = null;

  // Mostra ou esconde a mensagem de erro de um campo.
  function exibirErro(input, erro) {
    const campo = input.closest('.campo');
    const mensagemErro = campo.querySelector('.campo__erro');
    const dica = campo.querySelector('.campo__dica');

    campo.classList.toggle('campo--invalido', Boolean(erro));
    mensagemErro.textContent = erro || '';
    mensagemErro.hidden = !erro;
    if (dica) dica.hidden = Boolean(erro);

    if (erro) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  // Lê um grupo de inputs; valores inválidos contam como zero.
  function lerGrupo(inputs, atributo) {
    const valores = {};
    let temErro = false;

    inputs.forEach(function (input) {
      const leitura = lerValorBRL(input.value);
      exibirErro(input, leitura.erro);
      valores[input.dataset[atributo]] = leitura.valor === null ? 0 : leitura.valor;
      if (leitura.erro) temErro = true;
    });

    return { valores, temErro };
  }

  function lerServicos() {
    const servicos = {};
    checkboxes.forEach(function (checkbox) {
      servicos[checkbox.dataset.servico] = checkbox.checked;
      // Feedback visual do card selecionado.
      checkbox.closest('.servico').classList.toggle('servico--ativo', checkbox.checked);
    });
    return servicos;
  }

  function atualizarDetalhes(precos, valorDesconto) {
    document.getElementById('detalhe-desmontagem').textContent = '+ ' + formatarBRL(precos.desmontagem);
    document.getElementById('detalhe-embalagem').textContent = '+ ' + formatarBRL(precos.embalagem);
    document.getElementById('detalhe-montagem').textContent = '+ ' + formatarBRL(precos.montagem);
    document.getElementById('detalhe-fimDeSemana').textContent =
      '+ ' + formatarPercentual(precos.taxaFimDeSemana) + ' sobre o subtotal';
    document.getElementById('detalhe-descontoPacote').textContent =
      '− ' + formatarBRL(valorDesconto) + ' do total';
  }

  // Mostra o preço de cada faixa nas opções do seletor de cômodos.
  function atualizarOpcoesComodos(tabela) {
    Array.from(seletorComodos.options).forEach(function (opcao) {
      const quantidade = Number(opcao.value);
      if (quantidade === 0) return;
      const nome =
        quantidade >= tabela.length
          ? tabela.length + ' ou mais cômodos'
          : quantidade + (quantidade === 1 ? ' cômodo' : ' cômodos');
      opcao.textContent = nome + ' — ' + formatarBRL(precoComodos(quantidade, tabela));
    });
  }

  function renderizarResumo(resultado, avisos) {
    listaLinhas.replaceChildren();
    resultado.linhas.forEach(function (linha) {
      const item = document.createElement('li');
      item.className = 'resumo__linha resumo__linha--' + linha.tipo;

      const rotulo = document.createElement('span');
      rotulo.textContent = linha.rotulo;

      const valor = document.createElement('span');
      const prefixo = linha.tipo === 'desconto' && linha.valor > 0 ? '− ' : '';
      valor.textContent = prefixo + formatarBRL(linha.valor);

      item.append(rotulo, valor);
      listaLinhas.append(item);
    });

    listaAvisos.replaceChildren();
    avisos.forEach(function (aviso) {
      const item = document.createElement('li');
      item.textContent = aviso;
      listaAvisos.append(item);
    });
    listaAvisos.hidden = avisos.length === 0;

    elementoTotal.textContent = formatarBRL(resultado.total);
  }

  function atualizar() {
    const campos = lerGrupo(camposValor, 'campo');
    const config = lerGrupo(camposConfig, 'config');

    const precos = {
      desmontagem: config.valores.desmontagem,
      embalagem: config.valores.embalagem,
      montagem: config.valores.montagem,
      taxaFimDeSemana: config.valores.taxaFimDeSemana / 100, // digitado em %
      comodos: [
        config.valores.comodos1,
        config.valores.comodos2,
        config.valores.comodos3,
        config.valores.comodos4,
        config.valores.comodos5,
      ],
    };

    const entradas = {
      valorBase: campos.valores.valorBase,
      comodos: Number(seletorComodos.value),
      distancia: campos.valores.distancia,
      extras: campos.valores.extras,
      valorDescontoPacote: campos.valores.valorDescontoPacote,
      servicos: lerServicos(),
    };

    const resultado = calcularFrete(entradas, precos);

    const avisos = [];
    if (campos.temErro || config.temErro) {
      avisos.push('Há valores inválidos destacados. Eles são contados como zero até serem corrigidos.');
    }
    if (resultado.descontoExcedeuValor) {
      avisos.push('O desconto de pacote é maior que o valor do frete. O total foi ajustado para zero.');
    }

    atualizarDetalhes(precos, entradas.valorDescontoPacote);
    atualizarOpcoesComodos(precos.comodos);
    renderizarResumo(resultado, avisos);
    ultimoResultado = resultado;
  }

  // Escreve um número no formato de digitação brasileiro (ex.: 20,5).
  function paraTexto(numero) {
    return String(arredondar(numero)).replace('.', ',');
  }

  function preencherConfigPadrao() {
    document.getElementById('cfg-desmontagem').value = paraTexto(PRECOS_PADRAO.desmontagem);
    document.getElementById('cfg-embalagem').value = paraTexto(PRECOS_PADRAO.embalagem);
    document.getElementById('cfg-montagem').value = paraTexto(PRECOS_PADRAO.montagem);
    document.getElementById('cfg-taxaFimDeSemana').value = paraTexto(PRECOS_PADRAO.taxaFimDeSemana * 100);
    PRECOS_PADRAO.comodos.forEach(function (preco, indice) {
      document.getElementById('cfg-comodos' + (indice + 1)).value = paraTexto(preco);
    });
  }

  // Limpa o orçamento; os preços configurados são mantidos.
  function limpar() {
    camposValor.forEach(function (input) {
      input.value = '';
    });
    checkboxes.forEach(function (checkbox) {
      checkbox.checked = false;
    });
    seletorComodos.value = '0';
    atualizar();
  }

  function copiarResumo() {
    const texto = gerarTextoResumo(ultimoResultado);

    function confirmar() {
      botaoCopiar.textContent = 'Resumo copiado!';
      setTimeout(function () {
        botaoCopiar.textContent = 'Copiar resumo';
      }, 2000);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(confirmar, function () {
        window.prompt('Copie o resumo abaixo:', texto);
      });
    } else {
      window.prompt('Copie o resumo abaixo:', texto);
    }
  }

  // "input" dispara a cada tecla; "change" a cada clique em checkbox.
  camposValor.forEach(function (input) {
    input.addEventListener('input', atualizar);
  });
  camposConfig.forEach(function (input) {
    input.addEventListener('input', atualizar);
  });
  checkboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', atualizar);
  });
  seletorComodos.addEventListener('change', atualizar);
  botaoCopiar.addEventListener('click', copiarResumo);
  botaoLimpar.addEventListener('click', limpar);

  preencherConfigPadrao();
  atualizar();
})();
