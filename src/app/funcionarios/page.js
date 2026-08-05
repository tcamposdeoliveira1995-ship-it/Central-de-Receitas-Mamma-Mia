"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatBRL, formatNumber } from "@/lib/calc";

export default function FuncionariosPage() {
  const { funcionarios, adicionarFuncionario, atualizarFuncionario, excluirFuncionario } = useStore();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null); // funcionário sendo editado, ou null pra "novo"

  function abrirNovo() {
    setEditando(null);
    setMostrarForm(true);
  }

  function abrirEdicao(funcionario) {
    setEditando(funcionario);
    setMostrarForm(true);
  }

  async function salvar(dados) {
    if (editando) {
      await atualizarFuncionario(editando.id, dados);
    } else {
      await adicionarFuncionario(dados);
    }
    setMostrarForm(false);
    setEditando(null);
  }

  async function excluir(funcionario) {
    if (!confirm(`Excluir a função "${funcionario.funcao}"? Isso não altera receitas/produções que já usaram ela.`)) return;
    await excluirFuncionario(funcionario.id);
  }

  const ativos = funcionarios.filter((f) => (f.status || "ativo") === "ativo");
  const inativos = funcionarios.filter((f) => (f.status || "ativo") !== "ativo");

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo</p>
          <h1 className="font-display text-3xl mt-1">Funcionários</h1>
          <p className="text-sm text-muted mt-1 max-w-xl">
            Base pro cálculo de Hora Homem Trabalhada (HHT) e custo de mão de obra (MOD). Cada linha é uma
            função/cargo — o custo/hora calculado aqui é usado igual pra todos que exercem essa função nas
            Receitas e Produções.
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90 shrink-0"
        >
          <Plus size={16} /> Nova função
        </button>
      </header>

      {mostrarForm && (
        <FuncionarioForm
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
                <th className="px-4 py-3 font-medium">Função</th>
                <th className="px-4 py-3 font-medium text-right">Salário mensal</th>
                <th className="px-4 py-3 font-medium text-right">Carga sem.</th>
                <th className="px-4 py-3 font-medium text-right">Qtde. pessoas</th>
                <th className="px-4 py-3 font-medium text-right">Custo/hora</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ativos.map((f) => (
                <FuncionarioLinha key={f.id} funcionario={f} onEditar={() => abrirEdicao(f)} onExcluir={() => excluir(f)} />
              ))}
              {ativos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                    Nenhuma função cadastrada ainda.
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
                {inativos.map((f) => (
                  <FuncionarioLinha key={f.id} funcionario={f} onEditar={() => abrirEdicao(f)} onExcluir={() => excluir(f)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FuncionarioLinha({ funcionario, onEditar, onExcluir }) {
  return (
    <tr className="border-b border-line last:border-0 hover:bg-gold-soft/30">
      <td className="px-4 py-3">
        <span className="font-medium">{funcionario.funcao}</span>
        {(funcionario.status || "ativo") !== "ativo" && (
          <span className="ml-2 text-xs text-muted">(inativo)</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono-num">{formatBRL(funcionario.salario_mensal)}</td>
      <td className="px-4 py-3 text-right font-mono-num text-muted">{formatNumber(funcionario.carga_horaria_semanal, 1)}h</td>
      <td className="px-4 py-3 text-right font-mono-num text-muted">{funcionario.quantidade_funcionarios}</td>
      <td className="px-4 py-3 text-right font-mono-num font-semibold text-gold">{formatBRL(funcionario.custo_hora)}</td>
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

// Calcula o custo/hora em tempo real no formulário, só pra preview — o valor
// "oficial" que fica salvo é sempre recalculado no backend (Code.gs) ou no
// store (modo demonstração), pra nunca ficar dessincronizado.
const SEMANAS_POR_MES = 52 / 12;
function previewCustoHora(salarioMensal, cargaHorariaSemanal) {
  const salario = parseFloat(String(salarioMensal).replace(",", ".")) || 0;
  const carga = parseFloat(String(cargaHorariaSemanal).replace(",", ".")) || 0;
  if (!carga) return 0;
  return salario / (carga * SEMANAS_POR_MES);
}

function FuncionarioForm({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    funcao: inicial?.funcao || "",
    salario_mensal: inicial?.salario_mensal ?? "",
    carga_horaria_semanal: inicial?.carga_horaria_semanal ?? "",
    quantidade_funcionarios: inicial?.quantidade_funcionarios ?? 1,
    status: inicial?.status || "ativo",
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const custoHoraPreview = previewCustoHora(form.salario_mensal, form.carga_horaria_semanal);

  function salvar() {
    if (!form.funcao.trim()) return;
    onSalvar({
      funcao: form.funcao.trim(),
      salario_mensal: parseFloat(String(form.salario_mensal).replace(",", ".")) || 0,
      carga_horaria_semanal: parseFloat(String(form.carga_horaria_semanal).replace(",", ".")) || 0,
      quantidade_funcionarios: parseInt(form.quantidade_funcionarios, 10) || 1,
      status: form.status,
    });
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg">{inicial ? "Editar função" : "Nova função"}</h3>
        <button onClick={onCancelar} className="p-1 text-muted hover:text-foreground" aria-label="Fechar">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Campo label="Função / cargo" className="col-span-2 md:col-span-2">
          <input
            value={form.funcao}
            onChange={(e) => set("funcao", e.target.value)}
            placeholder="Ex: Assistente de produção"
            className="input"
          />
        </Campo>
        <Campo label="Salário mensal (R$)">
          <input value={form.salario_mensal} onChange={(e) => set("salario_mensal", e.target.value)} className="input" />
        </Campo>
        <Campo label="Carga horária semanal (h)">
          <input value={form.carga_horaria_semanal} onChange={(e) => set("carga_horaria_semanal", e.target.value)} className="input" />
        </Campo>
        <Campo label="Qtde. de funcionários">
          <input
            type="number"
            min="1"
            value={form.quantidade_funcionarios}
            onChange={(e) => set("quantidade_funcionarios", e.target.value)}
            className="input"
          />
        </Campo>
        <Campo label="Status">
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input">
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </Campo>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className="text-muted">Custo/hora calculado:</span>
        <span className="font-mono-num font-semibold text-gold">{formatBRL(custoHoraPreview)}</span>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={salvar} className="px-4 py-2 bg-sage text-white text-sm rounded-md hover:opacity-90">
          Salvar
        </button>
        <button onClick={onCancelar} className="px-4 py-2 border border-line text-sm rounded-md hover:bg-background">
          Cancelar
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid var(--line);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Campo({ label, children, className = "" }) {
  return (
    <label className={`text-xs text-muted ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
