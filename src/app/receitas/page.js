"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X, ChevronRight, ChevronDown, ChevronUp, Upload, FileText, Check, Loader2, Layers, Download, Flame, Package, Trash2, ClipboardList, PiggyBank } from "lucide-react";
import { calcularAlertasRotulagem } from "@/lib/rotulagemFrontal";
import { pdf } from "@react-pdf/renderer";
import { useStore } from "@/lib/store";
import { calcularCMV, custoPorKgReceita, custoEfetivoIngrediente, converterQuantidade, formatBRL, formatNumber } from "@/lib/calc";
import { extrairTextoPDF } from "@/lib/pdfText";
import { parseTextoReceita, encontrarMateriaPrimaPorNome } from "@/lib/parseReceita";
import { FichaReceitaPDF } from "@/lib/pdfReceita";
import { TIPOS_RECEITA } from "@/lib/tiposReceita";

// Identificador único por linha de ingrediente — permite a mesma matéria-prima
// aparecer mais de uma vez na receita (ex: farinha no preparo + farinha pra
// polvilhar), cada ocorrência com sua própria quantidade/observação.
function gerarLinhaId() {
  return `linha-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Itens que vieram da planilha antes dessa mudança não têm linha_id — preenche
// na hora de carregar, só pra essa sessão (não precisa persistir: a identidade
// da linha só importa enquanto a tela está aberta).
function backfillLinhaId(itens) {
  return itens.map((item) => (item.linha_id ? item : { ...item, linha_id: gerarLinhaId() }));
}

export default function ReceitasPage() {
  const { receitas, adicionarReceita } = useStore();
  const [selecionadaId, setSelecionadaId] = useState(receitas[0]?.id ?? null);
  const [criando, setCriando] = useState(false);
  const [nomeNova, setNomeNova] = useState("");
  const [empresaNova, setEmpresaNova] = useState("YUKA Alimentos");
  const [tipoFiltro, setTipoFiltro] = useState(""); // "" = todos os tipos

  const selecionada = receitas.find((r) => r.id === selecionadaId);

  // Listagem principal sempre em ordem alfabética pelo nome da receita,
  // e filtrada pelo tipo escolhido nos cards (Massa/Recheio Frio/.../Outro).
  const receitasOrdenadas = useMemo(
    () =>
      [...receitas]
        .filter((r) => !tipoFiltro || r.papel === tipoFiltro)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })),
    [receitas, tipoFiltro]
  );

  async function criarReceita() {
    if (!nomeNova.trim()) return;
    const codigo = `REC${String(receitas.length + 1).padStart(4, "0")}`;
    const nova = await adicionarReceita({ codigo, nome: nomeNova, empresa: empresaNova, itens: [] });
    setSelecionadaId(nova.id);
    setNomeNova("");
    setCriando(false);
  }

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 2</p>
          <h1 className="font-display text-3xl mt-1">Receitas</h1>
        </div>
        <button
          onClick={() => setCriando((v) => !v)}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90"
        >
          <Plus size={16} /> Nova receita
        </button>
      </header>

      {criando && (
        <div className="bg-surface border border-line rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Nome da receita
            <input
              value={nomeNova}
              onChange={(e) => setNomeNova(e.target.value)}
              className="mt-1 block px-3 py-2 rounded-md border border-line text-sm w-64"
              placeholder="Ex: Coxinha de Frango"
            />
          </label>
          <label className="text-xs text-muted">
            Empresa
            <select
              value={empresaNova}
              onChange={(e) => setEmpresaNova(e.target.value)}
              className="mt-1 block px-3 py-2 rounded-md border border-line text-sm"
            >
              <option>YUKA Alimentos</option>
              <option>TC Distribuidora</option>
            </select>
          </label>
          <button onClick={criarReceita} className="px-4 py-2 bg-sage text-white text-sm rounded-md hover:opacity-90">
            Criar
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs uppercase tracking-wide text-muted mr-1">Tipo:</span>
        <button
          type="button"
          onClick={() => setTipoFiltro("")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            tipoFiltro === ""
              ? "border-sage bg-sage-soft text-sage"
              : "border-line text-muted hover:bg-gold-soft/30"
          }`}
        >
          Todos
        </button>
        {TIPOS_RECEITA.map((tipo) => {
          const selecionado = tipoFiltro === tipo.value;
          return (
            <button
              key={tipo.value}
              type="button"
              onClick={() => setTipoFiltro(selecionado ? "" : tipo.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                selecionado
                  ? "border-sage bg-sage-soft text-sage"
                  : "border-line text-muted hover:bg-gold-soft/30"
              }`}
            >
              <tipo.icone size={14} className={selecionado ? "text-sage" : "text-muted"} />
              {tipo.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-surface border border-line rounded-lg overflow-hidden">
          <ul>
            {receitasOrdenadas.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelecionadaId(r.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left border-b border-line last:border-0 hover:bg-gold-soft/30 ${
                    selecionadaId === r.id ? "bg-gold-soft/50" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">{r.nome}</p>
                    <p className="text-xs text-muted font-mono-num">{r.codigo} · v{r.versao_atual || 1}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted" />
                </button>
              </li>
            ))}
            {receitasOrdenadas.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted">
                {tipoFiltro ? "Nenhuma receita desse tipo ainda." : "Nenhuma receita cadastrada."}
              </li>
            )}
          </ul>
        </div>

        <div className="lg:col-span-2">
          {selecionada ? (
            <ReceitaDetalhe receita={selecionada} />
          ) : (
            <div className="bg-surface border border-line rounded-lg p-8 text-center text-sm text-muted">
              Selecione ou crie uma receita.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReceitaDetalhe({ receita }) {
  const {
    materiasPrimas,
    materiasPrimasById,
    receitas,
    receitasById,
    atualizarItensReceita,
    adicionarMateriaPrima,
    enviarFichaPdf,
    atualizarDetalhesReceita,
  } = useStore();
  const [itens, setItens] = useState(() => backfillLinhaId(receita.itens || []));
  const [busca, setBusca] = useState("");
  const [lendoPdf, setLendoPdf] = useState(false);
  const [erroPdf, setErroPdf] = useState("");
  const [pdfPendente, setPdfPendente] = useState(null); // { arquivo, itensDetectados }
  const [salvandoPdf, setSalvandoPdf] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [papel, setPapel] = useState(receita.papel || "");
  const [modoPreparo, setModoPreparo] = useState(receita.modo_preparo || "");
  const enviandoRef = useRef(false); // trava síncrona contra duplo clique (o state salvandoPdf é assíncrono e não pega cliques rápidos)
  const adicionandoRef = useRef(new Set()); // trava rápida (400ms) contra clique duplo acidental — não impede adicionar
  // o mesmo ingrediente de novo depois disso, já que agora é permitido (ex: farinha no preparo + farinha pra polvilhar).
  const itensRef = useRef(itens); // cópia sempre atualizada de `itens` — o state do React só reflete depois de um re-render,
  // e ler `itens` (o state) direto em cliques rápidos pega uma versão desatualizada, fazendo uma adição sobrescrever a
  // anterior em vez de somar. Toda leitura usada pra CALCULAR o próximo valor deve usar itensRef.current, não `itens`.

  // Resultados de busca combinam Matérias-Primas e outras Receitas (sub-receitas,
  // ex: uma massa ou um recheio usados como ingrediente de outra receita).
  const resultadosBusca = useMemo(() => {
    if (!busca.trim()) return { mps: [], subReceitas: [] };
    const termo = busca.toLowerCase();
    const mps = materiasPrimas.filter((mp) => mp.nome.toLowerCase().includes(termo)).slice(0, 6);
    const subReceitas = receitas
      .filter((r) => r.id !== receita.id && r.nome.toLowerCase().includes(termo))
      .slice(0, 6);
    return { mps, subReceitas };
  }, [busca, materiasPrimas, receitas, receita.id]);

  const temResultados = resultadosBusca.mps.length > 0 || resultadosBusca.subReceitas.length > 0;

  // Sincroniza quando troca de receita selecionada
  useMemo(() => {
    const comLinhaId = backfillLinhaId(receita.itens || []);
    itensRef.current = comLinhaId;
    setItens(comLinhaId);
    setPdfPendente(null);
    setErroPdf("");
    setPapel(receita.papel || "");
    setModoPreparo(receita.modo_preparo || "");
    adicionandoRef.current = new Set();
  }, [receita.id]);

  // Único ponto que grava mudanças nos ingredientes: atualiza a referência síncrona,
  // o state (pra re-renderizar) e a planilha, sempre nessa ordem.
  function commitItens(novosItens) {
    itensRef.current = novosItens;
    setItens(novosItens);
    atualizarItensReceita(receita.id, novosItens);
  }

  // Trava só o clique duplo acidental (mesmo dedo/mouse, poucos milissegundos de diferença) —
  // depois de 400ms libera de novo, porque adicionar o mesmo ingrediente uma segunda vez de
  // propósito (farinha no preparo + farinha pra polvilhar) é uma ação válida.
  function comTravaRapida(chave, acao) {
    if (adicionandoRef.current.has(chave)) return;
    adicionandoRef.current.add(chave);
    acao();
    setTimeout(() => adicionandoRef.current.delete(chave), 400);
  }

  function adicionarIngrediente(mp) {
    comTravaRapida(mp.id, () => {
      commitItens([
        ...itensRef.current,
        {
          linha_id: gerarLinhaId(),
          materia_prima_id: mp.id,
          nome: mp.nome,
          quantidade: 1,
          unidade: mp.unidade,
          tipo: "materia_prima",
        },
      ]);
    });
    setBusca("");
  }

  function adicionarSubReceita(subReceita) {
    comTravaRapida(subReceita.id, () => {
      if (!subReceita.rendimento?.peso_final) {
        alert(
          `"${subReceita.nome}" ainda não tem o peso final salvo no módulo Rendimento — o CMV dela vai ficar zerado até isso ser preenchido lá.`
        );
      }
      commitItens([
        ...itensRef.current,
        {
          linha_id: gerarLinhaId(),
          materia_prima_id: subReceita.id,
          nome: subReceita.nome,
          quantidade: 1,
          unidade: "kg",
          tipo: "receita",
        },
      ]);
    });
    setBusca("");
  }

  function alterarQuantidade(linhaId, quantidade) {
    commitItens(itensRef.current.map((i) => (i.linha_id === linhaId ? { ...i, quantidade } : i)));
  }

  function alterarApresentacaoItem(linhaId, apresentacaoId) {
    commitItens(
      itensRef.current.map((i) => (i.linha_id === linhaId ? { ...i, apresentacao_id: apresentacaoId } : i))
    );
  }

  function alternarCustoCozido(linhaId) {
    commitItens(
      itensRef.current.map((i) => (i.linha_id === linhaId ? { ...i, usa_custo_cozido: !i.usa_custo_cozido } : i))
    );
  }

  function removerIngrediente(linhaId) {
    commitItens(itensRef.current.filter((i) => i.linha_id !== linhaId));
  }

  function limparTodosIngredientes() {
    if (!confirm("Remover todos os ingredientes desta receita? Essa ação não pode ser desfeita.")) return;
    adicionandoRef.current = new Set();
    commitItens([]);
  }

  function alterarPapel(novoPapel) {
    setPapel(novoPapel);
    atualizarDetalhesReceita(receita.id, { papel: novoPapel, modo_preparo: modoPreparo });
  }

  function salvarModoPreparo() {
    if (modoPreparo === (receita.modo_preparo || "")) return; // nada mudou, não salva à toa
    atualizarDetalhesReceita(receita.id, { papel, modo_preparo: modoPreparo });
  }

  function alterarDetalheItemLocal(linhaId, campo, valor) {
    const atualizados = itensRef.current.map((i) => (i.linha_id === linhaId ? { ...i, [campo]: valor } : i));
    itensRef.current = atualizados;
    setItens(atualizados);
  }

  function salvarItensAtual() {
    atualizarItensReceita(receita.id, itensRef.current);
  }

  async function baixarPdf(mostrarCustos) {
    setGerandoPdf(true);
    try {
      const itensParaPdf = itens.map((item) => {
        const ehSubReceita = item.tipo === "receita";
        const subReceita = ehSubReceita ? receitasById[item.materia_prima_id] : null;
        const mp = !ehSubReceita ? materiasPrimasById[item.materia_prima_id] : null;
        const efetivo = !ehSubReceita ? custoEfetivoIngrediente(item, mp) : null;
        const valorUnitario = ehSubReceita
          ? custoPorKgReceita(subReceita, receitasById, materiasPrimasById)
          : efetivo.valorUnitario;
        const unidadePreco = ehSubReceita ? "kg" : efetivo.unidadePreco;
        const quantidadeParaCusto = ehSubReceita
          ? item.quantidade
          : converterQuantidade(item.quantidade, item.unidade, unidadePreco);
        return {
          nome: item.nome || mp?.nome,
          apresentacao: item.apresentacao,
          observacao: item.observacao,
          quantidade: item.quantidade,
          unidade: item.unidade,
          valorUnitario,
          unidadePreco,
          valorTotal: quantidadeParaCusto * valorUnitario,
        };
      });

      const blob = await pdf(
        <FichaReceitaPDF
          receita={{ ...receita, papel, modo_preparo: modoPreparo }}
          itens={itensParaPdf}
          cmv={cmv}
          quantidadeProducao={quantidadeProducao}
          mostrarCustos={mostrarCustos}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const sufixo = mostrarCustos ? "" : "-sem-custo";
      a.href = url;
      a.download = `${receita.codigo || "ficha"}-${receita.nome}${sufixo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Não consegui gerar o PDF. Tenta de novo em alguns segundos.");
    } finally {
      setGerandoPdf(false);
    }
  }

  async function handleArquivoPdf(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // permite selecionar o mesmo arquivo de novo depois
    if (!arquivo) return;

    setErroPdf("");
    setLendoPdf(true);
    try {
      const texto = await extrairTextoPDF(arquivo);
      const brutos = parseTextoReceita(texto);
      if (brutos.length === 0) {
        setErroPdf(
          "Não consegui identificar nenhum ingrediente nesse PDF. O arquivo foi salvo mesmo assim — adicione os ingredientes manualmente."
        );
      }
      const itensDetectados = brutos.map((item) => {
        const mp = encontrarMateriaPrimaPorNome(item.nome, materiasPrimas);
        return { ...item, materiaPrimaId: mp?.id || null, criarNova: !mp };
      });
      setPdfPendente({ arquivo, itensDetectados });
    } catch (err) {
      console.error(err);
      setErroPdf("Não consegui ler esse PDF. Confira se o arquivo não está corrompido ou tenta outro.");
    } finally {
      setLendoPdf(false);
    }
  }

  function atualizarLinhaPendente(index, campo, valor) {
    setPdfPendente((prev) => {
      const itensDetectados = prev.itensDetectados.map((item, i) =>
        i === index ? { ...item, [campo]: valor } : item
      );
      return { ...prev, itensDetectados };
    });
  }

  function removerLinhaPendente(index) {
    setPdfPendente((prev) => ({
      ...prev,
      itensDetectados: prev.itensDetectados.filter((_, i) => i !== index),
    }));
  }

  async function confirmarPdf() {
    if (!pdfPendente) return;
    if (enviandoRef.current) return; // já está processando, ignora clique repetido
    enviandoRef.current = true;
    setSalvandoPdf(true);
    try {
      // 1) garante que cada ingrediente tem uma matéria-prima vinculada
      //    (cria a que ainda não existe).
      const itensParaAdicionar = [];
      for (const item of pdfPendente.itensDetectados) {
        let mpId = item.materiaPrimaId;
        if (!mpId) {
          const nova = await adicionarMateriaPrima({ nome: item.nome, unidade: item.unidade, preco_atual: 0 });
          mpId = nova.id;
        }
        itensParaAdicionar.push({
          linha_id: gerarLinhaId(),
          materia_prima_id: mpId,
          nome: item.nome,
          quantidade: item.quantidade,
          unidade: item.unidade,
          tipo: "materia_prima",
        });
      }

      // 2) acrescenta aos ingredientes que já existiam na receita (cada item do PDF
      //    vira uma linha nova — se a mesma matéria-prima já estava na receita, agora
      //    ambas as linhas convivem, ex: farinha no preparo + farinha pra polvilhar).
      const mesclados = [...itensRef.current, ...itensParaAdicionar];
      itensRef.current = mesclados;
      setItens(mesclados);
      await atualizarItensReceita(receita.id, mesclados);

      // 3) sobe o PDF original pro Drive
      await enviarFichaPdf(receita.id, pdfPendente.arquivo);

      setPdfPendente(null);
    } catch (err) {
      console.error(err);
      setErroPdf("Deu erro ao salvar. Confira sua conexão com a planilha e tenta de novo.");
    } finally {
      setSalvandoPdf(false);
      enviandoRef.current = false;
    }
  }

  const quantidadeProducao = receita.rendimento?.quantidade_produzida || 1;
  const cmv = calcularCMV({
    itens,
    embalagemCusto: receita.embalagem_custo || 0,
    quantidadeProducao,
    materiasPrimasById,
    receitasById,
  });

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-mono-num text-muted">{receita.codigo}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <h2 className="font-display text-2xl">{receita.nome}</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-sage-soft text-sage font-medium capitalize">
              {(receita.status || "ativa").replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-muted mt-0.5">{receita.empresa}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => baixarPdf(true)}
            disabled={gerandoPdf}
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line hover:bg-gold-soft/30 disabled:opacity-60"
          >
            {gerandoPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Baixar PDF
          </button>
          <button
            onClick={() => baixarPdf(false)}
            disabled={gerandoPdf}
            title="Gera o PDF sem as colunas de valor unitário/total, sem o resumo de custos e sem o CMV — pra enviar ao cliente"
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line hover:bg-gold-soft/30 disabled:opacity-60"
          >
            {gerandoPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            PDF sem custo
          </button>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-muted mb-1.5">Tipo da receita</p>
        <div className="flex flex-wrap gap-2">
          {TIPOS_RECEITA.map((tipo) => {
            const selecionado = papel === tipo.value;
            return (
              <button
                key={tipo.value}
                type="button"
                onClick={() => alterarPapel(selecionado ? "" : tipo.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  selecionado
                    ? "border-sage bg-sage-soft text-sage"
                    : "border-line text-muted hover:bg-gold-soft/30"
                }`}
              >
                <tipo.icone size={14} className={selecionado ? "text-sage" : "text-muted"} />
                {tipo.label}
              </button>
            );
          })}
        </div>
      </div>

      <ProdutosSKU receitaId={receita.id} produtos={receita.produtos} cmvUnitario={cmv.cmvUnitario} />

      {/* Upload de ficha técnica em PDF */}
      <div className="mt-5 border border-dashed border-line rounded-lg p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-foreground/80">
            <Upload size={16} className="text-gold" />
            Enviar ficha técnica em PDF — o sistema tenta reconhecer os ingredientes sozinho.
          </div>
          <label className="text-sm bg-gold-soft text-foreground px-3 py-1.5 rounded-md cursor-pointer hover:opacity-90 flex items-center gap-1.5">
            {lendoPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {lendoPdf ? "Lendo PDF..." : "Escolher PDF"}
            <input type="file" accept="application/pdf" className="hidden" onChange={handleArquivoPdf} disabled={lendoPdf} />
          </label>
        </div>

        {erroPdf && <p className="text-xs text-brick mt-2">{erroPdf}</p>}

        {receita.pdfs?.length > 0 && (
          <ul className="mt-2 space-y-1">
            {receita.pdfs.map((pdf, i) => (
              <li key={i} className="text-xs text-muted flex items-center gap-1.5">
                <FileText size={12} />
                <a href={pdf.url} target="_blank" rel="noreferrer" className="underline hover:text-sage">
                  {pdf.nome_arquivo}
                </a>
                <span>· enviado em {pdf.data}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Conferência dos ingredientes detectados no PDF, antes de salvar */}
      {pdfPendente && (
        <div className="mt-4 border border-gold/40 bg-gold-soft/20 rounded-lg p-4">
          <p className="text-sm font-medium mb-1">Confira antes de salvar</p>
          <p className="text-xs text-muted mb-3">
            Extraído de <span className="font-medium">{pdfPendente.arquivo.name}</span> — corrija nome, quantidade ou
            unidade se precisar. Itens sem matéria-prima correspondente serão criados automaticamente.
          </p>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
                <th className="py-1.5 font-medium">Nome</th>
                <th className="py-1.5 font-medium">Qtde</th>
                <th className="py-1.5 font-medium">Unid.</th>
                <th className="py-1.5 font-medium">Vínculo</th>
                <th className="py-1.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {pdfPendente.itensDetectados.map((item, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  <td className="py-1.5 pr-2">
                    <input
                      value={item.nome}
                      onChange={(e) => atualizarLinhaPendente(i, "nome", e.target.value)}
                      className="w-full px-2 py-1 border border-line rounded-md"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.quantidade}
                      onChange={(e) => atualizarLinhaPendente(i, "quantidade", parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-line rounded-md font-mono-num"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      value={item.unidade}
                      onChange={(e) => atualizarLinhaPendente(i, "unidade", e.target.value)}
                      className="w-16 px-2 py-1 border border-line rounded-md"
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-xs">
                    {item.materiaPrimaId ? (
                      <span className="text-sage flex items-center gap-1">
                        <Check size={12} /> matéria-prima existente
                      </span>
                    ) : (
                      <span className="text-gold">será criada nova</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right">
                    <button onClick={() => removerLinhaPendente(i)} className="text-muted hover:text-brick">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {pdfPendente.itensDetectados.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted text-xs">
                    Nenhum ingrediente detectado — cancele e adicione manualmente, ou salve só o PDF como anexo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={confirmarPdf}
              disabled={salvandoPdf}
              className="text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5"
            >
              {salvandoPdf && <Loader2 size={14} className="animate-spin" />}
              Confirmar e salvar
            </button>
            <button
              onClick={() => setPdfPendente(null)}
              disabled={salvandoPdf}
              className="text-sm px-4 py-2 rounded-md border border-line hover:bg-gold-soft/30"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="relative mt-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar matéria-prima ou outra receita (ex: uma massa, um recheio)..."
          className="w-full pl-9 pr-3 py-2.5 rounded-md border border-line text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
        {temResultados && (
          <ul className="absolute z-10 mt-1 w-full bg-surface border border-line rounded-md shadow-lg overflow-hidden">
            {resultadosBusca.mps.map((mp) => (
              <li key={mp.id}>
                <button
                  onClick={() => adicionarIngrediente(mp)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gold-soft/40 flex justify-between"
                >
                  <span>{mp.nome}</span>
                  <span className="text-muted font-mono-num">{formatBRL(mp.preco_atual)}/{mp.unidade}</span>
                </button>
              </li>
            ))}
            {resultadosBusca.subReceitas.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => adicionarSubReceita(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-sage-soft/40 flex justify-between items-center"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} className="text-sage" />
                    {r.nome}
                  </span>
                  <span className="text-xs text-sage font-medium">receita · por kg</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {itens.length > 0 && (
        <div className="flex justify-end mt-2">
          <button onClick={limparTodosIngredientes} className="text-xs text-muted hover:text-brick underline">
            Limpar todos os ingredientes
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
      <table className="w-full text-sm mt-4">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
            <th className="py-2 font-medium">Ingrediente</th>
            <th className="py-2 font-medium">Apresent.</th>
            <th className="py-2 font-medium">Obs.</th>
            <th className="py-2 font-medium">Qtde</th>
            <th className="py-2 font-medium">Unid.</th>
            <th className="py-2 font-medium text-right">Valor unit.</th>
            <th className="py-2 font-medium text-right">Valor</th>
            <th className="py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => {
            const ehSubReceita = item.tipo === "receita";
            const subReceita = ehSubReceita ? receitasById[item.materia_prima_id] : null;
            const mp = !ehSubReceita ? materiasPrimasById[item.materia_prima_id] : null;
            const efetivo = !ehSubReceita ? custoEfetivoIngrediente(item, mp) : null;
            const valorUnitario = ehSubReceita
              ? custoPorKgReceita(subReceita, receitasById, materiasPrimasById)
              : efetivo.valorUnitario;
            const unidadePreco = ehSubReceita ? "kg" : efetivo.unidadePreco;
            const quantidadeParaCusto = ehSubReceita
              ? item.quantidade
              : converterQuantidade(item.quantidade, item.unidade, unidadePreco);
            const valorTotal = quantidadeParaCusto * valorUnitario;
            const apresentacoesMp = mp?.apresentacoes || [];
            const apresentacaoEscolhida = apresentacoesMp.find((a) => a.id === item.apresentacao_id);
            const rendimentosDaApresentacao = apresentacaoEscolhida
              ? (mp.rendimentos || []).filter((r) => r.apresentacao_id === apresentacaoEscolhida.id)
              : [];
            const temCozido = rendimentosDaApresentacao.some((r) => r.custo_real_kg_cozido > 0);
            return (
              <tr key={item.linha_id} className="border-b border-line last:border-0">
                <td className="py-2">
                  <span className="flex items-center gap-1.5">
                    {ehSubReceita && <Layers size={12} className="text-sage shrink-0" />}
                    {item.nome || mp?.nome}
                  </span>
                  {!ehSubReceita && apresentacoesMp.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <select
                        value={item.apresentacao_id || ""}
                        onChange={(e) => alterarApresentacaoItem(item.linha_id, e.target.value)}
                        className="text-xs px-1.5 py-0.5 border border-line rounded text-muted bg-surface"
                      >
                        <option value="">preço de compra bruto</option>
                        {apresentacoesMp.map((a) => (
                          <option key={a.id} value={a.id}>{a.nome}</option>
                        ))}
                      </select>
                      {temCozido && (
                        <button
                          type="button"
                          onClick={() => alternarCustoCozido(item.linha_id)}
                          title="Usar custo por kg cozido (peso já depois de assar/fritar)"
                          className={`text-xs px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                            item.usa_custo_cozido
                              ? "border-brick text-brick bg-brick-soft"
                              : "border-line text-muted"
                          }`}
                        >
                          <Flame size={11} /> cozido
                        </button>
                      )}
                    </div>
                  )}
                  {efetivo?.viaRendimento && (
                    <p className="text-xs text-sage mt-0.5">custo por rendimento ({efetivo.base})</p>
                  )}
                </td>
                <td className="py-2">
                  <input
                    value={item.apresentacao || ""}
                    onChange={(e) => alterarDetalheItemLocal(item.linha_id, "apresentacao", e.target.value)}
                    onBlur={salvarItensAtual}
                    placeholder="—"
                    className="w-20 px-2 py-1 border border-line rounded-md text-xs"
                  />
                </td>
                <td className="py-2">
                  <input
                    value={item.observacao || ""}
                    onChange={(e) => alterarDetalheItemLocal(item.linha_id, "observacao", e.target.value)}
                    onBlur={salvarItensAtual}
                    placeholder="—"
                    className="w-20 px-2 py-1 border border-line rounded-md text-xs"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.quantidade}
                    onChange={(e) => alterarQuantidade(item.linha_id, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-line rounded-md font-mono-num"
                  />
                </td>
                <td className="py-2 text-muted">{item.unidade}</td>
                <td className="py-2 text-right font-mono-num">
                  {formatBRL(valorUnitario)}
                  <span className="text-muted">/{unidadePreco}</span>
                </td>
                <td className="py-2 text-right font-mono-num font-medium">{formatBRL(valorTotal)}</td>
                <td className="py-2 text-right">
                  <button onClick={() => removerIngrediente(item.linha_id)} className="text-muted hover:text-brick">
                    <X size={14} />
                  </button>

                </td>
              </tr>
            );
          })}
          {itens.length === 0 && (
            <tr>
              <td colSpan={8} className="py-6 text-center text-muted text-sm">
                Nenhum ingrediente ainda — pesquise acima, ou envie o PDF da ficha técnica.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <EconomiaSoja itens={itens} materiasPrimasById={materiasPrimasById} receitasById={receitasById} embalagemCusto={receita.embalagem_custo || 0} />

      <div className="mt-5">
        <label className="text-xs uppercase tracking-wide text-muted block mb-1.5">Modo de preparo</label>
        <textarea
          value={modoPreparo}
          onChange={(e) => setModoPreparo(e.target.value)}
          onBlur={salvarModoPreparo}
          rows={4}
          placeholder="Descreva o passo a passo do preparo..."
          className="w-full px-3 py-2 rounded-md border border-line text-sm resize-y"
        />
      </div>

      <div className="mt-5 pt-4 border-t border-line grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Ingredientes</p>
          <p className="font-mono-num font-medium mt-0.5">{formatBRL(cmv.custoIngredientes)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Embalagem</p>
          <p className="font-mono-num font-medium mt-0.5">{formatBRL(cmv.custoEmbalagem)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Total</p>
          <p className="font-mono-num font-semibold mt-0.5 text-gold">{formatBRL(cmv.custoTotal)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">CMV unitário</span>
        <span className="font-display text-xl font-mono-num text-sage">{formatBRL(cmv.cmvUnitario)}</span>
        <span className="text-xs text-muted">(produção prevista: {formatNumber(quantidadeProducao, 0)} un)</span>
      </div>
    </div>
  );
}

// ── PRODUTOS / SKUs DA RECEITA ─────────────────────────────────────
// Uma receita pode gerar mais de um produto/código vendável (ex: o mesmo
// hambúrguer tem código pra versão crua e versão assada, com e sem cheddar).
// Cada produto carrega os dados de sistema (código, EAN, NCM, CEST,
// departamento/seção/categoria, peso, validade) e sua própria informação
// nutricional, já que cru e assado pesam e nutrem diferente.

const TIPOS_EMBALAGEM = ["PCT", "CX", "UN", "KG"];

function produtoVazio() {
  return {
    codigo: "",
    nome_produto: "",
    tipo_embalagem: "PCT",
    codigo_barras: "",
    ncm: "",
    cest: "",
    departamento: "",
    secao: "",
    categoria: "",
    peso_liquido: "",
    peso_bruto: "",
    validade_dias: "",
    status: "ativo",
  };
}

function CampoProduto({ label, className = "", children }) {
  return (
    <label className={`text-muted ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function InfoLinha({ label, valor }) {
  return (
    <div>
      <p className="text-muted uppercase tracking-wide text-[10px]">{label}</p>
      <p className="mt-0.5">{valor || "—"}</p>
    </div>
  );
}

function CamposProduto({ valores, onChange }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
      <CampoProduto label="Código">
        <input value={valores.codigo} onChange={(e) => onChange({ ...valores, codigo: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
      </CampoProduto>
      <CampoProduto label="Nome do produto" className="col-span-2">
        <input value={valores.nome_produto} onChange={(e) => onChange({ ...valores, nome_produto: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
      </CampoProduto>
      <CampoProduto label="Tipo">
        <select value={valores.tipo_embalagem} onChange={(e) => onChange({ ...valores, tipo_embalagem: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs">
          {TIPOS_EMBALAGEM.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </CampoProduto>
      <CampoProduto label="Código de barras (EAN)">
        <input value={valores.codigo_barras} onChange={(e) => onChange({ ...valores, codigo_barras: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
      </CampoProduto>
      <CampoProduto label="NCM">
        <input value={valores.ncm} onChange={(e) => onChange({ ...valores, ncm: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
      </CampoProduto>
      <CampoProduto label="CEST">
        <input value={valores.cest} onChange={(e) => onChange({ ...valores, cest: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
      </CampoProduto>
      <CampoProduto label="Departamento">
        <input value={valores.departamento} onChange={(e) => onChange({ ...valores, departamento: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
      </CampoProduto>
      <CampoProduto label="Seção">
        <input value={valores.secao} onChange={(e) => onChange({ ...valores, secao: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
      </CampoProduto>
      <CampoProduto label="Categoria">
        <input value={valores.categoria} onChange={(e) => onChange({ ...valores, categoria: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
      </CampoProduto>
      <CampoProduto label="Peso líquido (kg)">
        <input type="number" step="0.001" value={valores.peso_liquido} onChange={(e) => onChange({ ...valores, peso_liquido: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
      </CampoProduto>
      <CampoProduto label="Peso bruto (kg)">
        <input type="number" step="0.001" value={valores.peso_bruto} onChange={(e) => onChange({ ...valores, peso_bruto: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
      </CampoProduto>
      <CampoProduto label="Validade (dias)">
        <input type="number" value={valores.validade_dias} onChange={(e) => onChange({ ...valores, validade_dias: e.target.value })} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
      </CampoProduto>
    </div>
  );
}

function ProdutosSKU({ receitaId, produtos, cmvUnitario }) {
  const { adicionarProduto } = useStore();
  const [adicionando, setAdicionando] = useState(false);
  const [novo, setNovo] = useState(produtoVazio());

  async function salvarNovoProduto() {
    if (!novo.codigo.trim() || !novo.nome_produto.trim()) return;
    await adicionarProduto(receitaId, {
      ...novo,
      peso_liquido: parseFloat(novo.peso_liquido) || 0,
      peso_bruto: parseFloat(novo.peso_bruto) || 0,
    });
    setNovo(produtoVazio());
    setAdicionando(false);
  }

  return (
    <div className="mt-5 border border-line rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Package size={16} className="text-gold" />
          Produtos / Códigos (SKUs)
        </div>
        <button
          type="button"
          onClick={() => setAdicionando((v) => !v)}
          className="flex items-center gap-1.5 text-xs bg-sage-soft text-sage px-3 py-1.5 rounded-md hover:opacity-90"
        >
          <Plus size={13} /> Novo produto
        </button>
      </div>

      {adicionando && (
        <div className="mt-3 bg-gold-soft/20 border border-gold/30 rounded-lg p-3">
          <CamposProduto valores={novo} onChange={setNovo} />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setAdicionando(false);
                setNovo(produtoVazio());
              }}
              className="px-3 py-1.5 text-xs text-muted hover:text-brick"
            >
              Cancelar
            </button>
            <button type="button" onClick={salvarNovoProduto} className="px-3 py-1.5 text-xs bg-sage text-white rounded-md hover:opacity-90">
              Salvar produto
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {(produtos || []).map((p) => (
          <ProdutoItem key={p.id} receitaId={receitaId} produto={p} cmvUnitario={cmvUnitario} />
        ))}
        {(!produtos || produtos.length === 0) && !adicionando && (
          <p className="text-xs text-muted text-center py-3">Nenhum produto/código cadastrado ainda pra essa receita.</p>
        )}
      </div>
    </div>
  );
}

function ProdutoItem({ receitaId, produto, cmvUnitario }) {
  const { atualizarProduto, excluirProduto } = useStore();
  const [expandido, setExpandido] = useState(false);
  const [editando, setEditando] = useState(false);
  const [campos, setCampos] = useState(() => ({ ...produtoVazio(), ...produto }));
  const qtdAlertasRotulagem = calcularAlertasRotulagem(produto.tabela_nutricional).length;

  async function salvarEdicao() {
    await atualizarProduto(receitaId, produto.id, {
      ...campos,
      peso_liquido: parseFloat(campos.peso_liquido) || 0,
      peso_bruto: parseFloat(campos.peso_bruto) || 0,
    });
    setEditando(false);
  }

  async function remover() {
    if (
      !confirm(
        `Excluir o produto "${produto.nome_produto || produto.codigo}"? Isso também apaga a informação nutricional dele.`
      )
    )
      return;
    await excluirProduto(receitaId, produto.id);
  }

  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gold-soft/20"
      >
        <span className="flex items-center gap-2">
          <Package size={14} className="text-sage" />
          <span className="font-mono-num text-xs text-muted">{produto.codigo}</span>
          <span className="font-medium">{produto.nome_produto}</span>
          {produto.tipo_embalagem && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-sage-soft text-sage">{produto.tipo_embalagem}</span>
          )}
          {qtdAlertasRotulagem > 0 && (
            <span
              title="Este produto ultrapassa limites legais de rotulagem frontal"
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-black text-white"
            >
              <Search size={10} /> {qtdAlertasRotulagem}
            </span>
          )}
        </span>
        {expandido ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
      </button>

      {expandido && (
        <div className="border-t border-line p-3 space-y-4">
          <div className="flex justify-end gap-3">
            {editando ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditando(false);
                    setCampos({ ...produtoVazio(), ...produto });
                  }}
                  className="text-xs text-muted hover:text-brick"
                >
                  Cancelar
                </button>
                <button type="button" onClick={salvarEdicao} className="text-xs bg-sage text-white px-3 py-1 rounded-md hover:opacity-90">
                  Salvar dados
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setEditando(true)} className="text-xs text-sage hover:underline">
                  Editar dados do produto
                </button>
                <button type="button" onClick={remover} className="text-xs text-brick hover:underline flex items-center gap-1">
                  <Trash2 size={12} /> Excluir
                </button>
              </>
            )}
          </div>

          {editando ? (
            <CamposProduto valores={campos} onChange={setCampos} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-xs">
              <InfoLinha label="Código de barras" valor={produto.codigo_barras} />
              <InfoLinha label="NCM" valor={produto.ncm} />
              <InfoLinha label="CEST" valor={produto.cest} />
              <InfoLinha label="Departamento" valor={produto.departamento} />
              <InfoLinha label="Seção" valor={produto.secao} />
              <InfoLinha label="Categoria" valor={produto.categoria} />
              <InfoLinha label="Peso líquido" valor={produto.peso_liquido ? `${produto.peso_liquido} kg` : ""} />
              <InfoLinha label="Validade" valor={produto.validade_dias ? `${produto.validade_dias} dias` : ""} />
            </div>
          )}

          <NutricionalProduto receitaId={receitaId} produto={produto} cmvUnitario={cmvUnitario} />
        </div>
      )}
    </div>
  );
}

function linhasNutricionaisPadrao() {
  return [
    "Valor energético (kcal)",
    "Carboidratos (g)",
    "Açúcares totais (g)",
    "Açúcares adicionados (g)",
    "Proteínas (g)",
    "Gorduras totais (g)",
    "Gorduras saturadas (g)",
    "Gorduras trans (g)",
    "Fibra alimentar (g)",
    "Sódio (mg)",
  ].map((nutriente) => ({ nutriente, qtd_comparativa: "", porcao: "", vd_percentual: "" }));
}

// Selo de rotulagem nutricional frontal (RDC 429/2020 / IN 75/2020): UM selo
// só por produto, com o ícone da lupa + "ALTO EM" (em preto, fundo branco) e,
// em seguida, um bloco preto com texto branco pra CADA nutriente que passou
// do limite — tudo dentro de uma borda preta única (não uma lupa por
// nutriente). É o layout "a"/"b"/"c" em linha horizontal do manual da Anvisa.
function LupaRotulagem({ alertas }) {
  if (!alertas || alertas.length === 0) return null;
  return (
    <div className="inline-flex items-stretch border-2 border-black rounded-md overflow-hidden bg-white">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <Search size={15} className="text-black" strokeWidth={2.5} />
        <span className="text-[9px] font-bold uppercase text-black leading-none whitespace-nowrap">ALTO EM</span>
      </div>
      {alertas.map((a) => (
        <div
          key={a.tipo}
          title={`${a.valor}${a.unidade} por 100g (limite legal: ${a.limite}${a.unidade})`}
          className="flex flex-col items-center justify-center bg-black px-2 py-1.5 border-l-2 border-black"
        >
          {a.linhas.map((linha, i) => (
            <span key={i} className="text-white text-[9px] font-extrabold uppercase leading-tight whitespace-nowrap">
              {linha}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function NutricionalProduto({ receitaId, produto, cmvUnitario }) {
  const { salvarInfoNutricional } = useStore();
  const info = produto.info_nutricional;
  const [editando, setEditando] = useState(false);
  const [apelido, setApelido] = useState(info?.apelido || "");
  const [ingredientesTexto, setIngredientesTexto] = useState(info?.ingredientes_texto || "");
  const [alergicosTexto, setAlergicosTexto] = useState(info?.alergicos_texto || "");
  const [porcaoGramas, setPorcaoGramas] = useState(info?.porcao_gramas || "");
  const [medidaCaseira, setMedidaCaseira] = useState(info?.medida_caseira || "");
  const [tabela, setTabela] = useState(() =>
    produto.tabela_nutricional?.length ? produto.tabela_nutricional : linhasNutricionaisPadrao()
  );
  const alertasRotulagem = calcularAlertasRotulagem(produto.tabela_nutricional);

  // Custo do pacote = CMV unitário da receita × Qtde. PCT (quantas unidades
  // de produção entram nesse pacote). Não é salvo — recalcula toda vez que
  // abre, porque o CMV pode mudar conforme o preço dos ingredientes muda.
  const qtdePctSalva = parseFloat(info?.medida_caseira) || 0;
  const custoPacote = cmvUnitario && qtdePctSalva ? cmvUnitario * qtdePctSalva : null;
  const qtdePctEditando = parseFloat(medidaCaseira) || 0;
  const custoPacoteEditando = cmvUnitario && qtdePctEditando ? cmvUnitario * qtdePctEditando : null;

  function alterarLinha(idx, campo, valor) {
    setTabela((prev) => prev.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)));
  }

  function adicionarLinha() {
    setTabela((prev) => [...prev, { nutriente: "", qtd_comparativa: "", porcao: "", vd_percentual: "" }]);
  }

  function removerLinha(idx) {
    setTabela((prev) => prev.filter((_, i) => i !== idx));
  }

  async function salvar() {
    await salvarInfoNutricional(receitaId, produto.id, {
      apelido,
      ingredientes_texto: ingredientesTexto,
      alergicos_texto: alergicosTexto,
      porcao_gramas: parseFloat(porcaoGramas) || 0,
      medida_caseira: medidaCaseira,
      tabela: tabela
        .filter((l) => l.nutriente.trim())
        .map((l) => ({
          nutriente: l.nutriente,
          qtd_comparativa: parseFloat(l.qtd_comparativa) || 0,
          porcao: parseFloat(l.porcao) || 0,
          vd_percentual: l.vd_percentual,
        })),
    });
    setEditando(false);
  }

  if (!editando) {
    return (
      <div className="border-t border-line pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <ClipboardList size={13} className="text-gold" /> Informação nutricional
          </p>
          <button type="button" onClick={() => setEditando(true)} className="text-xs text-sage hover:underline">
            {info ? "Editar" : "Cadastrar"}
          </button>
        </div>

        {alertasRotulagem.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] uppercase tracking-wide text-muted mb-1.5">Rotulagem frontal obrigatória</p>
            <LupaRotulagem alertas={alertasRotulagem} />
            <p className="text-[10px] text-muted mt-2">
              Calculado por 100g conforme RDC 429/2020 — confira a arte final do selo antes de imprimir a embalagem.
            </p>
          </div>
        )}
        {info ? (
          <div className="mt-2 text-xs space-y-2">
            <p>
              <span className="text-muted">Apelido: </span>
              {info.apelido || "—"}
            </p>
            {qtdePctSalva > 0 && (
              <div className="flex items-center gap-2 bg-gold-soft/20 border border-gold/30 rounded-md px-2.5 py-1.5">
                <span className="text-muted">Qtde. PCT: </span>
                <span className="font-mono-num font-medium">{formatNumber(qtdePctSalva, 0)}</span>
                {custoPacote !== null && (
                  <>
                    <span className="text-muted">· Custo do pacote (CMV unit. × Qtde. PCT):</span>
                    <span className="font-mono-num font-semibold text-sage">{formatBRL(custoPacote)}</span>
                  </>
                )}
              </div>
            )}
            {info.ingredientes_texto && <p className="text-muted leading-relaxed">{info.ingredientes_texto}</p>}
            {info.alergicos_texto && <p className="text-brick leading-relaxed">{info.alergicos_texto}</p>}
            {produto.tabela_nutricional?.length > 0 && (
              <table className="w-full mt-2">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-muted border-b border-line">
                    <th className="py-1 font-medium">Nutriente</th>
                    <th className="py-1 font-medium text-right">Qtd. comparativa</th>
                    <th className="py-1 font-medium text-right">Porção</th>
                    <th className="py-1 font-medium text-right">%VD</th>
                  </tr>
                </thead>
                <tbody>
                  {produto.tabela_nutricional.map((n, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      <td className="py-1">{n.nutriente}</td>
                      <td className="py-1 text-right font-mono-num">{n.qtd_comparativa}</td>
                      <td className="py-1 text-right font-mono-num">{n.porcao}</td>
                      <td className="py-1 text-right font-mono-num">{n.vd_percentual || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted mt-1.5">Ainda não cadastrada.</p>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-line pt-3 space-y-3">
      <p className="text-xs font-medium flex items-center gap-1.5">
        <ClipboardList size={13} className="text-gold" /> Informação nutricional
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <CampoProduto label="Apelido">
          <input value={apelido} onChange={(e) => setApelido(e.target.value)} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
        </CampoProduto>
        <CampoProduto label="Porção (g)">
          <input type="number" step="0.1" value={porcaoGramas} onChange={(e) => setPorcaoGramas(e.target.value)} className="w-full px-2 py-1.5 border border-line rounded-md text-xs" />
        </CampoProduto>
        <CampoProduto label="Qtde. PCT" className="col-span-2">
          <input
            type="number"
            step="1"
            value={medidaCaseira}
            onChange={(e) => setMedidaCaseira(e.target.value)}
            placeholder="Ex: 20"
            className="w-full px-2 py-1.5 border border-line rounded-md text-xs"
          />
          <p className="text-[10px] text-muted mt-1">
            Quantidade de unidades de produção (do CMV da receita) que entram nesse pacote.
            {custoPacoteEditando !== null && (
              <>
                {" "}Custo do pacote: <span className="font-mono-num font-semibold text-sage">{formatBRL(custoPacoteEditando)}</span>
              </>
            )}
          </p>
        </CampoProduto>
      </div>
      <label className="text-xs text-muted block">
        Ingredientes
        <textarea
          value={ingredientesTexto}
          onChange={(e) => setIngredientesTexto(e.target.value)}
          rows={3}
          placeholder="INGREDIENTES: ..."
          className="w-full mt-1 px-2 py-1.5 border border-line rounded-md text-xs resize-y"
        />
      </label>
      <label className="text-xs text-muted block">
        Alérgicos
        <textarea
          value={alergicosTexto}
          onChange={(e) => setAlergicosTexto(e.target.value)}
          rows={2}
          placeholder="ALÉRGICOS: ..."
          className="w-full mt-1 px-2 py-1.5 border border-line rounded-md text-xs resize-y"
        />
      </label>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-muted">Tabela nutricional</p>
          <button type="button" onClick={adicionarLinha} className="text-xs text-sage hover:underline flex items-center gap-1">
            <Plus size={12} /> linha
          </button>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase text-muted border-b border-line">
              <th className="py-1 font-medium">Nutriente</th>
              <th className="py-1 font-medium">Qtd. comp.</th>
              <th className="py-1 font-medium">Porção</th>
              <th className="py-1 font-medium">%VD</th>
              <th className="py-1 w-6"></th>
            </tr>
          </thead>
          <tbody>
            {tabela.map((l, i) => (
              <tr key={i} className="border-b border-line/60 last:border-0">
                <td className="py-1 pr-1">
                  <input value={l.nutriente} onChange={(e) => alterarLinha(i, "nutriente", e.target.value)} className="w-full px-2 py-1 border border-line rounded-md text-xs" />
                </td>
                <td className="py-1 pr-1">
                  <input value={l.qtd_comparativa} onChange={(e) => alterarLinha(i, "qtd_comparativa", e.target.value)} className="w-16 px-2 py-1 border border-line rounded-md text-xs" />
                </td>
                <td className="py-1 pr-1">
                  <input value={l.porcao} onChange={(e) => alterarLinha(i, "porcao", e.target.value)} className="w-16 px-2 py-1 border border-line rounded-md text-xs" />
                </td>
                <td className="py-1 pr-1">
                  <input value={l.vd_percentual} onChange={(e) => alterarLinha(i, "vd_percentual", e.target.value)} className="w-14 px-2 py-1 border border-line rounded-md text-xs" />
                </td>
                <td className="py-1">
                  <button type="button" onClick={() => removerLinha(i)} className="text-muted hover:text-brick">
                    <X size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditando(false)} className="text-xs text-muted hover:text-brick">
          Cancelar
        </button>
        <button type="button" onClick={salvar} className="text-xs bg-sage text-white px-3 py-1.5 rounded-md hover:opacity-90">
          Salvar informação nutricional
        </button>
      </div>
    </div>
  );
}

// ── ECONOMIA COM SOJA ────────────────────────────────────────────
// Detecta automaticamente, entre os ingredientes da receita, um item de
// "soja" e um item de proteína (carne/frango/calabresa) — e simula quanto
// custaria essa mesma receita se a soja não existisse e aquele peso virasse
// proteína a mais. Como não existe um fator de hidratação fixo cadastrado,
// o fator de substituição fica editável (começa em 1:1 — 1kg de soja
// removida = 1kg a mais de proteína) pra você calibrar com o que sabe na
// prática (soja hidratada rende mais peso que a seca).
function EconomiaSoja({ itens, materiasPrimasById, receitasById, embalagemCusto }) {
  const [fator, setFator] = useState("1");
  const [proteinaEscolhidaId, setProteinaEscolhidaId] = useState(null);

  const itemSoja = useMemo(
    () => itens.find((i) => i.tipo !== "receita" && (i.nome || "").toLowerCase().includes("soja")),
    [itens]
  );

  const candidatosProteina = useMemo(() => {
    if (!itemSoja) return [];
    const termos = ["carne", "frango", "calabres"];
    return itens.filter(
      (i) => i.linha_id !== itemSoja.linha_id && i.tipo !== "receita" && termos.some((t) => (i.nome || "").toLowerCase().includes(t))
    );
  }, [itens, itemSoja]);

  useEffect(() => {
    if (candidatosProteina.length > 0 && !candidatosProteina.some((p) => p.linha_id === proteinaEscolhidaId)) {
      setProteinaEscolhidaId(candidatosProteina[0].linha_id);
    }
  }, [candidatosProteina, proteinaEscolhidaId]);

  if (!itemSoja || candidatosProteina.length === 0) return null;

  const itemProteina = candidatosProteina.find((p) => p.linha_id === proteinaEscolhidaId) || candidatosProteina[0];
  const fatorNum = parseFloat(String(fator).replace(",", ".")) || 0;
  const qtdeSojaConvertida = converterQuantidade(itemSoja.quantidade, itemSoja.unidade, itemProteina.unidade) * fatorNum;

  const cmvComSoja = calcularCMV({ itens, embalagemCusto, quantidadeProducao: 1, materiasPrimasById, receitasById });

  const itensSemSoja = itens
    .filter((i) => i.linha_id !== itemSoja.linha_id)
    .map((i) =>
      i.linha_id === itemProteina.linha_id ? { ...i, quantidade: i.quantidade + qtdeSojaConvertida } : i
    );
  const cmvSemSoja = calcularCMV({ itens: itensSemSoja, embalagemCusto, quantidadeProducao: 1, materiasPrimasById, receitasById });

  const economia = cmvSemSoja.custoIngredientes - cmvComSoja.custoIngredientes;

  return (
    <div className="mt-5 border border-line rounded-lg p-4">
      <p className="text-sm font-medium flex items-center gap-1.5 mb-1">
        <PiggyBank size={15} className="text-gold" /> Economia com soja
      </p>
      <p className="text-xs text-muted mb-3">
        Simula quanto essa receita custaria se {itemSoja.nome} virasse mais {itemProteina.nome} em vez de soja.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-3">
        {candidatosProteina.length > 1 && (
          <label className="text-xs text-muted">
            Proteína substituída
            <select
              value={proteinaEscolhidaId || ""}
              onChange={(e) => setProteinaEscolhidaId(e.target.value)}
              className="mt-1 block px-2 py-1.5 border border-line rounded-md text-xs"
            >
              {candidatosProteina.map((p) => (
                <option key={p.linha_id} value={p.linha_id}>{p.nome}</option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs text-muted">
          Fator de substituição (kg de proteína por kg de soja removida)
          <input
            type="number"
            step="0.1"
            value={fator}
            onChange={(e) => setFator(e.target.value)}
            className="mt-1 block w-28 px-2 py-1.5 border border-line rounded-md text-xs font-mono-num"
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Sem soja (só {itemProteina.nome})</p>
          <p className="font-mono-num font-medium mt-0.5">{formatBRL(cmvSemSoja.custoIngredientes)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Com soja (atual)</p>
          <p className="font-mono-num font-medium mt-0.5">{formatBRL(cmvComSoja.custoIngredientes)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Economia com soja</p>
          <p className="font-mono-num font-semibold mt-0.5 text-sage">{formatBRL(economia)}</p>
        </div>
      </div>

      <p className="text-[10px] text-muted mt-3">
        Fator 1 assume peso a peso (sem contar o rendimento da hidratação). Se a soja que você usa rende mais peso
        depois de hidratada, aumenta o fator (ex: 1,5 ou 2) pra refletir isso na simulação.
      </p>
    </div>
  );
}
