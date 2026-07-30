"use client";

import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { formatBRL, formatNumber } from "@/lib/calc";
import { LABEL_TIPO_RECEITA } from "@/lib/tiposReceita";

const CORES = {
  gold: "#b8863b",
  sage: "#5f6f52",
  texto: "#2b2620",
  muted: "#7a7268",
  linha: "#e4dccf",
  fundoSuave: "#f7f1e7",
};

const styles = StyleSheet.create({
  page: {
    padding: 54,
    fontSize: 11.5,
    color: CORES.texto,
    fontFamily: "Helvetica",
  },
  marcaDagua: {
    position: "absolute",
    top: "28%",
    left: "22%",
    width: 340,
    opacity: 0.06,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: CORES.linha,
  },
  logoPequeno: { width: 64, height: 64 },
  codigo: { fontSize: 9.5, color: CORES.muted, fontFamily: "Helvetica" },
  titulo: { fontSize: 26, fontFamily: "Helvetica-Bold", marginTop: 4 },
  empresa: { fontSize: 12, color: CORES.muted, marginTop: 3 },
  badge: {
    fontSize: 9,
    color: CORES.sage,
    backgroundColor: "#e7ecdf",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: "flex-end",
  },
  secaoTitulo: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: CORES.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 28,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: CORES.linha,
    paddingBottom: 5,
  },
  tabelaHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: CORES.texto,
    paddingBottom: 7,
    marginBottom: 4,
  },
  tabelaHeaderCel: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: CORES.muted },
  tabelaLinha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: CORES.linha,
    paddingVertical: 8,
  },
  celNome: { width: "26%", fontSize: 11 },
  celApres: { width: "14%", fontSize: 11 },
  celObs: { width: "14%", fontSize: 11 },
  celQtde: { width: "12%", textAlign: "right", fontSize: 11 },
  celUnid: { width: "8%", fontSize: 11 },
  celValorUnit: { width: "13%", textAlign: "right", fontSize: 11 },
  celValor: { width: "13%", textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 11 },
  totaisRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 34,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: CORES.linha,
  },
  totalBloco: { alignItems: "flex-end" },
  totalLabel: { fontSize: 9, color: CORES.muted, textTransform: "uppercase" },
  totalValor: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 3 },
  cmvDestaque: {
    marginTop: 16,
    padding: 16,
    backgroundColor: CORES.fundoSuave,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cmvLabel: { fontSize: 11, color: CORES.muted },
  cmvValor: { fontSize: 22, fontFamily: "Helvetica-Bold", color: CORES.sage },
  preparoTexto: { fontSize: 11.5, lineHeight: 1.9, color: CORES.texto },
  rodape: {
    position: "absolute",
    bottom: 30,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: CORES.muted,
    borderTopWidth: 0.5,
    borderTopColor: CORES.linha,
    paddingTop: 8,
  },
});

export function FichaReceitaPDF({ receita, itens, cmv, quantidadeProducao, nomeItem, apresentacaoLabel, valorUnitario, unidadePreco, valorTotal }) {
  const geradoEm = new Date().toLocaleDateString("pt-BR");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src="/logo-fundo.png" style={styles.marcaDagua} fixed />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.codigo}>{receita.codigo} · v{receita.versao_atual || 1}</Text>
            <Text style={styles.titulo}>{receita.nome}</Text>
            <Text style={styles.empresa}>{receita.empresa}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Image src="/logo-monograma.png" style={styles.logoPequeno} />
            {receita.papel ? <Text style={styles.badge}>{LABEL_TIPO_RECEITA[receita.papel] || receita.papel}</Text> : null}
          </View>
        </View>

        <Text style={styles.secaoTitulo}>Ingredientes</Text>
        <View style={styles.tabelaHeader}>
          <Text style={[styles.tabelaHeaderCel, styles.celNome]}>Ingrediente</Text>
          <Text style={[styles.tabelaHeaderCel, styles.celApres]}>Apresentação</Text>
          <Text style={[styles.tabelaHeaderCel, styles.celObs]}>Obs.</Text>
          <Text style={[styles.tabelaHeaderCel, styles.celQtde]}>Qtde</Text>
          <Text style={[styles.tabelaHeaderCel, styles.celUnid]}>Unid.</Text>
          <Text style={[styles.tabelaHeaderCel, styles.celValorUnit]}>Vlr. unit.</Text>
          <Text style={[styles.tabelaHeaderCel, styles.celValor]}>Valor</Text>
        </View>
        {itens.map((linha, i) => (
          <View style={styles.tabelaLinha} key={i}>
            <Text style={styles.celNome}>{linha.nome}</Text>
            <Text style={styles.celApres}>{linha.apresentacao || "—"}</Text>
            <Text style={styles.celObs}>{linha.observacao || "—"}</Text>
            <Text style={styles.celQtde}>{formatNumber(linha.quantidade, 3)}</Text>
            <Text style={styles.celUnid}>{linha.unidade}</Text>
            <Text style={styles.celValorUnit}>{formatBRL(linha.valorUnitario)}/{linha.unidadePreco}</Text>
            <Text style={styles.celValor}>{formatBRL(linha.valorTotal)}</Text>
          </View>
        ))}

        <View style={styles.totaisRow}>
          <View style={styles.totalBloco}>
            <Text style={styles.totalLabel}>Ingredientes</Text>
            <Text style={styles.totalValor}>{formatBRL(cmv.custoIngredientes)}</Text>
          </View>
          <View style={styles.totalBloco}>
            <Text style={styles.totalLabel}>Embalagem</Text>
            <Text style={styles.totalValor}>{formatBRL(cmv.custoEmbalagem)}</Text>
          </View>
          <View style={styles.totalBloco}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValor}>{formatBRL(cmv.custoTotal)}</Text>
          </View>
        </View>

        <View style={styles.cmvDestaque}>
          <Text style={styles.cmvLabel}>CMV unitário (produção prevista: {formatNumber(quantidadeProducao, 0)} un)</Text>
          <Text style={styles.cmvValor}>{formatBRL(cmv.cmvUnitario)}</Text>
        </View>

        {receita.modo_preparo ? (
          <>
            <Text style={styles.secaoTitulo}>Modo de preparo</Text>
            <Text style={styles.preparoTexto}>{receita.modo_preparo}</Text>
          </>
        ) : null}

        <View style={styles.rodape} fixed>
          <Text>Mamma Formula — Ficha de Produção</Text>
          <Text>Gerado em {geradoEm}</Text>
        </View>
      </Page>
    </Document>
  );
}
