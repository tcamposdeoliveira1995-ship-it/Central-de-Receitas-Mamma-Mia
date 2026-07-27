"use client";

import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { formatBRL, formatNumber } from "@/lib/calc";

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
    padding: 36,
    fontSize: 9.5,
    color: CORES.texto,
    fontFamily: "Helvetica",
  },
  marcaDagua: {
    position: "absolute",
    top: "30%",
    left: "27%",
    width: 260,
    opacity: 0.06,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  logoPequeno: { width: 46, height: 46 },
  codigo: { fontSize: 8, color: CORES.muted, fontFamily: "Helvetica" },
  titulo: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 },
  empresa: { fontSize: 9.5, color: CORES.muted, marginTop: 1 },
  badge: {
    fontSize: 7.5,
    color: CORES.sage,
    backgroundColor: "#e7ecdf",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  secaoTitulo: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: CORES.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: CORES.linha,
    paddingBottom: 3,
  },
  tabelaHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: CORES.texto,
    paddingBottom: 4,
    marginBottom: 2,
  },
  tabelaHeaderCel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: CORES.muted },
  tabelaLinha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: CORES.linha,
    paddingVertical: 4,
  },
  celNome: { width: "26%" },
  celApres: { width: "14%" },
  celObs: { width: "14%" },
  celQtde: { width: "12%", textAlign: "right" },
  celUnid: { width: "8%" },
  celValorUnit: { width: "13%", textAlign: "right" },
  celValor: { width: "13%", textAlign: "right", fontFamily: "Helvetica-Bold" },
  totaisRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: CORES.linha,
  },
  totalBloco: { alignItems: "flex-end" },
  totalLabel: { fontSize: 7.5, color: CORES.muted, textTransform: "uppercase" },
  totalValor: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  cmvDestaque: {
    marginTop: 10,
    padding: 10,
    backgroundColor: CORES.fundoSuave,
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cmvLabel: { fontSize: 9, color: CORES.muted },
  cmvValor: { fontSize: 16, fontFamily: "Helvetica-Bold", color: CORES.sage },
  preparoTexto: { fontSize: 9.5, lineHeight: 1.6, color: CORES.texto },
  rodape: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: CORES.muted,
    borderTopWidth: 0.5,
    borderTopColor: CORES.linha,
    paddingTop: 6,
  },
});

const LABEL_PAPEL = {
  massa: "Massa",
  recheio: "Recheio",
  produto_final: "Produto Final",
  outro: "Outro",
};

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
            {receita.papel ? <Text style={styles.badge}>{LABEL_PAPEL[receita.papel] || receita.papel}</Text> : null}
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
