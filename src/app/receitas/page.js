"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Search, X, ChevronRight, Upload, FileText, Check, Loader2, Layers } from "lucide-react";
import { useStore } from "@/lib/store";
import { calcularCMV, custoPorKgReceita, converterQuantidade, formatBRL, formatNumber } from "@/lib/calc";
import { extrairTextoPDF } from "@/lib/pdfText";
import { parseTextoReceita, encontrarMateriaPrimaPorNome } from "@/lib/parseReceita";

export default function ReceitasPage() {
  const { receitas, adicionarReceita } = useStore();
  const [selecionadaId, setSelecionadaId] = useState(receitas[0]?.id ?? null);
  const [criando, setCriando] = useState(false);
  const [nomeNova, setNomeNova] = useState("");
  const [empresaNova, setEmpresaNova] = useState("YUKA Alimentos");

  const selecionada = receitas.find((r) => r.id === selecionadaId);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-surface border border-line rounded-lg overflow-hidden">
          <ul>
            {receitas.map((r) => (
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
            {receitas.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Nenhuma receita cadastrada.</li>}
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
  } = useStore();
  const [itens, setItens] = useState(receita.itens || []);
  const [busca, setBusca] = useState("");
  const [lendoPdf, setLendoPdf] = useState(false);
  const [erroPdf, setErroPdf] = useState("");
  const [pdfPendente, setPdfPendente] = useState(null); // { arquivo, itensDetectados }
  const [salvandoPdf, setSalvandoPdf] = useState(false);
  const enviandoRef = useRef(false); // trava síncrona contra duplo clique (o state salvandoPdf é assíncrono e não pega cliques rápidos)

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
    setItens(receita.itens || []);
    setPdfPendente(null);
    setErroPdf("");
  }, [receita.id]);

  function adicionarIngrediente(mp) {
    if (itens.some((i) => i.materia_prima_id === mp.id)) {
      setBusca("");
      return;
    }
    const novosItens = [
      ...itens,
      { materia_prima_id: mp.id, nome: mp.nome, quantidade: 1, unidade: mp.unidade, tipo: "materia_prima" },
    ];
    setItens(novosItens);
    atualizarItensReceita(receita.id, novosItens);
    setBusca("");
  }

  function adicionarSubReceita(subReceita) {
    if (itens.some((i) => i.materia_prima_id === subReceita.id)) {
      setBusca("");
      return;
    }
    if (!subReceita.rendimento?.peso_final) {
      alert(
        `"${subReceita.nome}" ainda não tem o peso final salvo no módulo Rendimento — o CMV dela vai ficar zerado até isso ser preenchido lá.`
      );
    }
    const novosItens = [
      ...itens,
      { materia_prima_id: subReceita.id, nome: subReceita.nome, quantidade: 1, unidade: "kg", tipo: "receita" },
    ];
    setItens(novosItens);
    atualizarItensReceita(receita.id, novosItens);
    setBusca("");
  }

  function alterarQuantidade(materiaPrimaId, quantidade) {
    const novosItens = itens.map((i) => (i.materia_prima_id === materiaPrimaId ? { ...i, quantidade } : i));
    setItens(novosItens);
    atualizarItensReceita(receita.id, novosItens);
  }

  function removerIngrediente(materiaPrimaId) {
    const novosItens = itens.filter((i) => i.materia_prima_id !== materiaPrimaId);
    setItens(novosItens);
    atualizarItensReceita(receita.id, novosItens);
  }

  function limparTodosIngredientes() {
    if (!confirm("Remover todos os ingredientes desta receita? Essa ação não pode ser desfeita.")) return;
    setItens([]);
    atualizarItensReceita(receita.id, []);
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
          materia_prima_id: mpId,
          nome: item.nome,
          quantidade: item.quantidade,
          unidade: item.unidade,
          tipo: "materia_prima",
        });
      }

      // 2) mescla com os ingredientes que já existiam na receita
      const mesclados = [...itens];
      for (const novo of itensParaAdicionar) {
        const idx = mesclados.findIndex((i) => i.materia_prima_id === novo.materia_prima_id);
        if (idx >= 0) mesclados[idx] = novo;
        else mesclados.push(novo);
      }
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
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-mono-num text-muted">{receita.codigo}</p>
          <h2 className="font-display text-2xl mt-0.5">{receita.nome}</h2>
          <p className="text-sm text-muted mt-0.5">{receita.empresa}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-sage-soft text-sage font-medium capitalize">
          {(receita.status || "ativa").replace("_", " ")}
        </span>
      </div>

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

      <table className="w-full text-sm mt-4">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
            <th className="py-2 font-medium">Ingrediente</th>
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
            const valorUnitario = ehSubReceita
              ? custoPorKgReceita(subReceita, receitasById, materiasPrimasById)
              : mp?.preco_atual || 0;
            const unidadePreco = ehSubReceita ? "kg" : mp?.unidade || item.unidade;
            const quantidadeParaCusto = ehSubReceita
              ? item.quantidade
              : converterQuantidade(item.quantidade, item.unidade, mp?.unidade);
            const valorTotal = quantidadeParaCusto * valorUnitario;
            return (
              <tr key={item.materia_prima_id} className="border-b border-line last:border-0">
                <td className="py-2">
                  <span className="flex items-center gap-1.5">
                    {ehSubReceita && <Layers size={12} className="text-sage shrink-0" />}
                    {item.nome || mp?.nome}
                  </span>
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.quantidade}
                    onChange={(e) => alterarQuantidade(item.materia_prima_id, parseFloat(e.target.value) || 0)}
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
                  <button onClick={() => removerIngrediente(item.materia_prima_id)} className="text-muted hover:text-brick">
                    <X size={14} />
                  </button>

                </td>
              </tr>
            );
          })}
          {itens.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-muted text-sm">
                Nenhum ingrediente ainda — pesquise acima, ou envie o PDF da ficha técnica.
              </td>
            </tr>
          )}
        </tbody>
      </table>

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
