"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";

export default function SetoresPage() {
  const { setores, adicionarSetor, atualizarSetor, excluirSetor } = useStore();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);

  function abrirNovo() {
    setEditando(null);
    setMostrarForm(true);
  }

  function abrirEdicao(setor) {
    setEditando(setor);
    setMostrarForm(true);
  }

  async function salvar(dados) {
    if (editando) {
      await atualizarSetor(editando.id, dados);
    } else {
      await adicionarSetor(dados);
    }
    setMostrarForm(false);
    setEditando(null);
  }

  async function excluir(setor) {
    if (!confirm(`Excluir o setor "${setor.nome}"? Isso não altera receitas/produções que já usaram ele.`)) return;
    await excluirSetor(setor.id);
  }

  const ativos = setores.filter((s) => (s.status || "ativo") === "ativo");
  const inativos = setores.filter((s) => (s.status || "ativo") !== "ativo");

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo</p>
          <h1 className="font-display text-3xl mt-1">Setores</h1>
          <p className="text-sm text-muted mt-1 max-w-xl">
            Etapas do processo produtivo (ex: Produção, Forno/Congelamento, Expedição). Cada linha de mão de obra
            (MOD) numa receita ou produção informa em qual setor aquele trabalho aconteceu.
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90 shrink-0"
        >
          <Plus size={16} /> Novo setor
        </button>
      </header>

      {mostrarForm && (
        <SetorForm
          inicial={editando}
          onSalvar={salvar}
          onCancelar={() => {
            setMostrarForm(false);
            setEditando(null);
          }}
        />
      )}

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
                <th className="px-4 py-3 font-medium">Setor</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ativos.map((s) => (
                <SetorLinha key={s.id} setor={s} onEditar={() => abrirEdicao(s)} onExcluir={() => excluir(s)} />
              ))}
              {ativos.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-muted text-sm">
                    Nenhum setor cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inativos.length > 0 && (
        <div className="bg-surface border border-line rounded-lg overflow-hidden mt-4 opacity-70">
          <p className="text-xs uppercase tracking-wide text-muted px-4 pt-3">Inativos</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {inativos.map((s) => (
                  <SetorLinha key={s.id} setor={s} onEditar={() => abrirEdicao(s)} onExcluir={() => excluir(s)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SetorLinha({ setor, onEditar, onExcluir }) {
  return (
    <tr className="border-b border-line last:border-0 hover:bg-gold-soft/30">
      <td className="px-4 py-3">
        <span className="font-medium">{setor.nome}</span>
        {(setor.status || "ativo") !== "ativo" && <span className="ml-2 text-xs text-muted">(inativo)</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button onClick={onEditar} className="p-1.5 text-muted hover:text-foreground" aria-label="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={onExcluir} className="p-1.5 text-muted hover:text-brick" aria-label="Excluir">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function SetorForm({ inicial, onSalvar, onCancelar }) {
  const [nome, setNome] = useState(inicial?.nome || "");
  const [status, setStatus] = useState(inicial?.status || "ativo");

  function salvar() {
    if (!nome.trim()) return;
    onSalvar({ nome: nome.trim(), status });
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg">{inicial ? "Editar setor" : "Novo setor"}</h3>
        <button onClick={onCancelar} className="p-1 text-muted hover:text-foreground" aria-label="Fechar">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-xs text-muted block sm:col-span-2">
          Nome do setor
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Produção, Forno/Congelamento, Expedição"
            className="mt-1 w-full px-3 py-2 rounded-md border border-line text-sm"
          />
        </label>
        <label className="text-xs text-muted block">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-line text-sm"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </label>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={salvar} className="px-4 py-2 bg-sage text-white text-sm rounded-md hover:opacity-90">
          Salvar
        </button>
        <button onClick={onCancelar} className="px-4 py-2 border border-line text-sm rounded-md hover:bg-background">
          Cancelar
        </button>
      </div>
    </div>
  );
}
